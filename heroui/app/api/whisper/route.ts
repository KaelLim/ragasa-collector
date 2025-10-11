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

    // 使用 initial_prompt 強制繁體中文輸出
    const traditionalChinesePrompt = "請以繁體中文輸出下方語音內容。"
    console.log('💡 使用 initial_prompt 強制繁體中文:', traditionalChinesePrompt)

    const startTime = Date.now()

    // 調用 OpenAI SDK（相容 Xinference）
    const result = await client.audio.transcriptions.create({
      model: `whisper-${model}-mlx`,
      file: audioFile,
      language: language,  // ⭐ 繁體中文輸出的關鍵參數
      prompt: prompt || traditionalChinesePrompt  // ⭐⭐ 強制繁體中文的提示詞
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
      language: language,
      processingTime: parseFloat(processingTime),
      model: `whisper-${model}-mlx`,
      usedSDK: 'OpenAI Client'
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
