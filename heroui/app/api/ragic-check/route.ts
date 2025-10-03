import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const villageId = searchParams.get('village')

    if (!villageId) {
      return NextResponse.json(
        { error: 'Missing village parameter' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RAGIC_API_KEY || ''
    const baseUrl = process.env.RAGIC_BASE_URL || 'https://ap11.ragic.com/TCTCharity/4-20252'

    // 查詢 Ragic 該編號是否存在
    const response = await fetch(
      `${baseUrl}/36?where=1028878,eq,${villageId}&naming=EID`,
      {
        headers: {
          'Authorization': `Basic ${apiKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Ragic API error: ${response.status}`)
    }

    const data = await response.json()

    // 如果返回的物件有資料，表示該編號已存在
    const exists = Object.keys(data).length > 0

    return NextResponse.json({
      exists,
      villageId,
      data: exists ? data : null
    })

  } catch (error) {
    console.error('Ragic check error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Check failed'
      },
      { status: 500 }
    )
  }
}
