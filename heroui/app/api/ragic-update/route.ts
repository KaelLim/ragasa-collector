import { NextRequest, NextResponse } from 'next/server'
import { ragicClient } from '@/lib/ragic-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ragicId, village, data, documents } = body

    if (!ragicId || !village || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 更新到 Ragic（使用現有的 sync 方法，但會 POST 到指定 ID）
    const result = await ragicClient.syncApplicationToRagic(village, data, documents, ragicId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        ragicId: result.ragicId
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Ragic update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      },
      { status: 500 }
    )
  }
}
