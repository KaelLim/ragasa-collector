/**
 * Supabase Storage 工具函數
 * 處理檔案上傳、命名、搬移等操作
 */

import { supabase } from './supabase'
import { v7 as uuidv7 } from 'uuid'

/**
 * 檔案類型定義
 */
export type FileType =
  | 'household'      // 戶口名簿
  | 'id-head-front'  // 戶長身份證正面
  | 'id-head-back'   // 戶長身份證背面
  | 'id-proxy-front' // 代理人身份證正面
  | 'id-proxy-back'  // 代理人身份證背面
  | 'bank'           // 銀行存摺
  | 'signature'      // 申請人簽名

/**
 * 生成檔案名稱
 * @param applicationUuid - 申請的 UUID7
 * @param fileType - 檔案類型
 * @param pageNum - 頁碼（戶口名簿多頁時使用）
 * @returns 標準化檔案名稱（不含副檔名）
 */
export function generateFileName(
  applicationUuid: string,
  fileType: FileType,
  pageNum?: number
): string {
  const typeNames: Record<FileType, string> = {
    'household': pageNum ? `household-page${pageNum}` : 'household',
    'id-head-front': 'id-head-front',
    'id-head-back': 'id-head-back',
    'id-proxy-front': 'id-proxy-front',
    'id-proxy-back': 'id-proxy-back',
    'bank': 'bank-book',
    'signature': 'signature'
  }

  return `${applicationUuid}_${typeNames[fileType]}`
}

/**
 * 取得檔案副檔名
 */
function getFileExtension(file: File): string {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'jpg'
  return 'jpg' // 預設
}

/**
 * 將檔案轉為 Base64 並存入 localStorage
 * @param file - 檔案物件
 * @param key - localStorage key
 */
export async function saveToLocalStorage(file: File, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const base64 = reader.result as string
        localStorage.setItem(key, base64)
        const sizeKB = Math.round(base64.length / 1024)
        console.log(`💾 已存入 localStorage: ${key} (${sizeKB} KB)`)
        resolve()
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 從 localStorage 讀取 Base64 並轉為 File
 * @param key - localStorage key
 * @param fileName - 檔案名稱
 * @returns File 物件
 */
export function loadFromLocalStorage(key: string, fileName: string = 'file.jpg'): File | null {
  const base64 = localStorage.getItem(key)
  if (!base64) {
    console.warn(`⚠️  localStorage 中找不到: ${key}`)
    return null
  }

  try {
    // Base64 轉 Blob
    const arr = base64.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    const blob = new Blob([u8arr], { type: mime })
    const file = new File([blob], fileName, { type: mime })

    console.log(`📥 從 localStorage 讀取: ${key} (${file.size} bytes)`)
    return file
  } catch (error) {
    console.error(`❌ localStorage 讀取失敗: ${key}`, error)
    return null
  }
}

/**
 * 上傳檔案到暫存區 (Private Bucket)
 * @param file - 檔案物件
 * @param applicationUuid - 申請的 UUID7
 * @param fileType - 檔案類型
 * @param pageNum - 頁碼（可選）
 * @returns Storage 路徑（用於 Signed URL）
 */
export async function uploadToTemp(
  file: File,
  applicationUuid: string,
  fileType: FileType,
  pageNum?: number
): Promise<{ path: string }> {
  const ext = getFileExtension(file)
  const fileName = generateFileName(applicationUuid, fileType, pageNum)
  const path = `temp/${fileName}.${ext}`

  console.log(`📤 上傳到暫存區 (Private): ${path}`)

  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true // 允許覆蓋（如果重新上傳）
    })

  if (error) {
    console.error('❌ Storage 上傳失敗:', error)
    throw new Error(`檔案上傳失敗: ${error.message}`)
  }

  console.log(`✅ 上傳成功 (Private): ${path}`)

  return {
    path // 僅返回路徑，不返回 URL
  }
}

/**
 * 從 Storage URL 下載檔案為 File 物件
 * @param url - Storage 公開 URL
 * @param fileName - 檔案名稱
 * @returns File 物件
 */
export async function downloadFromStorage(
  url: string,
  fileName: string = 'file.jpg'
): Promise<File> {
  console.log(`📥 從 Storage 下載: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下載失敗: ${response.statusText}`)
  }

  const blob = await response.blob()
  const file = new File([blob], fileName, { type: blob.type })

  console.log(`✅ 下載成功: ${file.size} bytes`)

  return file
}

/**
 * 搬移檔案從暫存區到正式區
 * @param applicationUuid - 申請的 UUID7
 * @param tempPaths - 暫存區檔案路徑陣列
 * @returns 正式區檔案路徑陣列
 */
export async function moveToApplications(
  applicationUuid: string,
  tempPaths: string[]
): Promise<string[]> {
  console.log(`📦 搬移 ${tempPaths.length} 個檔案到正式區...`)

  const movedPaths: string[] = []

  for (const tempPath of tempPaths) {
    // temp/UUID7_戶口名簿_第1頁.jpg -> applications/UUID7/戶口名簿_第1頁.jpg
    const fileName = tempPath.replace('temp/', '').replace(`${applicationUuid}_`, '')
    const newPath = `applications/${applicationUuid}/${fileName}`

    console.log(`  ${tempPath} → ${newPath}`)

    // Supabase Storage 的 move 操作（複製 + 刪除）
    const { error: copyError } = await supabase.storage
      .from('media')
      .copy(tempPath, newPath)

    if (copyError) {
      console.error(`❌ 複製失敗: ${tempPath}`, copyError)
      continue
    }

    const { error: deleteError } = await supabase.storage
      .from('media')
      .remove([tempPath])

    if (deleteError) {
      console.warn(`⚠️  刪除暫存檔失敗: ${tempPath}`, deleteError)
    }

    movedPaths.push(newPath)
  }

  console.log(`✅ 搬移完成: ${movedPaths.length} 個檔案`)

  return movedPaths
}

/**
 * 清理暫存檔案
 * @param applicationUuid - 申請的 UUID7
 */
export async function cleanupTempFiles(applicationUuid: string): Promise<void> {
  console.log(`🗑️  清理暫存檔案: ${applicationUuid}`)

  const { data: files, error: listError } = await supabase.storage
    .from('media')
    .list('temp', {
      search: applicationUuid
    })

  if (listError || !files) {
    console.warn('⚠️  無法列出暫存檔案')
    return
  }

  const filePaths = files.map(f => `temp/${f.name}`)

  if (filePaths.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from('media')
      .remove(filePaths)

    if (deleteError) {
      console.error('❌ 清理失敗:', deleteError)
    } else {
      console.log(`✅ 已清理 ${filePaths.length} 個暫存檔案`)
    }
  }
}

/**
 * 生成新的申請 UUID7
 * @returns UUID7 字串
 */
export function generateApplicationUuid(): string {
  return uuidv7()
}
