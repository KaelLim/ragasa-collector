import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ragicId = searchParams.get('id')

    if (!ragicId) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      )
    }

    const apiKey = process.env.RAGIC_API_KEY || ''
    const baseUrl = process.env.RAGIC_BASE_URL || 'https://ap11.ragic.com/TCTCharity/4-20252'

    // 查詢 Ragic 單筆記錄
    const response = await fetch(
      `${baseUrl}/36/${ragicId}?naming=EID`,
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

    // 取得記錄（Ragic 返回的是包含 ID 的物件）
    const record = data[ragicId]

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }

    // 轉換為統一格式
    const result = {
      ragicId: record._ragicId,
      village: record['1028878'],
      name: record['1028840'],
      idNumber: record['1028871'],
      cityDistrict: record['1028836'],
      villageLi: record['1028837'],
      address: record['1028839'],
      cityDistrict2: record['1028875'],
      villageLi2: record['1028876'],
      address2: record['1028877'],
      frontIdPhoto: record['1028852'],
      backIdPhoto: record['1028853'],
      householdDoc: record['1028854'],
      otherDocs: record['1028855'],
      updatedAt: record['1028882'] || record._update_date,
      createdAt: record._create_date
    }

    console.log('🔍 Ragic Detail API - otherDocs:', {
      ragicId,
      otherDocs: record['1028855'],
      type: typeof record['1028855'],
      isArray: Array.isArray(record['1028855'])
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Ragic detail error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch record'
      },
      { status: 500 }
    )
  }
}
