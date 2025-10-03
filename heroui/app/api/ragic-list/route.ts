import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') || '50'

    const apiKey = process.env.RAGIC_API_KEY || ''
    const baseUrl = process.env.RAGIC_BASE_URL || 'https://ap11.ragic.com/TCTCharity/4-20252'

    // 查詢 Ragic 所有記錄（使用 limit 限制數量）
    const response = await fetch(
      `${baseUrl}/36?limit=${limit}&naming=EID`,
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

    // 轉換為陣列格式
    const records = Object.values(data).map((record: any) => ({
      ragicId: record._ragicId,
      village: record['1028878'],
      name: record['1028840'],
      idNumber: record['1028871'],
      cityDistrict: record['1028836'],
      villageLi: record['1028837'],
      address: record['1028839'],
      frontIdPhoto: record['1028852'],
      backIdPhoto: record['1028853'],
      householdDoc: record['1028854'],
      otherDocs: record['1028855'],
      updatedAt: record['1028882'] || record._update_date
    }))

    return NextResponse.json({
      success: true,
      records,
      total: records.length
    })

  } catch (error) {
    console.error('Ragic list error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch records'
      },
      { status: 500 }
    )
  }
}
