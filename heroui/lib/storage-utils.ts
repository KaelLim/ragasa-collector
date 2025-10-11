import { supabase } from './supabase'

/**
 * Storage Bucket 名稱
 */
export const STORAGE_BUCKETS = {
  APPLICATIONS: 'media',       // 個資收集系統
  VISIT_RECORDS: 'visitrecords' // 訪視紀錄系統
} as const

/**
 * 從 Private Storage Bucket 獲取 Signed URL
 *
 * @param bucketName - Bucket 名稱
 * @param filePath - 檔案路徑（儲存在資料庫中的路徑）
 * @param expiresIn - URL 有效時間（秒），預設 1 小時
 * @returns Signed URL 或 null
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!filePath) return null

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
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
 * 從個資收集系統 (media bucket) 獲取 Signed URL
 */
export async function getApplicationSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  return getSignedUrl(STORAGE_BUCKETS.APPLICATIONS, filePath, expiresIn)
}

/**
 * 從訪視紀錄系統 (visitrecords bucket) 獲取 Signed URL
 */
export async function getVisitRecordSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  return getSignedUrl(STORAGE_BUCKETS.VISIT_RECORDS, filePath, expiresIn)
}

/**
 * 批次獲取多個檔案的 Signed URLs
 *
 * @param bucketName - Bucket 名稱
 * @param filePaths - 檔案路徑陣列
 * @param expiresIn - URL 有效時間（秒），預設 1 小時
 * @returns Signed URLs 陣列
 */
export async function getSignedUrls(
  bucketName: string,
  filePaths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  if (!filePaths || filePaths.length === 0) return []

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
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
 * 從個資收集系統批次獲取 Signed URLs
 */
export async function getApplicationSignedUrls(
  filePaths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  return getSignedUrls(STORAGE_BUCKETS.APPLICATIONS, filePaths, expiresIn)
}

/**
 * 從訪視紀錄系統批次獲取 Signed URLs
 */
export async function getVisitRecordSignedUrls(
  filePaths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  return getSignedUrls(STORAGE_BUCKETS.VISIT_RECORDS, filePaths, expiresIn)
}

/**
 * 刪除 Storage 中的檔案
 *
 * @param bucketName - Bucket 名稱
 * @param filePath - 檔案路徑
 */
export async function deleteStorageFile(
  bucketName: string,
  filePath: string
): Promise<void> {
  if (!filePath) return

  try {
    const { error } = await supabase.storage
      .from(bucketName)
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
 * @param bucketName - Bucket 名稱
 * @param filePaths - 檔案路徑陣列
 */
export async function deleteStorageFiles(
  bucketName: string,
  filePaths: string[]
): Promise<void> {
  if (!filePaths || filePaths.length === 0) return

  try {
    const { error } = await supabase.storage
      .from(bucketName)
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
