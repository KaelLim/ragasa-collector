// Ragic 工具函數

/**
 * 將 Ragic 的圖片格式轉換為可顯示的 URL
 * @param fileString Ragic 圖片格式（例：9rajW4J7E7@front_id.jpg）
 * @param accountName Ragic 帳號名稱（預設：TCTCharity）
 * @returns 圖片 URL
 */
export function getRagicImageUrl(fileString: string | null | undefined, accountName: string = 'TCTCharity'): string | null {
  if (!fileString || fileString === '') {
    return null
  }

  // 編碼檔案名稱（Ragic 要求）
  const encodedFile = encodeURIComponent(fileString)

  return `https://ap11.ragic.com/sims/file.jsp?a=${accountName}&f=${encodedFile}`
}

/**
 * 處理 Ragic 的多圖片陣列
 * @param fileArray Ragic 圖片陣列（例：["", "hash1@file1.jpg", "hash2@file2.jpg"]）
 * @returns 圖片 URL 陣列
 */
export function getRagicImageUrls(fileArray: any, accountName: string = 'TCTCharity'): string[] {
  if (!Array.isArray(fileArray)) {
    return []
  }

  return fileArray
    .filter(file => file && file !== '')  // 過濾空字串
    .map(file => getRagicImageUrl(file, accountName))
    .filter(url => url !== null) as string[]
}
