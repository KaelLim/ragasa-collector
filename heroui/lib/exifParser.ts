import EXIF from 'exif-js'

/**
 * EXIF 解析結果介面
 */
export interface ExifData {
  datetime: string | null
  gps: { lat: number; lon: number } | null
  camera: string | null
  raw: Record<string, any> | null
}

/**
 * 解析圖片 EXIF 資料
 *
 * @param imageFile - 圖片檔案
 * @returns Promise<ExifData> EXIF 資料
 */
export async function parseExif(imageFile: File): Promise<ExifData> {
  return new Promise((resolve) => {
    EXIF.getData(imageFile as any, function(this: any) {
      const allTags = EXIF.getAllTags(this)

      // 解析日期時間
      let datetime = null
      if (allTags.DateTimeOriginal) {
        const [date, time] = allTags.DateTimeOriginal.split(' ')
        datetime = `${date.replace(/:/g, '-')}T${time}`
      } else if (allTags.DateTime) {
        const [date, time] = allTags.DateTime.split(' ')
        datetime = `${date.replace(/:/g, '-')}T${time}`
      }

      // 解析 GPS 座標
      let gps = null
      if (allTags.GPSLatitude && allTags.GPSLongitude) {
        const lat = convertDMSToDD(
          allTags.GPSLatitude,
          allTags.GPSLatitudeRef
        )
        const lon = convertDMSToDD(
          allTags.GPSLongitude,
          allTags.GPSLongitudeRef
        )
        gps = { lat, lon }
      }

      // 解析相機資訊
      let camera = null
      if (allTags.Make || allTags.Model) {
        camera = `${allTags.Make || ''} ${allTags.Model || ''}`.trim()
      }

      resolve({
        datetime,
        gps,
        camera,
        raw: Object.keys(allTags).length > 0 ? allTags : null
      })
    })
  })
}

/**
 * GPS 座標從 DMS（度分秒）轉換為 DD（十進位度數）
 * @param dms - 度分秒陣列 [度, 分, 秒]
 * @param ref - 方向參考 (N/S/E/W)
 * @returns 十進位度數
 */
function convertDMSToDD(dms: number[], ref: string): number {
  const degrees = dms[0] + dms[1] / 60 + dms[2] / 3600
  return (ref === 'S' || ref === 'W') ? -degrees : degrees
}
