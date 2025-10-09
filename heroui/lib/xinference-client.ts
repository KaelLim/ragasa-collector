import { config } from 'dotenv'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

// 載入 .env.ocr 設定
config({ path: path.join(process.cwd(), '.env.ocr') })

const execAsync = promisify(exec)

interface OCRResult {
  success: boolean
  data?: any
  error?: string
  rawResponse?: string
}

interface XinferenceMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

class XinferenceOCRClient {
  private apiUrl: string
  private modelId: string
  private maxTokens: number
  private temperature: number
  private timeout: number
  private maxRetries: number
  private serviceMode: string

  constructor() {
    this.apiUrl = process.env.XINFERENCE_API_URL || 'http://localhost:9997/v1'
    this.modelId = process.env.XINFERENCE_MODEL_ID || 'qwen2.5-vl-instruct'
    this.maxTokens = parseInt(process.env.XINFERENCE_MAX_TOKENS || '2000')
    this.temperature = parseFloat(process.env.XINFERENCE_TEMPERATURE || '0.1')
    this.timeout = parseInt(process.env.XINFERENCE_REQUEST_TIMEOUT || '30000')
    this.maxRetries = parseInt(process.env.XINFERENCE_MAX_RETRIES || '3')
    this.serviceMode = process.env.OCR_SERVICE_MODE || 'xinference'
  }

