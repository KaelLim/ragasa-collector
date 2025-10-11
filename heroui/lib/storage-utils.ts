import { supabase } from './supabase'

/**
 * 從 Private Storage Bucket 獲取 Signed URL
 *
 * @param filePath - 檔案路徑（儲存在資料庫中的路徑）
 * @param expiresIn - URL 有效時間（秒），預設 1 小時
 * @returns Signed URL 或 null
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!filePath) return null

  try {
    const { data, error } = await supabase.storage
      .from('visitrecords')
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Failed to create signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return null
  }
}

/**
 * 批次獲取多個檔案的 Signed URLs
 *
 * @param filePaths - 檔案路徑陣列
 * @param expiresIn - URL 有效時間（秒），預設 1 小時
 * @returns Signed URLs 陣列
 */
export async function getSignedUrls(
  filePaths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  if (!filePaths || filePaths.length === 0) return []

  try {
    const { data, error } = await supabase.storage
      .from('visitrecords')
      .createSignedUrls(filePaths, expiresIn)

    if (error) {
      console.error('Failed to create signed URLs:', error)
      return []
    }

    return data.map(item => item.signedUrl)
  } catch (error) {
    console.error('Error creating signed URLs:', error)
    return []
  }
}

/**
 * 刪除 Storage 中的檔案
 *
 * @param filePath - 檔案路徑
 */
export async function deleteStorageFile(filePath: string): Promise<void> {
  if (!filePath) return

  try {
    const { error } = await supabase.storage
      .from('visitrecords')
      .remove([filePath])

    if (error) {
      console.error('Failed to delete file:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * 批次刪除多個檔案
 *
 * @param filePaths - 檔案路徑陣列
 */
export async function deleteStorageFiles(filePaths: string[]): Promise<void> {
  if (!filePaths || filePaths.length === 0) return

  try {
    const { error } = await supabase.storage
      .from('visitrecords')
      .remove(filePaths)

    if (error) {
      console.error('Failed to delete files:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting files:', error)
    throw error
  }
}
