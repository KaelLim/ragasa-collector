import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const village = formData.get('village') as string
    const dataStr = formData.get('data') as string
    const ragicId = formData.get('ragicId') as string | null

    if (!village || !dataStr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const data = JSON.parse(dataStr)

    // 準備 Ragic FormData
    const ragicFormData = new FormData()

    // 1. 樺加沙編號
    ragicFormData.append('1028878', village)

    // 2. 基本資料
    if (data.victim_name) ragicFormData.append('1028840', data.victim_name)
    if (data.id_number) ragicFormData.append('1028871', data.id_number)

    // 3. 身分證地址
    if (data.id_city_district) ragicFormData.append('1028836', data.id_city_district)
    if (data.id_village_li) ragicFormData.append('1028837', data.id_village_li)
    if (data.id_address) ragicFormData.append('1028839', data.id_address)

    // 4. 戶籍謄本地址
    if (data.household_city_district) ragicFormData.append('1028875', data.household_city_district)
    if (data.household_village_li) ragicFormData.append('1028876', data.household_village_li)
    if (data.household_address) ragicFormData.append('1028877', data.household_address)

    // 5. 圖片檔案
    const frontIdPhoto = formData.get('front_id_photo')
    if (frontIdPhoto) ragicFormData.append('1028852', frontIdPhoto, 'front_id.jpg')

    const backIdPhoto = formData.get('back_id_photo')
    if (backIdPhoto) ragicFormData.append('1028853', backIdPhoto, 'back_id.jpg')

    const householdDoc = formData.get('household_doc_photo')
    if (householdDoc) ragicFormData.append('1028854', householdDoc, 'household.jpg')

    // 6. 其他佐證資料（包含簽名和附加文件）
    // 簽名
    const signature = formData.get('signature')
    if (signature) {
      ragicFormData.append('1028855', signature, 'signature.png')
    }

    // 附加文件
    let index = 0
    while (true) {
      const file = formData.get(`addons_docs_${index}`)
      const name = formData.get(`addons_docs_${index}_name`)
      if (!file || !name) break

      const filename = `${name}.jpg`
      ragicFormData.append('1028855', file, filename)
      index++
    }

    // 7. 必要參數
    ragicFormData.append('api', '')
    ragicFormData.append('v', '3')

    // 8. POST 到 Ragic
    const apiKey = process.env.RAGIC_API_KEY || ''
    const baseUrl = process.env.RAGIC_BASE_URL || 'https://ap11.ragic.com/TCTCharity/4-20252'
    const url = ragicId ? `${baseUrl}/36/${ragicId}` : `${baseUrl}/36`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`
      },
      body: ragicFormData
    })

    if (!response.ok) {
      throw new Error(`Ragic API 回應錯誤: ${response.status}`)
    }

    const result = await response.json()

    if (result.status === 'SUCCESS') {
      return NextResponse.json({
        success: true,
        ragicId: result.ragicId
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.msg || 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Ragic sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      },
      { status: 500 }
    )
  }
}
