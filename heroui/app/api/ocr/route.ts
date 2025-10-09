import { NextRequest, NextResponse } from 'next/server'
import xinferenceClient from '@/lib/xinference-client'
import { cropImageFromFile } from '@/lib/image-crop-utils'

// Next.js 15 API Route 配置
export const runtime = 'nodejs'
export const maxDuration = 120 // 120 秒

// CORS 標頭（允許本地測試工具訪問）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// 處理 OPTIONS 預檢請求
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const type = formData.get('type') as string // 'front', 'back', 'bank', or 'household'
    const segmentIndex = formData.get('segmentIndex') ? parseInt(formData.get('segmentIndex') as string) : undefined

    console.log('OCR 請求參數:', { type, segmentIndex, hasImage: !!image })

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 檢查 OCR 服務狀態
    const serviceAvailable = await xinferenceClient.checkServiceStatus()

    if (!serviceAvailable && process.env.OCR_SERVICE_MODE !== 'mock') {
      console.warn('Xinference service not available, falling back to mock mode')
    }

    // 執行 OCR 識別
    let ocrResult
    let processingTime = 0
    const startTime = Date.now()

    switch (type) {
      case 'front':
        ocrResult = await xinferenceClient.recognizeIdCardFront(image)
        break
      case 'back':
        ocrResult = await xinferenceClient.recognizeIdCardBack(image)
        break
      case 'bank':
        ocrResult = await xinferenceClient.recognizeBankBook(image)
        break
      case 'household-header':
        // 智能判斷是否需要切割
        const imageSizeKB = image.size / 1024
        console.log(`📷 處理戶口名簿表頭圖片...`)
        console.log(`   原始圖片: ${image.name}, 大小: ${imageSizeKB.toFixed(1)} KB, 類型: ${image.type}`)

        let headerImage = image

        // 只有當圖片大於 200KB 時才切割（避免重複切割）
        if (imageSizeKB > 200) {
          console.log(`   🔪 圖片較大，執行切割優化...`)
          const croppedHeaderBlob = await cropImageFromFile(image, 'household-header')
          console.log(`   ✅ 切割完成，大小: ${(croppedHeaderBlob.size / 1024).toFixed(1)} KB`)
          headerImage = new File([croppedHeaderBlob], image.name, { type: image.type || 'image/jpeg' })
        } else {
          console.log(`   ℹ️  圖片已較小，跳過切割步驟`)
        }

        console.log(`🔍 準備進行 OCR 辨識...`)
        ocrResult = await xinferenceClient.recognizeHouseholdHeader(headerImage)
        processingTime = Date.now() - startTime
        console.log(`⏱️  表頭 OCR 處理時間: ${(processingTime / 1000).toFixed(1)} 秒`)
        console.log(`📋 OCR 結果:`, JSON.stringify(ocrResult.data, null, 2))
        break
      case 'household':
        // segmentIndex: 0=全體成員, 1=戶長, 2-6=其他成員
        const validSegmentIndex = typeof segmentIndex === 'number' && segmentIndex >= 0 && segmentIndex <= 6

        if (!validSegmentIndex) {
          return NextResponse.json(
            { error: `Invalid segmentIndex: ${segmentIndex}. Must be 0-6 (0=全體, 1=戶長, 2-6=成員)` },
            { status: 400, headers: corsHeaders }
          )
        }

        ocrResult = await xinferenceClient.recognizeHouseholdSegment(image, segmentIndex)
        break
      case 'household-layout':
        // 分析戶口名簿文件佈局結構
        console.log('📐 開始分析戶口名簿文件佈局...')
        ocrResult = await xinferenceClient.analyzeHouseholdLayout(image)
        processingTime = Date.now() - startTime
        console.log(`⏱️  佈局分析處理時間: ${(processingTime / 1000).toFixed(1)} 秒`)
        if (ocrResult.success) {
          console.log(`📋 佈局分析結果:`, JSON.stringify(ocrResult.data, null, 2))
        }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid OCR type. Must be: front, back, bank, household-header, household, or household-layout' },
          { status: 400, headers: corsHeaders }
        )
    }

    // 返回結果
    if (ocrResult.success) {
      return NextResponse.json({
        success: true,
        data: ocrResult.data,
        message: 'OCR processing completed',
        processingTime: processingTime > 0 ? processingTime : undefined,
        rawResponse: ocrResult.rawResponse // 可選：包含原始回應供調試
      }, { headers: corsHeaders })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: ocrResult.error || 'OCR processing failed',
          message: 'OCR processing failed'
        },
        { status: 500, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// 健康檢查端點
export async function GET() {
  try {
    const serviceStatus = await xinferenceClient.checkServiceStatus()
    const mode = process.env.OCR_SERVICE_MODE || 'xinference'

    return NextResponse.json({
      status: 'ok',
      service: 'OCR API',
      mode: mode,
      xinferenceAvailable: serviceStatus,
      apiUrl: process.env.XINFERENCE_API_URL || 'http://localhost:9997/v1',
      modelId: process.env.XINFERENCE_MODEL_ID || 'qwen2.5-vl-instruct'
    }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders })
  }
}