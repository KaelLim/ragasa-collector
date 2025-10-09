/**
 * 圖片切割工具
 * 用於將戶口名簿圖片切割成多個區域以加速 OCR 處理
 */

export interface ImageSegment {
  index: number          // 切片索引 (0=表頭, 1=戶長, 2-5=成員)
  type: 'header' | 'householdHead' | 'member'
  base64: string        // Base64 編碼圖片（暫存用）
  dataUrl: string       // 預覽用 Data URL
  label: string         // 區域標籤
  width: number
  height: number
  yStart: number        // 垂直起始位置（百分比）
  yEnd: number          // 垂直結束位置（百分比）
}

/**
 * 將圖片轉換為 Canvas
 */
async function imageToCanvas(imageFile: File | Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageFile)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('無法取得 Canvas 2D 上下文'))
        return
      }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('圖片載入失敗'))
    }

    img.src = url
  })
}

/**
 * 從 Canvas 切割指定區域並轉為 Base64（PNG 無損格式）
 */
function cropCanvasToBase64(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  quality: number = 1.0
): string {
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = width
  cropCanvas.height = height

  const ctx = cropCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('無法取得 Canvas 2D 上下文')
  }

  // 繪製切割區域
  ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

  // 轉為 Base64（使用 PNG 無損格式）
  return cropCanvas.toDataURL('image/png')
}

/**
 * 將 Base64 轉為 Blob（用於 OCR API 請求）
 */
export function base64ToBlob(base64: string): Blob {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new Blob([u8arr], { type: mime })
}

/**
 * 切割戶口名簿圖片（使用標準配置比例）
 *
 * 標準切割策略 v3.0（固定數值，人工驗證）：
 * - 表頭：0-21% (戶號、戶長統號、戶別、戶籍地址)
 * - 戶長：21%-34% (戶長資料列，13% 高度)
 * - 成員1：34%-44.5% (10.5% 高度)
 * - 成員2：44.5%-55% (10.5% 高度)
 * - 成員3：55%-65.5% (10.5% 高度)
 * - 成員4：65.5%-76% (10.5% 高度)
 * - 頁腳：76%-100% (24% 高度，不進行 OCR)
 *
 * @param imageFile - 原始戶口名簿圖片
 * @returns 6 個切片 (0=表頭, 1=戶長, 2-5=成員1-4)
 */
export async function segmentHouseholdImage(imageFile: File | Blob): Promise<ImageSegment[]> {
  // 轉換為 Canvas
  const canvas = await imageToCanvas(imageFile)
  const width = canvas.width
  const height = canvas.height

  console.log('📐 戶口名簿尺寸:', { width, height })

  const segments: ImageSegment[] = []

  // 標準切割區域（基於 config/household-layout.json v3.0 - 固定數值）
  const regions = [
    { index: 0, type: 'header' as const, yStart: 0, yEnd: 0.21, label: '表頭區域' },
    { index: 1, type: 'householdHead' as const, yStart: 0.21, yEnd: 0.34, label: '戶長資料' },
    { index: 2, type: 'member' as const, yStart: 0.34, yEnd: 0.445, label: '成員1資料' },
    { index: 3, type: 'member' as const, yStart: 0.445, yEnd: 0.55, label: '成員2資料' },
    { index: 4, type: 'member' as const, yStart: 0.55, yEnd: 0.655, label: '成員3資料' },
    { index: 5, type: 'member' as const, yStart: 0.655, yEnd: 0.76, label: '成員4資料' }
    // 頁腳區域 (0.76-1.0) 不進行 OCR，故不切割
  ]

  // 逐一切割並保存為 Base64
  for (const region of regions) {
    const y = Math.floor(height * region.yStart)
    const h = Math.floor(height * (region.yEnd - region.yStart))

    console.log(`✂️  切割 ${region.label}:`)
    console.log(`   比例: ${(region.yStart * 100).toFixed(1)}% - ${(region.yEnd * 100).toFixed(1)}% (高度 ${((region.yEnd - region.yStart) * 100).toFixed(1)}%)`)
    console.log(`   像素: y=${y}, h=${h} (圖片總高=${height})`)

    // 切割並轉為 Base64（PNG 無損格式）
    const base64 = cropCanvasToBase64(canvas, 0, y, width, h)
    const base64Size = Math.round((base64.length * 3) / 4 / 1024)
    console.log(`   Base64 大小: ${base64Size} KB (PNG 無損)`)

    segments.push({
      index: region.index,
      type: region.type,
      base64,
      dataUrl: base64, // 使用 base64 作為 dataUrl（無需額外創建 Object URL）
      label: region.label,
      width,
      height: h,
      yStart: region.yStart,
      yEnd: region.yEnd
    })
  }

  console.log(`✅ 完成切割：${segments.length} 個區域（已保存為 Base64）`)
  return segments
}

/**
 * 清理切片（Base64 模式下無需清理，保留此函數以保持 API 兼容）
 */
export function cleanupSegments(segments: ImageSegment[]) {
  // Base64 儲存在記憶體中，由垃圾回收自動處理
  // 此函數保留以維持 API 兼容性
  console.log('ℹ️ Base64 模式無需手動清理記憶體')
}

/**
 * 根據切片索引取得對應的 Blob（用於 OCR API 請求）
 * @param segments - 切片陣列
 * @param index - 切片索引
 * @returns Blob 物件
 */
export function getSegmentBlob(segments: ImageSegment[], index: number): Blob | null {
  const segment = segments.find(seg => seg.index === index)
  if (!segment) {
    console.error(`❌ 找不到索引為 ${index} 的切片`)
    return null
  }

  return base64ToBlob(segment.base64)
}
