import { config } from 'dotenv'
import path from 'path'

// 載入 .env.ocr 設定
config({ path: path.join(process.cwd(), '.env.ocr') })

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
   * 將圖片轉換為 base64 格式
   */
  private async imageToBase64(image: File | Blob): Promise<string> {
    // 檢查是否在 Node.js 環境（伺服器端）
    if (typeof window === 'undefined') {
      // 伺服器端：使用 Buffer
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = `data:${image.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
      return base64
    } else {
      // 客戶端：使用 FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          resolve(base64)
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

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.modelId,
          messages: messages,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: false, // 明確指定不使用串流
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
   */
  private async performOCRWithRetry(
    image: File | Blob,
    prompt: string,
    systemPrompt?: string
  ): Promise<OCRResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`OCR attempt ${attempt}/${this.maxRetries}`)

        const base64Image = await this.imageToBase64(image)

        const messages: XinferenceMessage[] = [
          {
            role: 'system',
            content: systemPrompt || process.env.XINFERENCE_OCR_SYSTEM_PROMPT ||
                    '你是一個專業的 OCR 文字識別助手。'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Image } }
            ]
          }
        ]

        const response = await this.callXinferenceAPI(messages)

        if (response?.choices?.[0]?.message?.content) {
          const content = response.choices[0].message.content
          const parsedData = this.parseOCRResponse(content)

          return {
            success: true,
            data: parsedData,
            rawResponse: content
          }
        }

        throw new Error('Invalid API response structure')
      } catch (error: any) {
        console.error(`OCR attempt ${attempt} failed:`, error.message)
        lastError = error

        if (attempt < this.maxRetries) {
          // 等待後重試（指數退避）
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
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
   * 檢查服務狀態
   */
  async checkServiceStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
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
export type { XinferenceOCRClient, OCRResult }