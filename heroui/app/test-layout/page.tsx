'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'

interface LayoutRegion {
  type: string
  index: number
  yStart: number
  yEnd: number
  description: string
}

interface SegmentData {
  index: number
  type: string
  label: string
  base64: string
  width: number
  height: number
  yStart: number
  yEnd: number
  size: number
}

export default function TestLayoutPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [layoutResult, setLayoutResult] = useState<any>(null)
  const [segments, setSegments] = useState<SegmentData[]>([])
  const [analysisTime, setAnalysisTime] = useState<number>(0)

  // 步驟 1: 上傳圖片
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setLayoutResult(null)
    setSegments([])
    console.log('📷 已上傳圖片:', file.name)
  }

  // 壓縮圖片以加速佈局分析
  const compressImage = async (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const width = Math.floor(img.width * scale)
        const height = Math.floor(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) {
              const compressed = new File([blob], file.name, { type: 'image/jpeg' })
              const originalKB = (file.size / 1024).toFixed(1)
              const compressedKB = (compressed.size / 1024).toFixed(1)
              console.log(`🗜️  壓縮: ${originalKB} KB → ${compressedKB} KB (${width}x${height})`)
              resolve(compressed)
            } else {
              reject(new Error('壓縮失敗'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('圖片載入失敗'))
      }
      img.src = url
    })
  }

  // 步驟 2: Vision LLM 分析
  const handleAnalyze = async () => {
    if (!uploadedFile) return

    setIsAnalyzing(true)
    const startTime = Date.now()

    try {
      console.log('📐 開始 Vision LLM 佈局分析（使用原圖保證準確度）...')

      const formData = new FormData()
      formData.append('image', uploadedFile)
      formData.append('type', 'household-layout')

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      const time = Date.now() - startTime
      setAnalysisTime(time)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Vision LLM 分析結果:', result)

      if (result.success && result.data) {
        setLayoutResult(result.data)
        alert(`✅ Vision LLM 分析完成！\n耗時: ${(time / 1000).toFixed(1)} 秒\n識別到 ${result.data.regions.length} 個區域`)
      } else {
        throw new Error(result.error || '分析失敗')
      }
    } catch (error) {
      console.error('❌ 分析錯誤:', error)
      alert('❌ Vision LLM 分析失敗:\n' + (error as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 步驟 2B: 使用固定數值直接切割
  const handleCutWithStandard = async () => {
    if (!uploadedFile) return

    try {
      console.log('✂️ 使用固定數值切割（v3.0）...')

      // 固定數值配置 v3.0
      const standardRegions: LayoutRegion[] = [
        { type: 'header', index: 0, yStart: 0, yEnd: 0.21, description: '表頭區域（戶號、地址等）' },
        { type: 'household-head', index: 1, yStart: 0.21, yEnd: 0.34, description: '戶長資料' },
        { type: 'member', index: 2, yStart: 0.34, yEnd: 0.445, description: '成員1資料' },
        { type: 'member', index: 3, yStart: 0.445, yEnd: 0.55, description: '成員2資料' },
        { type: 'member', index: 4, yStart: 0.55, yEnd: 0.655, description: '成員3資料' },
        { type: 'member', index: 5, yStart: 0.655, yEnd: 0.76, description: '成員4資料' },
        { type: 'footer', index: 6, yStart: 0.76, yEnd: 1, description: '頁腳資訊' }
      ]

      const img = await loadImage(uploadedFile)
      const segmentsData = await segmentImageByLayout(img, standardRegions)

      setSegments(segmentsData)
      console.log('✅ 固定數值切割完成！')
      console.log('📊 表頭 21% + 戶長 13% + 成員 10.5%×4 + 頁腳 24% = 100%')
    } catch (error) {
      console.error('❌ 切割錯誤:', error)
      alert('❌ 切割失敗:\n' + (error as Error).message)
    }
  }

  // 步驟 3: 根據分析結果切割
  const handleCut = async () => {
    if (!uploadedFile || !layoutResult) return

    try {
      console.log('✂️ 開始根據 Vision LLM 分析結果切割圖片...')

      const img = await loadImage(uploadedFile)
      const segmentsData = await segmentImageByLayout(img, layoutResult.regions)

      setSegments(segmentsData)
      console.log('✅ 切割完成，請檢查每個切片！')
    } catch (error) {
      console.error('❌ 切割錯誤:', error)
      alert('❌ 切割失敗:\n' + (error as Error).message)
    }
  }

  // 步驟 4: 保存配置
  const handleSaveConfig = () => {
    if (!layoutResult) return

    const config = {
      name: "台灣戶口名簿標準佈局",
      version: "2.0",
      description: "戶口名簿標準切割比例配置（基於 Vision LLM 分析結果，已人工驗證）",
      lastUpdated: new Date().toISOString().split('T')[0],
      verifiedBy: "人工確認",
      regions: layoutResult.regions,
      totalRows: layoutResult.totalRows,
      hasTableBorders: layoutResult.hasTableBorders,
      notes: [
        "此配置已通過實際戶口名簿測試驗證",
        "經過 Vision LLM 分析並人工確認",
        `驗證日期: ${new Date().toISOString().split('T')[0]}`
      ]
    }

    const jsonStr = JSON.stringify(config, null, 2)
    navigator.clipboard.writeText(jsonStr)
    alert('✅ 配置已複製到剪貼簿！\n請將此 JSON 內容貼給 Claude')
    console.log('配置 JSON:', jsonStr)
  }

  // 工具函數
  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = reject
      img.src = url
    })
  }

  const segmentImageByLayout = async (
    img: HTMLImageElement,
    regions: LayoutRegion[]
  ): Promise<SegmentData[]> => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const segments: SegmentData[] = []
    const ocrRegions = regions.filter(r => r.type !== 'footer')

    for (const region of ocrRegions) {
      const y = Math.floor(img.height * region.yStart)
      const h = Math.floor(img.height * (region.yEnd - region.yStart))

      const base64 = cropToBase64(canvas, 0, y, img.width, h)
      const base64Size = Math.round((base64.length * 3) / 4 / 1024)

      segments.push({
        index: region.index,
        type: region.type,
        label: region.description,
        base64,
        width: img.width,
        height: h,
        yStart: region.yStart,
        yEnd: region.yEnd,
        size: base64Size
      })
    }

    return segments
  }

  const cropToBase64 = (
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
    quality: number = 0.9
  ): string => {
    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = width
    cropCanvas.height = height
    const ctx = cropCanvas.getContext('2d')!
    ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height)
    return cropCanvas.toDataURL('image/jpeg', quality)
  }

  const downloadSegment = (index: number) => {
    const seg = segments[index]
    const link = document.createElement('a')
    link.href = seg.base64
    link.download = `segment-${index}-${seg.type}.jpg`
    link.click()
  }

  const testOCR = async (index: number) => {
    const seg = segments[index]

    try {
      const blob = base64ToBlob(seg.base64)
      const formData = new FormData()
      formData.append('image', blob, `segment-${index}.jpg`)

      if (seg.type === 'header') {
        formData.append('type', 'household-header')
      } else {
        formData.append('type', 'household')
        formData.append('segmentIndex', String(index))
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      console.log(`OCR 結果 (${index}):`, result)

      if (result.success) {
        alert(`✅ OCR 成功！\n\n結果:\n${JSON.stringify(result.data, null, 2)}`)
      } else {
        alert(`❌ OCR 失敗:\n${result.error}`)
      }
    } catch (error) {
      alert('❌ OCR 測試失敗:\n' + (error as Error).message)
    }
  }

  const base64ToBlob = (base64: string): Blob => {
    const arr = base64.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">🔍 Vision LLM 佈局分析測試工具</h1>
      <p className="text-default-500 mb-8">
        步驟 1: 上傳 → 步驟 2: Vision LLM 分析 → 步驟 3: 切割 → 步驟 4: 驗證 → 步驟 5: 保存配置
      </p>

      {/* 步驟 1: 上傳 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold">步驟 1: 上傳戶口名簿圖片</h2>
        </CardHeader>
        <CardBody>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="block w-full text-sm text-default-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary-600"
          />
        </CardBody>
      </Card>

      {/* 步驟 2: 選擇測試方式 */}
      {uploadedFile && !layoutResult && segments.length === 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">步驟 2: 選擇測試方式</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                color="success"
                size="lg"
                onClick={handleCutWithStandard}
                className="h-auto py-4"
              >
                <div className="text-left w-full">
                  <div className="font-bold mb-1">✅ 使用固定數值切割（推薦）</div>
                  <div className="text-xs opacity-90">
                    表頭 21% + 戶長 13% + 成員 10.5%×4 + 頁腳 24%
                  </div>
                </div>
              </Button>
              <Button
                color="primary"
                size="lg"
                onClick={handleAnalyze}
                isLoading={isAnalyzing}
                className="h-auto py-4"
              >
                <div className="text-left w-full">
                  <div className="font-bold mb-1">🤖 Vision LLM 分析（測試用）</div>
                  <div className="text-xs opacity-90">
                    約 70 秒，結果不穩定
                  </div>
                </div>
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 步驟 3: 分析結果 */}
      {layoutResult && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">步驟 3: Vision LLM 分析結果</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="bg-default-100 p-4 rounded-lg">
              <p className="text-sm mb-2">
                ⏱️ 分析時間: <strong>{(analysisTime / 1000).toFixed(1)} 秒</strong>
              </p>
              <p className="text-sm mb-2">
                📋 識別區域: <strong>{layoutResult.regions.length} 個</strong>
              </p>
              <pre className="text-xs bg-default-900 text-default-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(layoutResult, null, 2)}
              </pre>
            </div>
            <Button
              color="success"
              size="lg"
              onClick={handleCut}
              className="w-full"
            >
              ✂️ 根據分析結果切割圖片
            </Button>
          </CardBody>
        </Card>
      )}

      {/* 步驟 4: 切片預覽 */}
      {segments.length > 0 && (
        <>
          <Card className="mb-6 border-2 border-warning">
            <CardBody>
              <p className="text-warning text-sm">
                ⚠️ <strong>請仔細檢查每個切片</strong><br />
                特別注意「1. 戶長資料」切片是否包含完整的戶長那一列！
              </p>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {segments.map((seg) => (
              <Card key={seg.index} className="shadow-lg">
                <CardHeader className={`${
                  seg.type === 'header' ? 'bg-pink-500' :
                  seg.type === 'householdHead' ? 'bg-blue-500' :
                  'bg-green-500'
                } text-white`}>
                  <div>
                    <h3 className="text-lg font-semibold">{seg.index}. {seg.label}</h3>
                    <p className="text-sm opacity-90">
                      類型: {seg.type} | 範圍: {(seg.yStart * 100).toFixed(1)}% - {(seg.yEnd * 100).toFixed(1)}%
                    </p>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  <img
                    src={seg.base64}
                    alt={seg.label}
                    className="w-full border-2 border-default-200 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-default-100 p-2 rounded">
                      <div className="text-default-500">圖片尺寸</div>
                      <div className="font-semibold">{seg.width} × {seg.height} px</div>
                    </div>
                    <div className="bg-default-100 p-2 rounded">
                      <div className="text-default-500">Base64 大小</div>
                      <div className="font-semibold">{seg.size} KB</div>
                    </div>
                    <div className="bg-default-100 p-2 rounded">
                      <div className="text-default-500">垂直範圍</div>
                      <div className="font-semibold">{(seg.yStart * 100).toFixed(1)}% - {(seg.yEnd * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-default-100 p-2 rounded">
                      <div className="text-default-500">高度佔比</div>
                      <div className="font-semibold">{((seg.yEnd - seg.yStart) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      color="success"
                      size="sm"
                      className="flex-1"
                      onClick={() => downloadSegment(seg.index)}
                    >
                      💾 下載
                    </Button>
                    <Button
                      color="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => testOCR(seg.index)}
                    >
                      🤖 測試 OCR
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* 步驟 5: 保存配置 */}
          <Card className="border-2 border-success">
            <CardBody className="text-center">
              <Button
                color="success"
                size="lg"
                onClick={handleSaveConfig}
                className="w-full max-w-md mx-auto"
              >
                💾 切割正確，保存此配置為標準
              </Button>
              <p className="text-sm text-default-500 mt-3">
                配置會自動複製到剪貼簿，請貼給 Claude 更新配置文件
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
