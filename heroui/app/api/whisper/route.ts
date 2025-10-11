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
const TEXT_PROCESSING_MODEL = process.env.TEXT_PROCESSING_MODEL || 'Qwen3-Instruct'
const TEXT_PROCESSING_ENABLED = process.env.TEXT_PROCESSING_ENABLED !== 'false'

// 建立 OpenAI Client（指向 Xinference 伺服器）
const client = new OpenAI({
  apiKey: XINFERENCE_API_KEY,
  baseURL: XINFERENCE_API_URL
})

console.log('[Whisper API] 初始化:')
console.log('  Xinference URL:', XINFERENCE_API_URL)
console.log('  API Key:', XINFERENCE_API_KEY ? '已設定' : '❌ 未設定')
console.log('  文字處理 LLM:', TEXT_PROCESSING_MODEL, TEXT_PROCESSING_ENABLED ? '✅ 啟用' : '❌ 停用')

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

    console.log('✅ Whisper 轉錄完成')
    console.log(`⏱️  Whisper 處理時間: ${processingTime} 秒`)
    console.log(`📝 原始轉錄字數: ${result.text?.length || 0} 字`)
    console.log(`📄 原始內容（簡體）:`, result.text?.substring(0, 50) + '...')

    // 如果啟用文字處理，使用 Qwen3-Instruct 優化
    let finalText = result.text

    if (TEXT_PROCESSING_ENABLED && result.text) {
      console.log('🤖 使用 Qwen3-Instruct 進行文字優化...')
      console.log('   - 簡繁轉換')
      console.log('   - 標點符號標注')
      console.log('   - 語句優化')

      const optimizationStartTime = Date.now()

      try {
        // 調用 Qwen3-Instruct 優化文字
        const optimizationResult = await client.chat.completions.create({
          model: TEXT_PROCESSING_MODEL,
          messages: [
            {
              role: 'system',
              content: '你是專業的文字編輯助手。請將簡體中文轉換為繁體中文（台灣用語），並標注適當的標點符號，優化語句通順度。保持原意，不要增減內容。'
            },
            {
              role: 'user',
              content: `請優化以下語音轉錄文字：\n\n${result.text}`
            }
          ],
          temperature: 0.3,  // 較低溫度確保準確轉換
          max_tokens: 4000
        })

        finalText = optimizationResult.choices[0]?.message?.content || result.text

        const optimizationTime = ((Date.now() - optimizationStartTime) / 1000).toFixed(2)
        console.log(`✅ Qwen3 文字優化完成（${optimizationTime} 秒）`)
        console.log(`📄 優化後內容:`, finalText.substring(0, 50) + '...')

      } catch (optimizationError) {
        console.error('❌ 文字優化失敗，返回原始轉錄:', optimizationError)
        // 失敗時返回原始簡體文字
      }
    }

    const totalProcessingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      text: finalText,  // 返回優化後的繁體中文
      originalText: result.text,  // 保留原始簡體
      language: 'zh-TW',
      processingTime: parseFloat(totalProcessingTime),
      whisperTime: parseFloat(processingTime),
      model: `whisper-${model}-mlx`,
      textProcessor: TEXT_PROCESSING_ENABLED ? TEXT_PROCESSING_MODEL : null,
      usedSDK: TEXT_PROCESSING_ENABLED ? 'OpenAI Client + Qwen3-Instruct' : 'OpenAI Client'
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