  /**
   * 使用 Python SDK 執行 OCR (效能提升 10 倍)
   * 37+ tokens/s vs 3.54 tokens/s
   */
  private async callPythonSDK(
    base64ImageWithoutPrefix: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<OCRResult> {
    try {
      const pythonScript = path.join(process.cwd(), 'xinference-ocr.py')

      // 建立暫存檔案來傳遞 base64 數據
      const tmpFile = path.join('/tmp', `ocr-${Date.now()}.txt`)
      const fs = await import('fs')
      await fs.promises.writeFile(tmpFile, base64ImageWithoutPrefix)

      // 準備命令參數
      const escapedPrompt = prompt.replace(/"/g, '\\"')
      const escapedSystemPrompt = systemPrompt ? systemPrompt.replace(/"/g, '\\"') : ''

      const command = systemPrompt
        ? `python3 "${pythonScript}" "${tmpFile}" "${escapedPrompt}" "${escapedSystemPrompt}"`
        : `python3 "${pythonScript}" "${tmpFile}" "${escapedPrompt}"`

      console.log('🚀 Calling Python SDK (MLX native, 37+ tokens/s)...')

      const { stdout, stderr } = await execAsync(command, {
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      // 清理暫存檔案
      try {
        await fs.promises.unlink(tmpFile)
      } catch (e) {
        // 忽略清理錯誤
      }

      if (stderr) {
        console.warn('Python SDK stderr:', stderr)
      }

      // 解析 Python 輸出
      const result = JSON.parse(stdout)

      if (!result.success) {
        throw new Error(result.error || 'Python SDK failed')
      }

      // 解析 OCR 內容
      const parsedData = this.parseOCRResponse(result.content)

      return {
        success: true,
        data: parsedData,
        rawResponse: result.content
      }
    } catch (error: any) {
      console.error('❌ Python SDK failed:', error.message)
      throw error
    }
  }

  /**
   * 將圖片轉換為 base64 格式
   * 返回兩種格式：含前綴（HTTP API）和不含前綴（Python SDK）
   */
  private async imageToBase64(image: File | Blob): Promise<{ withPrefix: string; withoutPrefix: string }> {
    // 檢查是否在 Node.js 環境（伺服器端）
    if (typeof window === 'undefined') {
      // 伺服器端：使用 Buffer
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Only = buffer.toString('base64')
      const withPrefix = `data:${image.type || 'image/jpeg'};base64,${base64Only}`

      return {
        withPrefix,
        withoutPrefix: base64Only
      }
    } else {
      // 客戶端：使用 FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const withPrefix = reader.result as string
          // 移除 data:image/jpeg;base64, 前綴
          const withoutPrefix = withPrefix.split(',')[1]
          resolve({ withPrefix, withoutPrefix })
        }
        reader.onerror = reject
        reader.readAsDataURL(image)
      })
    }
  }

  /**
   * 呼叫 Xinference API
   */
  private async callXinferenceAPI(messages: XinferenceMessage[]): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      // 加入 API Key 支援（如果有設定的話）
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (process.env.XINFERENCE_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.XINFERENCE_API_KEY}`
      }

      // 嚴格遵循 OpenAI 兼容格式（適用於 MLX 框架）
      // 僅發送 model 和 messages，不加其他參數
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.modelId,
          messages: messages
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Xinference API error response:`, errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  /**
   * 解析 OCR 回應
   */
  private parseOCRResponse(content: string): any {
    try {
      // 嘗試直接解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // 如果不是 JSON，嘗試從文字中提取資訊
      console.warn('OCR response is not valid JSON, returning raw text')
      return { rawText: content }
    } catch (error) {
      console.error('Failed to parse OCR response:', error)
      return { rawText: content }
    }
  }

  /**
   * 執行 OCR 識別（帶重試機制）
   * 優先使用 Python SDK (37+ tokens/s)，失敗則降級到 HTTP API (3.54 tokens/s)
   */
  private async performOCRWithRetry(
    image: File | Blob,
    prompt: string,
    systemPrompt?: string
  ): Promise<OCRResult> {
    let lastError: Error | null = null
    const usePythonSDK = process.env.USE_PYTHON_SDK !== 'false' // 預設啟用

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`OCR attempt ${attempt}/${this.maxRetries}`)

        const { withPrefix, withoutPrefix } = await this.imageToBase64(image)

        // 優先嘗試使用 Python SDK (10 倍效能提升)
        if (usePythonSDK && typeof window === 'undefined') {
          try {
            console.log('🚀 Trying Python SDK (MLX native, 37+ tokens/s)...')
            const result = await this.callPythonSDK(withoutPrefix, prompt, systemPrompt)
            console.log('✅ Python SDK success!')
            return result
          } catch (pythonError: any) {
            console.warn('⚠️  Python SDK failed, falling back to HTTP API:', pythonError.message)
            // 繼續使用 HTTP API
          }
        }

        // 降級到 HTTP API
        console.log('📡 Using HTTP API (3.54 tokens/s)...')

        // 嚴格遵循 OpenAI 兼容格式（適用於 MLX 框架）
        // 將 system prompt 合併到 user prompt 中
        const systemContent = systemPrompt || process.env.XINFERENCE_OCR_SYSTEM_PROMPT ||
                    '你是一個專業的 OCR 文字識別助手。'
        const fullPrompt = `${systemContent}\n\n${prompt}`

        const messages: XinferenceMessage[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: fullPrompt },
              { type: 'image_url', image_url: { url: withPrefix } }
            ]
          }
        ]

        const response = await this.callXinferenceAPI(messages)

        if (response?.choices?.[0]?.message?.content) {
          const content = response.choices[0].message.content
          const parsedData = this.parseOCRResponse(content)

          console.log('✅ HTTP API success')
          return {
            success: true,
            data: parsedData,
            rawResponse: content
          }
        }

        throw new Error('Invalid API response structure')
      } catch (error: any) {
        console.error(`❌ OCR attempt ${attempt} failed:`, error.message)
        lastError = error

        if (attempt < this.maxRetries) {
          // 等待後重試（指數退避）
          const delay = 1000 * Math.pow(2, attempt - 1)
          console.log(`⏳ Retrying in ${delay/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'OCR failed after all retries'
    }
  }

  /**
   * 模擬 OCR（用於測試）
   */
  private async mockOCR(type: string): Promise<OCRResult> {
    await new Promise(resolve => setTimeout(resolve, parseInt(process.env.MOCK_OCR_DELAY || '1000')))

    const mockData: { [key: string]: any } = {
      'id-front': {
        name: '測試姓名',
        idNumber: 'A123456789',
        birthDate: '民國80年1月1日',
        gender: '男'
      },
      'id-back': {
        address: '台北市中正區重慶南路一段122號',
        issueDate: '民國110年1月1日',
        issuePlace: '台北市政府'
      },
      'bank': {
        bankName: '台灣銀行',
        bankCode: '004',
        branchName: '城中分行',
        accountNumber: '1234567890123',
        accountName: '測試姓名'
      }
    }

    return {
      success: true,
      data: mockData[type] || {},
      rawResponse: 'Mock response'
    }
  }

  /**
   * 識別身分證正面
   */
  async recognizeIdCardFront(image: File | Blob): Promise<OCRResult> {
    if (this.serviceMode === 'mock') {
      return this.mockOCR('id-front')
    }

    const prompt = process.env.XINFERENCE_ID_FRONT_PROMPT ||
      '請識別這張台灣身分證正面的資訊，包括：姓名、身分證字號、出生日期、性別。請以 JSON 格式輸出。'

    const systemPrompt = '請提取身份證上的姓名，身份證字號，並用json格式輸出'

    return this.performOCRWithRetry(image, prompt, systemPrompt)
  }

  /**
   * 識別身分證背面
   */
  async recognizeIdCardBack(image: File | Blob): Promise<OCRResult> {
    if (this.serviceMode === 'mock') {
      return this.mockOCR('id-back')
    }

    const prompt = process.env.XINFERENCE_ID_BACK_PROMPT ||
      '請識別這張台灣身分證背面的資訊，包括：戶籍地址、發證日期、發證地點。'

    return this.performOCRWithRetry(image, prompt)
  }

  /**
   * 識別戶口名簿表頭資訊
   */
  async recognizeHouseholdHeader(image: File | Blob): Promise<OCRResult> {
    if (this.serviceMode === 'mock') {
      return {
        success: true,
        data: {
          householdNumber: 'U1234567',
          householdHeadIdNumber: 'Y123456789',
          householdType: '共同生活戶',
          address: '台北市中正區重慶南路一段122號'
        },
        rawResponse: 'Mock household header response'
      }
    }

    const prompt = `請識別這張戶口名簿表頭區域的資料，提取以下資訊：

1. 戶號：通常以「U」開頭，後接7位數字（例如：U3679357）
2. 戶長統號：戶長的國民身分證統一編號，格式為1個英文字母+9位數字（例如：Y120074499）
3. 戶別：戶籍類型，例如「共同生活戶」
4. 戶籍地址：完整地址，包含縣市、鄉鎮、村里、鄰、街路等（例如：花蓮縣壽豐鄉光榮村011鄰中山路上段１１４號）

以 JSON 格式輸出：
{
  "householdNumber": "U開頭的戶號",
  "householdHeadIdNumber": "戶長統號（Y開頭）",
  "householdType": "戶別",
  "address": "完整戶籍地址"
}`
    const systemPrompt = '你是專業的台灣戶口名簿 OCR 助手。請仔細識別表頭區域的四個欄位：戶號（U開頭）、戶長統號（Y開頭）、戶別、戶籍地址，直接返回 JSON 格式結果，不要額外說明。'

    return this.performOCRWithRetry(image, prompt, systemPrompt)
  }

  /**
   * 識別銀行存摺
   */
  async recognizeBankBook(image: File | Blob): Promise<OCRResult> {
    if (this.serviceMode === 'mock') {
      return this.mockOCR('bank')
    }

    const prompt = process.env.XINFERENCE_BANK_PROMPT ||
      '請識別這張銀行存摺的資訊，包括：銀行名稱、銀行代碼、分行名稱、帳號、戶名。'

    const systemPrompt = '請辨識銀行、分行/分會/分社、戶名，及銀行帳號。銀行帳號是在一排由一組14位數組成的數字，並用json格式輸出'

    return this.performOCRWithRetry(image, prompt, systemPrompt)
  }

  /**
   * 識別戶口名簿切片（單一成員資料或全體成員）
   * @param image - 圖片檔案
   * @param segmentIndex - 切片索引 (0=全體成員, 1=戶長, 2-6=單一成員)
   */
  async recognizeHouseholdSegment(
    image: File | Blob,
    segmentIndex: number
  ): Promise<OCRResult> {
    if (this.serviceMode === 'mock') {
      // Mock 資料
      const mockMember = {
        name: segmentIndex === 1 ? '戶長姓名' : segmentIndex === 2 ? '成員姓名' : '',
        gender: segmentIndex === 1 ? '男' : segmentIndex === 2 ? '女' : '',
        birthDate: segmentIndex === 1 ? '1980-05-15' : segmentIndex === 2 ? '1982-08-20' : '',
        idNumber: segmentIndex === 1 ? 'A123456789' : segmentIndex === 2 ? 'B234567890' : '',
        relationship: segmentIndex === 1 ? '戶長' : segmentIndex === 2 ? '配偶' : ''
      }

      return {
        success: true,
        data: {
          segmentIndex,
          ...mockMember
        },
        rawResponse: 'Mock household segment response'
      }
    }

    // 根據 segmentIndex 使用不同的提示詞
    let prompt: string
    let systemPrompt: string

    if (segmentIndex === 0) {
      // 辨識全體成員
      prompt = `請識別這張戶口名簿的全體成員資料。以 JSON 格式輸出：
{
  "householdHead": {"name":"戶長姓名","gender":"性別","birthDate":"YYYY-MM-DD","idNumber":"身分證字號","relationship":"戶長"},
  "members": [
    {"name":"成員姓名","gender":"性別","birthDate":"YYYY-MM-DD","idNumber":"身分證字號","relationship":"關係"}
  ]
}
所有出生日期請轉換為西元年 YYYY-MM-DD 格式。`
      systemPrompt = '你是專業的台灣戶口名簿 OCR 助手。請識別戶長和所有成員的完整資料，以 JSON 格式輸出。'
    } else if (segmentIndex === 1) {
      // 只辨識戶長
      prompt = `請識別這張戶口名簿戶長的資料，提取：姓名、性別、出生年月日（轉為西元年 YYYY-MM-DD）、身分證字號。以 JSON 格式輸出：{"name":"姓名","gender":"性別","birthDate":"YYYY-MM-DD","idNumber":"身分證字號","relationship":"戶長"}`
      systemPrompt = '你是專業的台灣戶口名簿 OCR 助手。直接返回 JSON 格式結果，不要額外說明。'
    } else {
      // 單一成員
      prompt = `請識別這張戶口名簿第 ${segmentIndex} 列成員的資料，提取：姓名、性別、出生年月日（轉為西元年 YYYY-MM-DD）、身分證字號、與戶長關係。以 JSON 格式輸出：{"name":"姓名","gender":"性別","birthDate":"YYYY-MM-DD","idNumber":"身分證字號","relationship":"關係"}。如果此區域為空白，返回 null。`
      systemPrompt = '你是專業的台灣戶口名簿 OCR 助手。直接返回 JSON 格式結果，不要額外說明。'
    }

    const result = await this.performOCRWithRetry(image, prompt, systemPrompt)

    // 在結果中加入 segmentIndex
    if (result.success && result.data) {
      result.data.segmentIndex = segmentIndex
    }

    return result
  }

  /**
   * 分析戶口名簿文件佈局結構
   * 識別表格邊界、段落類型和座標位置
   *
   * 注意：圖片壓縮應在客戶端完成
   */
  async analyzeHouseholdLayout(image: File): Promise<OCRResult> {
    const prompt = `你是一位專業的文件分析師。請用**視覺方式**仔細觀察這張台灣戶口名簿圖片。

**你的任務**：
從上到下掃描整張圖片，找出所有**水平空白帶**（沒有文字的白色區域），並在每個空白帶的中央設置切割線。

**觀察重點**：
1. 表頭部分（最上方）：包含戶號、戶別、地址等欄位
2. 戶長列：第一列人員資料
3. 其他成員列：通常有 4 列人員資料（請數清楚有幾列）
4. 頁腳部分（最下方）：可能有發證資訊或空白

**絕對禁止**：
- ❌ 不要數學等分空間
- ❌ 不要假設每列高度相同
- ❌ 不要切到任何文字
- ✅ 只能切在**行與行之間的空白處**

**分析步驟**：
1. 用眼睛從上到下掃描，找出所有水平空白帶
2. 數清楚有幾列成員資料（通常是 4 列）
3. 在每個空白帶的中央位置設置切割邊界
4. 確保切割線不會碰到任何文字

請以 JSON 格式返回結果：
{
  "regions": [
    {
      "type": "header",
      "index": 0,
      "yStart": 0.0,
      "yEnd": [觀察到的表頭底部空白帶位置],
      "description": "表頭區域（戶號、地址等）"
    },
    {
      "type": "household-head",
      "index": 1,
      "yStart": [上方空白帶位置],
      "yEnd": [下方空白帶位置],
      "description": "戶長資料"
    },
    {
      "type": "member",
      "index": 2,
      "yStart": [上方空白帶位置],
      "yEnd": [下方空白帶位置],
      "description": "成員1資料"
    },
    ... (繼續成員2、成員3、成員4)
    {
      "type": "footer",
      "index": 6,
      "yStart": [最後一個空白帶位置],
      "yEnd": 1.0,
      "description": "頁腳資訊"
    }
  ],
  "totalRows": [實際觀察到的總區域數，通常是7],
  "hasTableBorders": [true/false]
}

**記住**：
- 用眼睛觀察，不要數學計算
- 每個 yStart 和 yEnd 應該是你實際看到的空白帶位置
- 必須有 7 個 regions（表頭 + 戶長 + 4個成員 + 頁腳）`

    const systemPrompt = `你是視覺分析專家，擅長識別文件中的空白區域。

**工作方式**：
1. **視覺掃描**：用視覺方式從上到下掃描圖片，找出每一個水平空白帶（兩行之間的白色空間）
2. **定位空白中心**：在每個空白帶的垂直中央位置設置切割線
3. **避免文字**：確保切割線完全位於空白處，不碰到任何文字或線條
4. **如實記錄**：根據實際觀察到的空白帶位置記錄 yStart 和 yEnd，不要做數學計算或等分

**禁止行為**：
- 禁止將剩餘空間等分為 N 份
- 禁止使用數學公式計算位置
- 禁止假設每列高度相同

只返回 JSON，不要解釋。`

    return await this.performOCRWithRetry(image, prompt, systemPrompt)
  }

  /**
   * 檢查服務狀態
   */
  async checkServiceStatus(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (process.env.XINFERENCE_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.XINFERENCE_API_KEY}`
      }

      const response = await fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      const modelExists = data.data?.some((model: any) => model.id === this.modelId)

      return modelExists
    } catch (error) {
      console.error('Failed to check service status:', error)
      return false
    }
  }
}

// 建立單例實例
const xinferenceClient = new XinferenceOCRClient()

export default xinferenceClient
export { XinferenceOCRClient, OCRResult }