import { NextRequest, NextResponse } from 'next/server'
import xinferenceClient from '@/lib/xinference-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const type = formData.get('type') as string // 'front', 'back', or 'bank'

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // 檢查 OCR 服務狀態
    const serviceAvailable = await xinferenceClient.checkServiceStatus()

    if (!serviceAvailable && process.env.OCR_SERVICE_MODE !== 'mock') {
      console.warn('Xinference service not available, falling back to mock mode')
    }

    // 執行 OCR 識別
    let ocrResult
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
      default:
        return NextResponse.json(
          { error: 'Invalid OCR type. Must be: front, back, or bank' },
          { status: 400 }
        )
    }

    // 返回結果
    if (ocrResult.success) {
      return NextResponse.json({
        success: true,
        data: ocrResult.data,
        message: 'OCR processing completed',
        rawResponse: ocrResult.rawResponse
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: ocrResult.error || 'OCR processing failed',
          message: 'OCR processing failed'
        },
        { status: 500 }
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
      { status: 500 }
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
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
