import { NextRequest, NextResponse } from 'next/server'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'

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
 * 參考文檔：
 * - /Users/chih-hungtseng/projects/whisper/TEST_REPORT.md
 * - /Users/chih-hungtseng/projects/whisper/FINDINGS.md
 */

const XINFERENCE_API_URL = process.env.XINFERENCE_API_URL || 'https://tcm2studio.tzuchi-org.tw/v1'
const XINFERENCE_API_KEY = process.env.XINFERENCE_API_KEY || ''

console.log('[Whisper API] 配置載入:')
console.log('  API URL:', XINFERENCE_API_URL)
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

    // 準備轉發給 Xinference 的 FormData
    const xinferenceFormData = new FormData()
    xinferenceFormData.append('file', audioFile)
    xinferenceFormData.append('model', `whisper-${model}-mlx`)
    xinferenceFormData.append('language', language)

    if (prompt) {
      xinferenceFormData.append('prompt', prompt)
    }

    // 驗證 FormData 內容
    console.log('📤 發送到 Xinference 的參數:')
    console.log('   - model:', `whisper-${model}-mlx`)
    console.log('   - language:', language, '⭐ 關鍵參數')
    console.log('   - file size:', audioFile.size, 'bytes')

    // 重要：驗證 FormData 是否包含 language
    for (const [key, value] of xinferenceFormData.entries()) {
      if (key === 'language') {
        console.log('✅ FormData 包含 language 參數:', value)
      }
    }

    // 調用 Xinference Whisper API
    const startTime = Date.now()

    const headers: Record<string, string> = {}
    if (XINFERENCE_API_KEY) {
      headers['Authorization'] = `Bearer ${XINFERENCE_API_KEY}`
    }

    console.log('🌐 調用 Xinference API:', `${XINFERENCE_API_URL}/audio/transcriptions`)

    const response = await fetch(`${XINFERENCE_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: xinferenceFormData
    })

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Xinference API 錯誤:', response.status, errorText)

      return NextResponse.json(
        {
          error: `Xinference API 錯誤: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      )
    }

    const result = await response.json()

    console.log('✅ 轉錄完成')
    console.log(`⏱️  處理時間: ${processingTime} 秒`)
    console.log(`📝 轉錄字數: ${result.text?.length || 0} 字`)
    console.log(`🎯 請求語言參數: ${language}`)
    console.log(`🎯 Xinference 回應語言: ${result.language || '未提供'}`)
    console.log(`📄 轉錄內容預覽:`, result.text?.substring(0, 50) + '...')

    // 檢查是否為繁體中文
    const hasSimplfied = /[\u4e00-\u9fa5]/.test(result.text) && (
      result.text.includes('这') || result.text.includes('们') || result.text.includes('说')
    )
    if (hasSimplfied) {
      console.warn('⚠️  警告：輸出仍為簡體中文！language 參數可能未生效')
    }

    return NextResponse.json({
      text: result.text,
      language: result.language || language,
      duration: result.duration,
      processingTime: parseFloat(processingTime),
      model: `whisper-${model}-mlx`,
      requestedLanguage: language  // 加入請求的語言參數供除錯
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
