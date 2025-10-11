import { NextRequest, NextResponse } from 'next/server'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import { OpenAI } from 'openai'

// 載入 .env.stt 配置（Whisper STT 專用）
dotenvConfig({ path: path.join(process.cwd(), '.env.stt') })

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
    console.log('   檔案:', audioFile.name, `(${Math.round(audioFile.size / 1024)} KB)`)

    // 使用 OpenAI Client SDK（Xinference 相容模式）
    console.log('🔧 使用 OpenAI Client SDK 調用 Xinference')

    const startTime = Date.now()

    // 直接使用 File 物件（Next.js FormData 已經是 File 類型）
    console.log('📤 準備調用 Xinference:')
    console.log('   - 模型:', `whisper-${model}-mlx`)
    console.log('   - 語言:', language)
    console.log('   - 檔案:', audioFile.name, '類型:', audioFile.type)

    // 調用 OpenAI SDK（相容 Xinference）
    const result = await client.audio.transcriptions.create({
      model: `whisper-${model}-mlx`,
      file: audioFile,  // 直接使用 File 物件
      language: language,  // ⭐ 繁體中文輸出的關鍵參數
      ...(prompt ? { prompt } : {})
    })

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('✅ OpenAI SDK 調用成功')

    console.log('✅ 轉錄完成')
    console.log(`⏱️  處理時間: ${processingTime} 秒`)
    console.log(`📝 轉錄字數: ${result.text?.length || 0} 字`)
    console.log(`🎯 請求語言參數: ${language}`)
    console.log(`📄 轉錄內容預覽:`, result.text?.substring(0, 50) + '...')

    // 檢查是否為繁體中文
    const hasSimplified = /[\u4e00-\u9fa5]/.test(result.text) && (
      result.text.includes('这') || result.text.includes('们') || result.text.includes('说') ||
      result.text.includes('现在') || result.text.includes('还是')
    )

    if (hasSimplified) {
      console.warn('⚠️  警告：輸出仍為簡體中文！')
      console.warn('   可能原因：伺服器端模型配置或 language 參數處理問題')
    } else {
      console.log('✅ 成功輸出繁體中文！')
    }

    return NextResponse.json({
      text: result.text,
      language: language,  // OpenAI SDK 不返回 language，使用請求值
      processingTime: parseFloat(processingTime),
      model: `whisper-${model}-mlx`,
      usedSDK: 'OpenAI Client'  // 標示使用 SDK
    })

  } catch (error) {
    console.error('❌ Whisper API 錯誤:', error)

    return NextResponse.json(
      {
        error: '語音轉文字失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
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
