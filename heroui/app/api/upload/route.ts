import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v7 as uuidv7 } from 'uuid'

export const dynamic = 'force-dynamic'

// 確保上傳目錄存在
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
    // 建立子目錄
    await mkdir(path.join(UPLOAD_DIR, 'front_id'), { recursive: true })
    await mkdir(path.join(UPLOAD_DIR, 'back_id'), { recursive: true })
    await mkdir(path.join(UPLOAD_DIR, 'household_doc'), { recursive: true })
    await mkdir(path.join(UPLOAD_DIR, 'signature'), { recursive: true })
    await mkdir(path.join(UPLOAD_DIR, 'addons_docs'), { recursive: true })
  } catch (error) {
    console.error('建立上傳目錄失敗:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string
    const customName = formData.get('customName') as string | null

    if (!file || !folder) {
      return NextResponse.json(
        { error: 'Missing file or folder parameter' },
        { status: 400 }
      )
    }

    // 取得檔案副檔名
    const fileExt = file.type === 'image/png' ? 'png' : 'jpg'

    let fileName: string
    if (customName) {
      // 附加文件：使用自訂名稱（URL encode）
      const encodedName = encodeURIComponent(customName)
      fileName = `${encodedName}.${fileExt}`
    } else {
      // 其他文件：使用 UUID v7
      const uniqueId = uuidv7()
      fileName = `${uniqueId}.${fileExt}`
    }

    // 完整路徑
    const filePath = path.join(UPLOAD_DIR, folder, fileName)

    // 將檔案寫入檔案系統
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 回傳相對路徑（用於資料庫儲存和網頁存取）
    const relativePath = `/uploads/${folder}/${fileName}`

    return NextResponse.json({
      success: true,
      path: relativePath
    })

  } catch (error) {
    console.error('檔案上傳失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    )
  }
}
