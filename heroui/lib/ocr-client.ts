// 客戶端 OCR 工具（直接呼叫 Xinference API）
// 用於靜態匯出部署

interface OCRResult {
  success: boolean
  data?: any
  error?: string
}

class OCRClient {
  private apiUrl: string
  private apiKey: string
  private modelId: string

  constructor() {
    // 從環境變數讀取（NEXT_PUBLIC_ 前綴可在客戶端使用）
    this.apiUrl = process.env.NEXT_PUBLIC_XINFERENCE_API_URL || 'https://tcm3studio.tzuchi-org.tw/v1'
    this.apiKey = process.env.NEXT_PUBLIC_XINFERENCE_API_KEY || 'sk-TzDigital-94800552'
    this.modelId = process.env.NEXT_PUBLIC_XINFERENCE_MODEL_ID || 'qwen2.5-vl-instruct'
  }

  private async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private parseOCRResponse(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return { rawText: text }
    } catch (error) {
      console.error('Failed to parse OCR response:', error)
      return { rawText: text }
    }
  }

  async recognizeIdCardFront(file: File): Promise<OCRResult> {
    try {
      const base64Image = await this.imageToBase64(file)

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: 'system',
              content: '你是一個專業的 OCR 文字識別助手。'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '請識別這張台灣身分證正面的資訊，包括：姓名、身分證字號。請以 JSON 格式回傳，格式為：{"name": "姓名", "idNumber": "身分證字號"}'
                },
                {
                  type: 'image_url',
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (content) {
        const data = this.parseOCRResponse(content)
        return { success: true, data }
      }

      return { success: false, error: '無效的 API 回應' }
    } catch (error) {
      console.error('OCR 辨識失敗:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '辨識失敗'
      }
    }
  }

  async recognizeIdCardBack(file: File): Promise<OCRResult> {
    try {
      const base64Image = await this.imageToBase64(file)

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: 'system',
              content: '你是一個專業的 OCR 文字識別助手。'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '請識別這張台灣身分證背面的資訊，包括：戶籍地址。請以 JSON 格式回傳，格式為：{"address": "地址"}'
                },
                {
                  type: 'image_url',
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (content) {
        const data = this.parseOCRResponse(content)
        return { success: true, data }
      }

      return { success: false, error: '無效的 API 回應' }
    } catch (error) {
      console.error('OCR 辨識失敗:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '辨識失敗'
      }
    }
  }

  async recognizeBankBook(file: File): Promise<OCRResult> {
    try {
      const base64Image = await this.imageToBase64(file)

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: 'system',
              content: '你是一個專業的 OCR 文字識別助手。'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '請識別這張銀行存摺的資訊，包括：銀行代碼（3碼數字）、分行代碼（通常是帳號的前3-4碼數字）、分行名稱、帳號、戶名。請以 JSON 格式回傳，格式為：{"bankCode": "銀行代碼（3碼）", "branchCode": "分行代碼（3-4碼）", "branchName": "分行名稱", "accountNumber": "帳號", "accountName": "戶名"}'
                },
                {
                  type: 'image_url',
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (content) {
        const data = this.parseOCRResponse(content)
        return { success: true, data }
      }

      return { success: false, error: '無效的 API 回應' }
    } catch (error) {
      console.error('OCR 辨識失敗:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '辨識失敗'
      }
    }
  }
}

export const ocrClient = new OCRClient()
