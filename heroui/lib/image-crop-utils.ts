import sharp from 'sharp'

/**
 * 圖片切割配置
 */
interface CropConfig {
  top: number      // 起始位置（百分比，0-100）
  height: number   // 切割高度（百分比，0-100）
}

/**
 * 預設切割配置
 */
const DEFAULT_CROP_CONFIGS: { [key: string]: CropConfig } = {
  // 戶口名簿表頭：前 15% 高度
  'household-header': {
    top: 0,
    height: 15
  },
  // 戶口名簿成員區域（戶長）：15%-32%
  'household-member-1': {
    top: 15,
    height: 17
  },
  // 戶口名簿成員區域（第2位）：32%-49%
  'household-member-2': {
    top: 32,
    height: 17
  },
  // 戶口名簿成員區域（第3位）：49%-66%
  'household-member-3': {
    top: 49,
    height: 17
  },
  // 戶口名簿成員區域（第4位）：66%-83%
  'household-member-4': {
    top: 66,
    height: 17
  },
  // 戶口名簿成員區域（第5位）：83%-100%
  'household-member-5': {
    top: 83,
    height: 17
  }
}

/**
 * 切割圖片
 * @param imageBuffer - 圖片 Buffer
 * @param cropType - 切割類型（如 'household-header'）
 * @param customConfig - 自訂切割配置（可選）
 * @returns 切割後的圖片 Buffer
 */
export async function cropImage(
  imageBuffer: Buffer,
  cropType: string,
  customConfig?: CropConfig
): Promise<Buffer> {
  try {
    // 取得切割配置
    const config = customConfig || DEFAULT_CROP_CONFIGS[cropType]

    if (!config) {
      throw new Error(`Unknown crop type: ${cropType}`)
    }

    // 取得圖片元資料
    const metadata = await sharp(imageBuffer).metadata()
    const { width = 0, height = 0 } = metadata

    if (!width || !height) {
      throw new Error('Failed to read image dimensions')
    }

    // 計算切割區域（像素）
    const cropTop = Math.floor(height * config.top / 100)
    const cropHeight = Math.floor(height * config.height / 100)

    console.log(`🔍 圖片切割資訊:`)
    console.log(`   原始尺寸: ${width}x${height}`)
    console.log(`   切割類型: ${cropType}`)
    console.log(`   切割區域: top=${cropTop}px, height=${cropHeight}px`)

    // 執行切割
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: cropTop,
        width: width,
        height: cropHeight
      })
      .toBuffer()

    const croppedMetadata = await sharp(croppedBuffer).metadata()
    console.log(`   切割後尺寸: ${croppedMetadata.width}x${croppedMetadata.height}`)
    console.log(`   壓縮比: ${((croppedBuffer.length / imageBuffer.length) * 100).toFixed(1)}%`)

    return croppedBuffer
  } catch (error) {
    console.error('圖片切割失敗:', error)
    throw error
  }
}

/**
 * 從 File/Blob 物件切割圖片
 * @param file - File 或 Blob 物件
 * @param cropType - 切割類型
 * @param customConfig - 自訂切割配置（可選）
 * @returns 切割後的 Blob 物件
 */
export async function cropImageFromFile(
  file: File | Blob,
  cropType: string,
  customConfig?: CropConfig
): Promise<Blob> {
  try {
    // 將 File/Blob 轉換為 Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 切割圖片
    const croppedBuffer = await cropImage(buffer, cropType, customConfig)

    // 轉換回 Blob
    const blob = new Blob([croppedBuffer], { type: file.type || 'image/jpeg' })
    return blob
  } catch (error) {
    console.error('從 File 切割圖片失敗:', error)
    throw error
  }
}

/**
 * 取得可用的切割類型
 */
export function getAvailableCropTypes(): string[] {
  return Object.keys(DEFAULT_CROP_CONFIGS)
}

/**
 * 取得切割配置
 */
export function getCropConfig(cropType: string): CropConfig | undefined {
  return DEFAULT_CROP_CONFIGS[cropType]
}
