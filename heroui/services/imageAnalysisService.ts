import { supabase } from '@/lib/supabase'
import { parseExif } from '@/lib/exifParser'
import type { ImageAnalysisInsert } from '@/types/database.types'

/**
 * 圖片上傳與處理結果
 */
export interface UploadAndProcessResult {
  analysisId: string
  imageUrl: string
  thumbnailUrl: string
}

/**
 * 壓縮圖片
 * @param file - 原始圖片檔案
 * @param maxWidth - 最大寬度
 * @param maxHeight - 最大高度
 * @returns 壓縮後的 Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        0.8
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 上傳圖片並進行分析處理
 * @param file - 圖片檔案
 * @param eventDescription - 事件背景描述
 * @returns 分析 ID 與圖片 URL
 */
export async function uploadAndProcessImage(
  file: File,
  eventDescription?: string
): Promise<UploadAndProcessResult> {
  try {
    // 1. 取得當前使用者
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('未登入，請先登入系統')
    }

    const userId = user.id
    const tenantId = user.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000'

    // 2. 解析 EXIF 資料
    const exifData = await parseExif(file)

    // 3. 上傳原始圖片
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const imagePath = `${userId}/${timestamp}_${sanitizedName}`

    const { error: uploadError } = await supabase.storage
      .from('disaster-images')
      .upload(imagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Storage 上傳失敗: ${uploadError.message}`)
    }

    const { data: { publicUrl: imageUrl } } = supabase.storage
      .from('disaster-images')
      .getPublicUrl(imagePath)

    // 4. 生成並上傳縮圖
    const thumbnailBlob = await compressImage(file, 200, 200)
    const thumbnailPath = `${userId}/thumbnails/${timestamp}_thumb.jpg`

    const { error: thumbnailError } = await supabase.storage
      .from('disaster-images')
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      })

    if (thumbnailError) {
      console.warn('縮圖上傳失敗:', thumbnailError.message)
      // 縮圖失敗不影響主流程
    }

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('disaster-images')
      .getPublicUrl(thumbnailPath)

    // 5. 寫入資料庫記錄
    const insertData: ImageAnalysisInsert = {
      user_id: userId,
      tenant_id: tenantId,
      image_name: file.name,
      image_url: imageUrl,
      thumbnail_key: thumbnailPath,
      event_description: eventDescription || null,
      exif_datetime: exifData.datetime,
      exif_gps: exifData.gps,
      exif_camera: exifData.camera,
      exif_raw: exifData.raw,
      status: 'pending'  // 關鍵：必須為 pending 才會觸發 Database Trigger
    }

    const { data: analysis, error: insertError } = await supabase
      .from('image_analyses')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      throw new Error(`資料庫寫入失敗: ${insertError.message}`)
    }

    // 6. 觸發 Edge Function 進行 AI 分析（非阻塞）
    supabase.functions.invoke('process-image', {
      body: { image_id: analysis.id }
    }).catch((error) => {
      console.error('Edge Function 調用失敗:', error)
      // 即使失敗也不影響主流程，狀態保持 pending，後端 Queue Worker 會處理
    })

    return {
      analysisId: analysis.id,
      imageUrl,
      thumbnailUrl
    }
  } catch (error) {
    console.error('uploadAndProcessImage 失敗:', error)
    throw error
  }
}

/**
 * 取得圖片分析記錄列表
 * @param page - 頁碼（從 1 開始）
 * @param pageSize - 每頁筆數
 * @returns 分析記錄列表與總數
 */
export async function getImageAnalyses(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('image_analyses')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: data || [], count: count || 0, page, pageSize }
}

/**
 * 根據狀態取得圖片分析記錄
 * @param status - 狀態
 * @returns 分析記錄列表
 */
export async function getByStatus(status: 'pending' | 'processing' | 'completed' | 'failed') {
  const { data, error } = await supabase
    .from('image_analyses')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 取得單筆分析記錄
 * @param id - 記錄 ID
 * @returns 分析記錄
 */
export async function getById(id: string) {
  const { data, error } = await supabase
    .from('image_analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * 刪除分析記錄（包含刪除檔案）
 * @param id - 記錄 ID
 */
export async function deleteImageAnalysis(id: string) {
  // 1. 取得記錄資訊
  const analysis = await getById(id)

  // 2. 刪除檔案
  const pathsToDelete = [
    analysis.image_url.split('/disaster-images/')[1],
    analysis.thumbnail_key
  ].filter(Boolean) as string[]

  if (pathsToDelete.length > 0) {
    await supabase.storage
      .from('disaster-images')
      .remove(pathsToDelete)
  }

  // 3. 刪除資料庫記錄
  const { error } = await supabase
    .from('image_analyses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * 等待 AI 處理完成（帶超時機制的 Promise 封裝）
 * @param imageId - 圖片分析 ID
 * @param timeoutMs - 超時時間（毫秒），預設 60 秒
 * @returns AI 分析結果
 */
export async function waitForProcessingComplete(
  imageId: string,
  timeoutMs: number = 60000
): Promise<ImageAnalysis> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout

    const channel = supabase
      .channel(`processing-${imageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'image_analyses',
          filter: `id=eq.${imageId}`
        },
        (payload: any) => {
          const newData = payload.new as ImageAnalysis

          // AI 處理完成
          if (newData.status === 'completed') {
            clearTimeout(timeoutId)
            supabase.removeChannel(channel)
            resolve(newData)
          }

          // AI 處理失敗
          if (newData.status === 'failed') {
            clearTimeout(timeoutId)
            supabase.removeChannel(channel)
            reject(new Error(newData.error_message || 'AI 處理失敗'))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeoutId)
          supabase.removeChannel(channel)
          reject(new Error('Realtime 訂閱失敗'))
        }
      })

    // 設定超時機制
    timeoutId = setTimeout(async () => {
      supabase.removeChannel(channel)

      // 超時後查詢當前狀態
      try {
        const { data, error } = await supabase
          .from('image_analyses')
          .select('*')
          .eq('id', imageId)
          .single()

        if (error) throw error

        if (data.status === 'completed') {
          // 已完成但 Realtime 未收到
          resolve(data as ImageAnalysis)
        } else {
          // 仍在處理中
          reject(new Error('AI 處理超時（60 秒），已在背景處理，請稍後查看分析記錄'))
        }
      } catch (err) {
        reject(new Error('查詢處理狀態失敗'))
      }
    }, timeoutMs)
  })
}

/**
 * 批次上傳多張圖片
 * @param files - 圖片檔案陣列
 * @param eventDescription - 事件背景描述
 * @param onProgress - 進度回調函數
 * @returns 上傳結果陣列
 */
export async function batchUploadImages(
  files: File[],
  eventDescription?: string,
  onProgress?: (current: number, total: number, fileName: string, status: string) => void
): Promise<Array<{ fileName: string; status: 'success' | 'failed'; result?: UploadAndProcessResult; error?: string }>> {
  const results = []
  const total = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    try {
      // 進度回調
      onProgress?.(i + 1, total, file.name, 'uploading')

      // 上傳並處理
      const result = await uploadAndProcessImage(file, eventDescription)

      results.push({
        fileName: file.name,
        status: 'success',
        result
      })

      onProgress?.(i + 1, total, file.name, 'completed')

    } catch (error) {
      console.error(`處理失敗 ${file.name}:`, error)

      results.push({
        fileName: file.name,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      })

      onProgress?.(i + 1, total, file.name, 'failed')
    }

    // 延遲 1 秒避免同時大量寫入
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}
