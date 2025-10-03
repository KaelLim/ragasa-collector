// Ragic 同步客戶端
// 用於將 village_applications 資料同步到 Ragic

import { supabase } from './supabase'

interface RagicSyncResult {
  success: boolean
  ragicId?: number
  error?: string
}

class RagicClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.RAGIC_API_KEY || ''
    this.baseUrl = process.env.RAGIC_BASE_URL || 'https://ap11.ragic.com/TCTCharity/4-20252'

    console.log('Ragic Client 初始化:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey.length,
      baseUrl: this.baseUrl
    })
  }

  /**
   * 從 Supabase Storage 下載圖片為 Blob
   */
  private async downloadImage(path: string): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.storage
        .from('media')
        .download(path)

      if (error) {
        console.error('下載圖片失敗:', path, error)
        return null
      }

      return data
    } catch (error) {
      console.error('下載圖片異常:', path, error)
      return null
    }
  }

  /**
   * 同步單筆申請到 Ragic
   * @param village 樺加沙編號
   * @param data 申請資料
   * @param documents 文件資料
   * @param ragicId 如果提供，則更新該筆記錄（編輯模式）
   */
  async syncApplicationToRagic(
    village: string,
    data: any,
    documents: any,
    ragicId?: string
  ): Promise<RagicSyncResult> {
    try {
      const formData = new FormData()

      // 1. 樺加沙編號（例：大安001）
      formData.append('1028878', village)

      // 2. 基本資料
      if (data.victim_name) {
        formData.append('1028840', data.victim_name)
      }
      if (data.id_number) {
        formData.append('1028871', data.id_number)
      }

      // 3. 身分證地址
      if (data.id_city_district) {
        formData.append('1028836', data.id_city_district)
      }
      if (data.id_village_li) {
        formData.append('1028837', data.id_village_li)
      }
      if (data.id_address) {
        formData.append('1028839', data.id_address)
      }

      // 4. 戶籍謄本地址（如果與身分證不同）
      if (data.household_city_district) {
        formData.append('1028875', data.household_city_district)
      }
      if (data.household_village_li) {
        formData.append('1028876', data.household_village_li)
      }
      if (data.household_address) {
        formData.append('1028877', data.household_address)
      }

      // 5. 下載並上傳圖片（編輯模式下，空值會清除 Ragic 的圖片）
      // 身分證正面
      if (documents?.front_id_photo) {
        const blob = await this.downloadImage(documents.front_id_photo)
        if (blob) {
          formData.append('1028852', blob, 'front_id.jpg')
        }
      } else if (ragicId) {
        // 編輯模式下，明確清除圖片
        formData.append('1028852', '')
      }

      // 身分證背面
      if (documents?.back_id_photo) {
        const blob = await this.downloadImage(documents.back_id_photo)
        if (blob) {
          formData.append('1028853', blob, 'back_id.jpg')
        }
      } else if (ragicId) {
        formData.append('1028853', '')
      }

      // 戶籍謄本
      if (documents?.household_doc_photo) {
        const blob = await this.downloadImage(documents.household_doc_photo)
        if (blob) {
          formData.append('1028854', blob, 'household.jpg')
        }
      } else if (ragicId) {
        formData.append('1028854', '')
      }

      // 其他佐證照片（多個）
      if (documents?.addons_docs && Array.isArray(documents.addons_docs)) {
        for (const doc of documents.addons_docs) {
          const blob = await this.downloadImage(doc.filePath)
          if (blob) {
            // 使用 customName 作為檔名
            const filename = `${doc.customName}.jpg`
            formData.append('1028855', blob, filename)
          }
        }
      }

      // 6. 必要參數
      formData.append('api', '')
      formData.append('v', '3')

      // 7. POST 到 Ragic（建立新記錄或更新現有記錄）
      const url = ragicId ? `${this.baseUrl}/36/${ragicId}` : `${this.baseUrl}/36`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Ragic API 回應錯誤: ${response.status}`)
      }

      const result = await response.json()

      if (result.status === 'SUCCESS') {
        return {
          success: true,
          ragicId: result.ragicId
        }
      } else {
        return {
          success: false,
          error: result.msg || 'Unknown error'
        }
      }

    } catch (error) {
      console.error('同步到 Ragic 失敗:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }
    }
  }
}

export const ragicClient = new RagicClient()
