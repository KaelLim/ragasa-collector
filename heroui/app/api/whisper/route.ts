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

console.log('[Whisper API] 初始化:')
console.log('  Xinference URL:', XINFERENCE_API_URL)
console.log('  API Key:', XINFERENCE_API_KEY ? '已設定' : '❌ 未設定')
console.log('  文字處理 LLM:', TEXT_PROCESSING_MODEL, TEXT_PROCESSING_ENABLED ? '✅ 啟用' : '❌ 停用')

export async function POST(request: NextRequest) {
  // 每次請求建立新的 OpenAI Client（避免 session 衝突）
  const client = new OpenAI({
    apiKey: XINFERENCE_API_KEY,
    baseURL: XINFERENCE_API_URL
  })

  console.log('🔄 已建立新的 OpenAI Client 實例')
  try {
    const formData = await request.formData()
    const audioFile = formData.get('file') as File
    const model = formData.get('model') as string || 'large-v3-turbo'
    const language = formData.get('language') as string || 'zh'
    const prompt = formData.get('prompt') as string || ''
    const householdData = formData.get('householdData') as string || ''  // 戶口名簿資料（JSON）

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
    let correctionNotes = ''  // 在外層定義

    if (TEXT_PROCESSING_ENABLED && result.text) {
      console.log('🤖 使用 Qwen3-Instruct 進行文字優化...')
      console.log('   - 簡繁轉換（台灣用語）')
      console.log('   - 標點符號標注')
      console.log('   - 數字轉中文')
      console.log('   - 錯別字校正')
      if (householdData) {
        console.log('   - 比對戶口名簿資料')
      }

      const optimizationStartTime = Date.now()

      try {
        // 建立完整的系統提示詞（慈濟文字編輯規範）
        const systemPrompt = `# 角色與背景
我是一位在慈濟服務多年的資深文字編輯，主要負責整理逐字稿。我們採用臺灣的繁體中文進行所有文字編輯工作，注重文字的精確性和一致性。

# 工作目標
1. 將文稿中的阿拉伯數字轉換為正體中文數字
2. 根據提供的一般詞庫進行專業用語的統一校正
3. 根據提供的事件描述，對逐字稿進行修潤和錯別字校正
${householdData ? '4. 比對戶口名簿資料，遇到人名等相似字時以戶口名簿為準' : ''}

# 具體要求

## 數字轉換規則
需要將所有出現的阿拉伯數字[0-9]轉換為對應的中文數字：
- 0 → 零
- 1 → 一
- 2 → 二
- 3 → 三
- 4 → 四
- 5 → 五
- 6 → 六
- 7 → 七
- 8 → 八
- 9 → 九

# 輸出格式要求
1. 校正後的文稿應保持原有的段落結構
2. 原稿經和事件摘要比對後發現錯字，依事件摘要文準，要替換正確的字
3. 原稿除增加錯字修正及字詞替換建議，應盡力保持原文逐字呈現，不要摘要，也不要整理

**重要：輸出格式**
請用以下格式輸出：

[正文內容在此]

---
校正說明：
- [列出所有修正項目]
- [例如：「王小螢」修正為「王小瑩」（比對戶口名簿）]
- [例如：數字「123」轉換為「一二三」]

# 品質檢查重點
1. 確保所有數字都已正確轉換
2. 詞彙替換後的文意通順

# 注意事項
1. 保持文稿的原意不變
2. 注意上下文的連貫性
3. 遇到特殊情況應做標註說明
4. 需要特別注意日期、時間等數字的處理原則`

        // 建立用戶訊息
        let userMessage = `請依照上述規範，優化以下語音轉錄文字：\n\n${result.text}`

        // 如果有戶口名簿資料，加入參考
        if (householdData) {
          try {
            const household = JSON.parse(householdData)
            userMessage += `\n\n---\n參考資料（戶口名簿）：\n`

            // 戶籍地址
            if (household.header?.address) {
              userMessage += `戶籍地址：${household.header.address}\n`
            }

            // 戶長姓名
            if (household.householdHead?.name) {
              userMessage += `戶長姓名：${household.householdHead.name}\n`
            }

            // 成員姓名
            if (household.members && household.members.length > 0) {
              userMessage += `成員姓名：${household.members.map((m: any) => m.name).join('、')}\n`
            }

            userMessage += `\n請注意：如轉錄文字中出現下列資訊，請以戶口名簿為準：\n`
            userMessage += `- 地址：請核對是否與戶籍地址一致\n`
            userMessage += `- 姓名：注意相似字（如瑩/螢、燕/艷、鴻/洪等）\n`
            userMessage += `- 地名：村名、路名等地理資訊`
          } catch (e) {
            console.warn('⚠️  戶口名簿資料解析失敗')
          }
        }

        // 調用 Qwen3-Instruct 優化文字
        const optimizationResult = await client.chat.completions.create({
          model: TEXT_PROCESSING_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.3,  // 較低溫度確保準確轉換
          max_tokens: 4000
        })

        const qwenOutput = optimizationResult.choices[0]?.message?.content || result.text

        // 分離正文和校正說明
        // Qwen3 可能會用「---」或「校正說明：」等標記分隔
        let mainText = qwenOutput

        // 嘗試分離校正說明
        const separators = ['---\n校正說明', '---\n修正說明', '---\n編輯說明', '\n\n校正說明：', '\n\n修正說明：']
        for (const separator of separators) {
          if (qwenOutput.includes(separator)) {
            const parts = qwenOutput.split(separator)
            mainText = parts[0].trim()
            correctionNotes = (separator + parts.slice(1).join(separator)).trim()
            console.log('✂️  已分離正文和校正說明')
            break
          }
        }

        finalText = mainText  // 僅正文存入系統

        const optimizationTime = ((Date.now() - optimizationStartTime) / 1000).toFixed(2)
        console.log(`✅ Qwen3 文字優化完成（${optimizationTime} 秒）`)
        console.log(`📄 正文內容:`, finalText.substring(0, 50) + '...')
        if (correctionNotes) {
          console.log(`📝 校正說明:`, correctionNotes.substring(0, 50) + '...')
        }

      } catch (optimizationError) {
        console.error('❌ 文字優化失敗，返回原始轉錄:', optimizationError)
        // 失敗時返回原始簡體文字
      }
    }

    const totalProcessingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    return NextResponse.json({
      text: finalText,  // 返回優化後的繁體中文（正文）
      correctionNotes: correctionNotes || '',  // 校正說明（分離顯示）
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
