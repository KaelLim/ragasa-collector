import { NextRequest, NextResponse } from 'next/server'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import { OpenAI } from 'openai'
import { Converter } from 'opencc-js'

// 載入 .env.stt 配置（Whisper STT 專用）
dotenvConfig({ path: path.join(process.cwd(), '.env.stt') })

// 初始化簡繁轉換器（簡體 → 繁體台灣）
const converter = Converter({ from: 'cn', to: 'tw' })

/**
 * Whisper 語音轉文字 API
 *
 * 技術規格：
 * - 模型：whisper-large-v3-turbo-mlx
 * - 語言：zh（輸出繁體中文）
 * - 處理效能：40x 實時速度
 * - 私有雲：https://tcm2studio.tzuchi-org.tw/v1
 *
 * 使用 OpenAI Client SDK（Xinference 相容模式）
 *
 * 參考文檔：
 * - /Users/chih-hungtseng/projects/whisper/TEST_REPORT.md
 * - /Users/chih-hungtseng/projects/whisper/FINDINGS.md
 */

const XINFERENCE_API_URL = process.env.XINFERENCE_API_URL || 'https://tcm2studio.tzuchi-org.tw/v1'
const XINFERENCE_API_KEY = process.env.XINFERENCE_API_KEY || ''

// 建立 OpenAI Client（指向 Xinference 伺服器）
const client = new OpenAI({
  apiKey: XINFERENCE_API_KEY,
  baseURL: XINFERENCE_API_URL
})

console.log('[Whisper API] OpenAI Client 初始化:')
console.log('  Base URL:', XINFERENCE_API_URL)
console.log('  API Key:', XINFERENCE_API_KEY ? '已設定 (' + XINFERENCE_API_KEY.substring(0, 15) + '...)' : '❌ 未設定')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('file') as File
    const model = formData.get('model') as string || 'large-v3-turbo'
    const language = formData.get('language') as string || 'zh'
    const prompt = formData.get('prompt') as string || ''

    if (!audioFile) {
      return NextResponse.json(
        { error: '未提供音訊檔案' },
        { status: 400 }
      )
    }

    console.log('🎙️ Whisper STT 請求:')
    console.log('   模型:', model)
    console.log('   語言參數:', language, '⭐ (應輸出繁體中文)')
    console.log('   檔案名稱:', audioFile.name)
    console.log('   檔案類型:', audioFile.type)
    console.log('   檔案大小:', audioFile.size, 'bytes', `(${Math.round(audioFile.size / 1024)} KB)`)

    // 檢查檔案有效性
    if (audioFile.size === 0) {
      console.error('❌ 音訊檔案大小為 0')
      return NextResponse.json(
        { error: '音訊檔案無效（大小為 0）' },
        { status: 400 }
      )
    }

    if (audioFile.size < 1000) {
      console.warn('⚠️  音訊檔案太小:', audioFile.size, 'bytes，可能導致轉錄失敗')
    }

    console.log('🔧 使用 OpenAI SDK + OpenCC 簡繁轉換')

    const startTime = Date.now()

    // 調用 OpenAI SDK（相容 Xinference）
    // 移除 initial_prompt，讓 Whisper 正常輸出簡體
    const result = await client.audio.transcriptions.create({
      model: `whisper-${model}-mlx`,
      file: audioFile,
      language: language  // 語言識別參數
    })

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('✅ OpenAI SDK 調用成功')
    console.log(`⏱️  Whisper 處理時間: ${processingTime} 秒`)
    console.log(`📝 原始轉錄字數: ${result.text?.length || 0} 字`)
    console.log(`📄 原始內容（簡體）:`, result.text?.substring(0, 50) + '...')

    // 使用 OpenCC 簡繁轉換（簡體 → 繁體台灣）
    console.log('🔄 開始簡繁轉換...')
    const traditionalText = converter(result.text)

    console.log(`📄 轉換後內容（繁體）:`, traditionalText?.substring(0, 50) + '...')
    console.log('✅ 簡繁轉換完成！')

    // 驗證轉換結果
    const stillHasSimplified = /[\u4e00-\u9fa5]/.test(traditionalText) && (
      traditionalText.includes('这') || traditionalText.includes('们') || traditionalText.includes('说')
    )

    if (stillHasSimplified) {
      console.warn('⚠️  警告：轉換後仍有簡體字！')
    } else {
      console.log('✅ 已成功轉換為繁體中文')
    }

    return NextResponse.json({
      text: traditionalText,  // 返回繁體中文文字
      originalText: result.text,  // 保留原始簡體（供除錯）
      language: 'zh-TW',  // 標示為繁體中文
      processingTime: parseFloat(processingTime),
      model: `whisper-${model}-mlx`,
      usedSDK: 'OpenAI Client + OpenCC'
    })

  } catch (error: any) {
    console.error('❌ Whisper API 錯誤:', error)
    console.error('錯誤詳情:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.code
    })

    return NextResponse.json(
      {
        error: '語音轉文字失敗',
        details: error instanceof Error ? error.message : '未知錯誤',
        status: error?.status || 500
      },
      { status: 500 }
    )
  }
}

// 配置檔案大小限制（50 MB，符合訪視記錄場景）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
}
