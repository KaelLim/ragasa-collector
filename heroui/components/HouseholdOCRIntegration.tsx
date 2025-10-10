'use client'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Progress } from '@heroui/progress'
import { Chip } from '@heroui/chip'
import { useTranslation } from 'react-i18next'
import { useState, useRef } from 'react'
// PDF 切割功能暫時註解（直接使用圖片上傳）
// import { usePDFSegmentation } from '@/hooks/usePDFSegmentation'
import { useHouseholdOCR } from '@/hooks/useHouseholdOCR'
import type { HouseholdDataJSON, HouseholdHeader } from './HouseholdRegistration'
import HouseholdRegistration from './HouseholdRegistration'
import { segmentHouseholdImage, getSegmentBlob, type ImageSegment } from '@/utils/imageSegmentation'
import CameraCapture from './CameraCapture'
import LayoutPreview from './LayoutPreview'
import { getLayoutAnalyzer, type LayoutRegion } from '@/lib/layout-analyzer'
import { uploadToTemp, downloadFromStorage, type FileType } from '@/lib/storage-helpers'

interface HouseholdOCRIntegrationProps {
  sessionUuid: string  // 表單會話 UUID7
  onDataChange?: (data: HouseholdDataJSON) => void
  onDocumentsChange?: (hasDocuments: boolean) => void
  onScanStarted?: () => void  // 點擊「完成掃描」時立即調用
  setIsProcessingOCR?: (isProcessing: boolean) => void
  setOCRMessage?: (message: string) => void
}

export default function HouseholdOCRIntegration({
  sessionUuid,
  onDataChange,
  onDocumentsChange,
  onScanStarted,
  setIsProcessingOCR,
  setOCRMessage
}: HouseholdOCRIntegrationProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDF 分割功能暫時註解（提供假資料避免 UI 錯誤）
  const pages: any[] = []
  const currentPage = 0
  const totalPages = 0
  const isPDFProcessing = false
  const pdfError: string | null = null
  // const {
  //   pages,
  //   currentPage,
  //   totalPages,
  //   isProcessing: isPDFProcessing,
  //   error: pdfError,
  //   selectPDFFile,
  //   addNextPage,
  //   reset: resetPDF,
  // } = usePDFSegmentation()

  // OCR 處理狀態
  const {
    processAllSegments,
    progress,
    errors: ocrErrors,
    isProcessing: isOCRProcessing,
    isCompleted: isOCRCompleted,
  } = useHouseholdOCR()

  // 戶口名簿資料
  const [householdData, setHouseholdData] = useState<HouseholdDataJSON | null>(null)
  const [showForm, setShowForm] = useState(false)

  // 圖片上傳狀態
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // 表頭確認狀態
  const [headerConfirmed, setHeaderConfirmed] = useState(false)

  // 儲存切割後的圖片片段
  const [imageSegments, setImageSegments] = useState<any[] | null>(null)

  // 多頁戶口名簿管理
  const [householdPages, setHouseholdPages] = useState<File[]>([])
  const [isProcessingMembers, setIsProcessingMembers] = useState(false)
  const [membersCompleted, setMembersCompleted] = useState(false)
  const [currentViewPage, setCurrentViewPage] = useState(0) // 當前查看的頁面索引

  // 佈局分析結果
  const [layoutRegions, setLayoutRegions] = useState<LayoutRegion[] | null>(null)
  const [showLayoutPreview, setShowLayoutPreview] = useState(false)

  // 圖片放大預覽
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)

  /**
   * 檔案選擇處理（支援圖片和 PDF）
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 檢查檔案類型
    if (file.type.startsWith('image/')) {
      // 圖片檔案：直接設定預覽
      setUploadedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
      onDocumentsChange?.(true)
    } else if (file.type === 'application/pdf') {
      // PDF 檔案：使用切割功能（暫時停用）
      alert('PDF 切割功能開發中，請先使用圖片格式')
      event.target.value = ''
    }
  }

  /**
   * 觸發檔案選擇器
   */
  const handleSelectFileClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * 新增並處理下一頁（暫時註解）
   */
  const handleAddNextPage = async () => {
    // PDF 切割功能暫時停用
    alert('PDF 切割功能暫時停用')
    // if (pages.length >= 1) {
    //   alert('戶口名簿 OCR 目前僅支援單頁處理')
    //   return
    // }
    // await addNextPage()
  }

  /**
   * 開始 OCR 掃描（使用 localStorage 原檔）
   * @param file - 原始檔案（從 localStorage 讀取）
   */
  const handleStartOCRWithFile = async (file: File) => {
    try {
      setIsProcessingOCR?.(true)
      setOCRMessage?.('正在切割圖片...')

      console.log('🔍 OCR 檔案檢查:')
      console.log('  - 檔案大小:', file.size, 'bytes')
      console.log('  - 檔案類型:', file.type)

      // 步驟 1: 完整切割圖片並保存為 Base64（使用原檔）
      console.log('📐 開始切割戶口名簿圖片（保存為 Base64）')
      const segments = await segmentHouseholdImage(file)
      console.log(`✅ 切割完成，已保存 ${segments.length} 個區域為 Base64`)

      // 儲存切片供後續 OCR 使用
      setImageSegments(segments)

      // 使用佈局分析子系統（僅用於 preview 模式）
      const analyzer = getLayoutAnalyzer()

      if (analyzer.getMode() === 'preview') {
        // preview 模式：顯示佈局預覽供使用者調整
        const layoutResult = await analyzer.analyze(file)
        setLayoutRegions(layoutResult.regions)
        setShowLayoutPreview(true)
        setIsProcessingOCR?.(false)
      } else {
        // standard 或 dynamic 模式：直接開始 OCR
        await startHeaderOCR(segments)
      }
    } catch (error) {
      console.error('切割處理錯誤:', error)
      setIsProcessingOCR?.(false)
    }
  }

  /**
   * 確認佈局後繼續 OCR（使用調整後的邊界）
   */
  const handleLayoutConfirm = async (adjustedRegions: LayoutRegion[]) => {
    if (!imageSegments) {
      console.error('❌ 缺少切片資料')
      return
    }

    try {
      setIsProcessingOCR?.(true)
      setShowLayoutPreview(false)

      // 使用佈局分析器驗證並應用使用者調整
      const analyzer = getLayoutAnalyzer()
      const validatedLayout = analyzer.applyUserAdjustment(adjustedRegions)

      console.log('✅ 使用者確認佈局')
      console.log(`📐 佈局來源: ${validatedLayout.source}`)
      console.log(`📋 區域數: ${validatedLayout.regions.length}`)

      // 開始表頭 OCR（使用已保存的切片）
      await startHeaderOCR(imageSegments)
    } catch (error) {
      console.error('OCR 處理錯誤:', error)
      setIsProcessingOCR?.(false)
    }
  }

  /**
   * 取消佈局預覽
   */
  const handleLayoutCancel = () => {
    setShowLayoutPreview(false)
    setLayoutRegions(null)
    handleReset()
  }

  /**
   * 處理所有頁面的成員資料（完整圖片 OCR）
   */
  const handleProcessAllMembers = async () => {
    if (!uploadedImage) return

    // 立即通知父組件：已開始掃描，可以進入下一步
    onScanStarted?.()
    console.log('🚀 成員掃描已開始（背景處理）')

    try {
      setIsProcessingMembers(true)
      setOCRMessage?.('正在處理所有頁面的成員資料...')

      // 收集所有頁面（從 localStorage 讀取原檔）
      const totalPages = householdPages.length + 1
      console.log(`📚 開始處理 ${totalPages} 頁戶口名簿（從 localStorage 讀取原檔）`)

      const membersWithPage: any[] = []
      let memberIndex = 0

      // 逐頁進行完整圖片 OCR（從 Storage 下載原檔）
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const pageNum = pageIndex + 1
        const storageUrlKey = `${sessionUuid}_household_page${pageNum}_url`

        console.log(`📄 處理第 ${pageNum} 頁（從 Storage 下載原檔）...`)

        // 從 Storage 下載原檔
        const storageUrl = localStorage.getItem(storageUrlKey)
        if (!storageUrl) {
          console.error(`❌ 找不到第 ${pageNum} 頁的 Storage URL`)
          continue
        }

        const originalFile = await downloadFromStorage(storageUrl, `household-page${pageNum}.jpg`)
        console.log(`  原檔大小: ${originalFile.size} bytes`)

        const formData = new FormData()
        formData.append('image', originalFile, `page-${pageNum}.jpg`)
        formData.append('type', 'household')
        formData.append('segmentIndex', '0') // 0 = 完整頁面 OCR

        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          console.error(`❌ 第 ${pageIndex + 1} 頁 OCR 失敗`)
          continue
        }

        const result = await response.json()
        console.log(`📋 第 ${pageIndex + 1} 頁 OCR 結果:`, result.data)

        if (result.success && result.data) {
          // 第一頁：跳過戶長（已處理），只取成員
          const pageMembers = pageIndex === 0 ? result.data.members :
            [...(result.data.householdHead ? [result.data.householdHead] : []), ...(result.data.members || [])]

          pageMembers?.forEach((member: any) => {
            membersWithPage.push({
              id: `member-${memberIndex + 1}`,
              name: member.name || '',
              gender: member.gender || '',
              birthDate: member.birthDate || '',
              idNumber: member.idNumber || '',
              relationship: member.relationship || '',
              pageNumber: pageIndex + 1 // 記錄頁碼
            })
            memberIndex++
          })

          console.log(`✅ 第 ${pageIndex + 1} 頁：提取 ${pageMembers?.length || 0} 位成員`)
        }
      }

      // 更新成員資料
      if (householdData && membersWithPage.length > 0) {

        const updatedData: HouseholdDataJSON = {
          ...householdData,
          members: membersWithPage
        }

        setHouseholdData(updatedData)
        onDataChange?.(updatedData)
        setMembersCompleted(true)

        console.log(`✅ 成員資料處理完成！共 ${membersWithPage.length} 位成員（背景處理）`)
      }

    } catch (error) {
      console.error('❌ 成員資料處理錯誤:', error)
      alert('❌ 成員資料處理失敗')
    } finally {
      setIsProcessingMembers(false)
      setOCRMessage?.(undefined)
    }
  }

  /**
   * 步驟 2: 執行表頭 OCR（從已保存的 Base64 切片調用）
   */
  const startHeaderOCR = async (segments: ImageSegment[]) => {
    try {
      setOCRMessage?.('AI 正在辨識戶口名簿表頭資料，請稍候...')

      // 從 Base64 暫存取得表頭切片（index 0）
      const headerBlob = getSegmentBlob(segments, 0)
      if (!headerBlob) {
        throw new Error('無法取得表頭切片')
      }

      console.log('📄 使用表頭切片進行 OCR (index: 0)')

      const formData = new FormData()
      formData.append('image', headerBlob, 'header.jpg')
      formData.append('type', 'household-header')

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('表頭 OCR API 請求失敗')
      }

      const result = await response.json()
      console.log('🏠 表頭 OCR 結果:', result)

      if (result.success && result.data) {
        const headerData = result.data

        // 建立初始資料結構
        const householdDataResult: HouseholdDataJSON = {
          householdHead: {
            id: 'head',
            name: '',
            gender: '',
            birthDate: '',
            idNumber: '',
            relationship: '戶長'
          },
          members: [
            { id: 'member-1', name: '', gender: '', birthDate: '', idNumber: '', relationship: '' },
            { id: 'member-2', name: '', gender: '', birthDate: '', idNumber: '', relationship: '' },
            { id: 'member-3', name: '', gender: '', birthDate: '', idNumber: '', relationship: '' },
            { id: 'member-4', name: '', gender: '', birthDate: '', idNumber: '', relationship: '' }
          ],
          header: {
            householdNumber: headerData.householdNumber || '',
            householdHeadIdNumber: headerData.householdHeadIdNumber || '',
            householdType: headerData.householdType || '',
            address: headerData.address || ''
          }
        }

        console.log('✅ 表頭 OCR 完成:', householdDataResult.header)
        setHouseholdData(householdDataResult)
        onDataChange?.(householdDataResult)
        onDocumentsChange?.(true)
      } else {
        console.error('表頭 OCR 處理失敗:', result.error)
      }
    } catch (error) {
      console.error('表頭 OCR 處理錯誤:', error)
    } finally {
      setIsProcessingOCR?.(false)
    }
  }

  /**
   * 步驟 3: 確認表頭並掃描戶長資料（從已保存的 Base64 切片調用）
   */
  const handleConfirmHeaderAndScanHouseholdHead = async () => {
    if (!imageSegments || imageSegments.length < 2) {
      console.error('❌ 缺少圖片切片資料')
      return
    }

    try {
      setIsProcessingOCR?.(true)
      setOCRMessage?.('AI 正在辨識戶長資料，請稍候...')

      // 從 Base64 暫存取得戶長切片（index 1）
      const householdHeadBlob = getSegmentBlob(imageSegments, 1)
      if (!householdHeadBlob) {
        throw new Error('無法取得戶長切片')
      }

      console.log('📄 使用戶長切片進行 OCR (index: 1)')

      const formData = new FormData()
      formData.append('image', householdHeadBlob, 'household-head.jpg')
      formData.append('type', 'household')
      formData.append('segmentIndex', '1') // 1 = 戶長

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('戶長 OCR API 請求失敗')
      }

      const result = await response.json()
      console.log('🏠 戶長 OCR 結果:', result)

      if (result.success && result.data && householdData) {
        // 更新戶長資料
        const updatedData: HouseholdDataJSON = {
          ...householdData,
          householdHead: {
            id: 'head',
            name: result.data.name || '',
            gender: result.data.gender || '',
            birthDate: result.data.birthDate || '',
            idNumber: result.data.idNumber || '',
            relationship: '戶長'
          }
        }

        setHouseholdData(updatedData)
        onDataChange?.(updatedData)
        setHeaderConfirmed(true)
      } else {
        console.error('戶長 OCR 處理失敗:', result.error)
      }
    } catch (error) {
      console.error('戶長 OCR 處理錯誤:', error)
    } finally {
      setIsProcessingOCR?.(false)
    }
  }

  /**
   * 重新開始
   */
  const handleReset = () => {
    // resetPDF()
    setUploadedImage(null)
    setImagePreview(null)
    setHouseholdData(null)
    setShowForm(false)
    setHeaderConfirmed(false)
    setImageSegments(null)
    setLayoutRegions(null)
    setShowLayoutPreview(false)
    setHouseholdPages([])
    setIsProcessingMembers(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onDocumentsChange?.(false)
  }

  /**
   * 戶口名簿資料變更處理
   */
  const handleHouseholdDataChange = (data: HouseholdDataJSON) => {
    setHouseholdData(data)
    onDataChange?.(data)
  }

  return (
    <div className="space-y-4">
      {/* 戶口名簿上傳與 OCR */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col items-start space-y-2">
          <h2 className="text-lg font-bold">戶口名簿 OCR 掃描</h2>
          <p className="text-sm text-default-500">
            拍照或上傳戶口名簿圖片，系統將自動辨識基本資料
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
            {/* 使用 CameraCapture 組件 */}
            {!householdData && (
              <CameraCapture
                label="戶口名簿"
                onOriginalFileSelected={async (originalFile) => {
                  // 上傳原檔到 Supabase Storage
                  const pageNum = householdPages.length + 1
                  console.log(`📤 上傳原檔到 Storage（${originalFile.size} bytes）...`)

                  try {
                    const { url } = await uploadToTemp(originalFile, sessionUuid, 'household', pageNum)
                    console.log(`✅ 原檔已上傳: ${url}`)

                    // 保存 URL 供後續 OCR 使用
                    const storageKey = `${sessionUuid}_household_page${pageNum}_url`
                    localStorage.setItem(storageKey, url)
                  } catch (error) {
                    console.error('❌ Storage 上傳失敗:', error)
                  }
                }}
                onCapture={async (editedFile) => {
                  try {
                    const pageNum = householdPages.length + 1
                    const storageUrlKey = `${sessionUuid}_household_page${pageNum}_url`

                    // 預覽用（使用編輯後的檔案）
                    setUploadedImage(editedFile)
                    setImagePreview(URL.createObjectURL(editedFile))

                    // 從 Storage 下載原檔進行 OCR
                    const storageUrl = localStorage.getItem(storageUrlKey)
                    if (storageUrl) {
                      console.log(`📥 從 Storage 下載原檔: ${storageUrl}`)
                      const originalFile = await downloadFromStorage(storageUrl, `household-page${pageNum}.jpg`)
                      console.log(`✅ 原檔下載完成: ${originalFile.size} bytes`)
                      await handleStartOCRWithFile(originalFile)
                    } else {
                      throw new Error('找不到 Storage URL')
                    }
                  } catch (error) {
                    console.error('❌ 處理失敗:', error)
                    alert('檔案處理失敗，請重試')
                  }
                }}
                currentImage={imagePreview}
              />
            )}

            {/* PDF 資訊 */}
            {totalPages && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    總頁數: {totalPages}
                  </span>
                  <Button
                    color="danger"
                    size="sm"
                    variant="light"
                    onClick={handleReset}
                  >
                    重新開始
                  </Button>
                </div>
              </div>
            )}

            {/* 錯誤訊息 */}
            {pdfError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{pdfError}</p>
              </div>
            )}

            {/* 新增頁面按鈕 */}
            {totalPages && currentPage <= totalPages && pages.length === 0 && (
              <Button
                color="success"
                onClick={handleAddNextPage}
                isLoading={isPDFProcessing}
                className="w-full"
              >
                {isPDFProcessing ? '處理中...' : `新增第 ${currentPage} 頁`}
              </Button>
            )}

            {/* 頁面預覽 */}
            {pages.length > 0 && (
              <div className="space-y-4">
                <Card className="border-2 border-default-200">
                  <CardBody className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          第 {pages[0].pageNumber} 頁
                        </span>
                        <Chip color="primary" size="sm" variant="flat">
                          {pages[0].segments.length} 個切片
                        </Chip>
                      </div>
                    </div>

                    {/* 切片預覽 */}
                    <div className="grid grid-cols-3 gap-2">
                      {pages[0].segments.map((segment) => (
                        <div
                          key={`${segment.pageNumber}-${segment.segmentIndex}`}
                          className="relative aspect-video rounded-lg overflow-hidden bg-default-100 border border-default-200"
                        >
                          <img
                            src={segment.dataUrl}
                            alt={`切片 ${segment.segmentIndex}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1">
                            <Chip color="secondary" size="sm" variant="solid">
                              {segment.segmentIndex === 1 ? '戶長' : `成員${segment.segmentIndex - 1}`}
                            </Chip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>

                {/* OCR 掃描按鈕 */}
                {!isOCRProcessing && !isOCRCompleted && (
                  <Button
                    color="primary"
                    size="lg"
                    onClick={handleStartOCR}
                    className="w-full"
                  >
                    開始 AI 掃描辨識
                  </Button>
                )}
              </div>
            )}

            {/* OCR 處理進度（暫時隱藏，改為簡單的 loading 提示）*/}
            {/* {isOCRProcessing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">AI 掃描進度</span>
                  <span className="text-sm text-default-500">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <Progress
                  value={progress.percentage}
                  className="w-full"
                  color="primary"
                />
                {progress.currentSegment && (
                  <p className="text-xs text-default-500">
                    正在處理: {progress.currentSegment}
                  </p>
                )}
              </div>
            )} */}

            {/* OCR 錯誤訊息 */}
            {ocrErrors.length > 0 && (
              <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm font-medium text-warning-700 mb-2">
                  部分切片辨識失敗：
                </p>
                {ocrErrors.map((err) => (
                  <p key={err.segmentIndex} className="text-xs text-warning-600">
                    • 切片 {err.segmentIndex}: {err.error}
                  </p>
                ))}
              </div>
            )}

            {/* OCR 錯誤訊息 */}
            {ocrErrors.length > 0 && (
              <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm font-medium text-warning-700 mb-2">
                  部分切片辨識失敗：
                </p>
                {ocrErrors.map((err) => (
                  <p key={err.segmentIndex} className="text-xs text-warning-600">
                    • 切片 {err.segmentIndex}: {err.error}
                  </p>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

      {/* 佈局預覽（佈局分析完成後顯示）*/}
      {showLayoutPreview && layoutRegions && imagePreview && (
        <LayoutPreview
          imageUrl={imagePreview}
          regions={layoutRegions}
          onConfirm={handleLayoutConfirm}
          onCancel={handleLayoutCancel}
        />
      )}

      {/* 切片預覽卡片（切割完成後顯示）*/}
      {imageSegments && imageSegments.length > 0 && (
        <Card className="shadow-lg border-2 border-primary">
          <CardHeader className="bg-primary-50">
            <h3 className="text-lg font-semibold text-primary-700">📐 切割預覽</h3>
            <p className="text-xs text-primary-600">
              已切割為 {imageSegments.length} 個區域 |
              表頭 21% + 戶長 13% + 成員 10.5%×4 + 頁腳 24% = 100%
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              {imageSegments.map((seg) => (
                <div key={seg.index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-semibold text-default-700">
                      {seg.index}. {seg.label}
                    </div>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      className="h-6 min-w-0 px-2"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = seg.dataUrl
                        link.download = `${seg.index}-${seg.label}.png`
                        link.click()
                      }}
                    >
                      💾
                    </Button>
                  </div>
                  <img
                    src={seg.dataUrl}
                    alt={seg.label}
                    className="w-full border border-default-300 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setEnlargedImage(seg.dataUrl)}
                  />
                  <div className="text-xs text-default-500">
                    {(seg.yStart * 100).toFixed(1)}% - {(seg.yEnd * 100).toFixed(1)}%
                    ({((seg.yEnd - seg.yStart) * 100).toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 圖片放大預覽 */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={enlargedImage}
              alt="放大預覽"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              color="danger"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setEnlargedImage(null)}
            >
              ✕ 關閉
            </Button>
          </div>
        </div>
      )}

      {/* 基本資料預覽卡片（OCR 完成後顯示）*/}
      {!showLayoutPreview && householdData && householdData.header && (
        <Card className="shadow-lg border-2 border-success">
          <CardHeader className="flex flex-row justify-between items-center bg-success-50">
            <div>
              <h3 className="text-lg font-semibold text-success-700">✓ 基本資料</h3>
              <p className="text-xs text-success-600">AI 辨識完成，請確認資料正確性</p>
            </div>
            <Button
              color="warning"
              size="sm"
              variant="light"
              onClick={handleReset}
            >
              重新掃描
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* 基本資料 */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-default-500 mb-1">戶號</label>
                <input
                  type="text"
                  value={householdData.header?.householdNumber || ''}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      header: {
                        ...householdData.header,
                        householdNumber: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
              <div>
                <label className="block text-xs text-default-500 mb-1">戶長統號</label>
                <input
                  type="text"
                  value={householdData.header?.householdHeadIdNumber || ''}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      header: {
                        ...householdData.header,
                        householdHeadIdNumber: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
              <div>
                <label className="block text-xs text-default-500 mb-1">戶別</label>
                <input
                  type="text"
                  value={householdData.header?.householdType || ''}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      header: {
                        ...householdData.header,
                        householdType: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
              <div>
                <label className="block text-xs text-default-500 mb-1">戶籍地址</label>
                <input
                  type="text"
                  value={householdData.header?.address || ''}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      header: {
                        ...householdData.header,
                        address: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
            </div>

            {/* 確認按鈕 */}
            {!headerConfirmed && (
              <Button
                color="primary"
                size="lg"
                onClick={handleConfirmHeaderAndScanHouseholdHead}
                className="w-full"
              >
                確認基本資料並掃描戶長資料
              </Button>
            )}

            {/* 已確認提示 */}
            {headerConfirmed && (
              <div className="p-3 bg-success-50 rounded-lg">
                <p className="text-xs text-success-700">
                  ✓ 基本資料已確認
                </p>
              </div>
            )}

            {!headerConfirmed && (
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-xs text-primary-700">
                  ℹ️ 請確認基本資料正確後，點擊「確認」按鈕進行戶長資料掃描
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 成員資料確認（成員 OCR 完成後顯示）*/}
      {membersCompleted && householdData && (
        <Card className="shadow-lg border-2 border-success">
          <CardHeader className="flex flex-row justify-between items-center bg-success-50">
            <div>
              <h3 className="text-lg font-semibold text-success-700">
                ✓ 戶口名簿資料確認
              </h3>
              <p className="text-xs text-success-600">
                共 {householdPages.length + 1} 頁 | 戶長 + {householdData.members.length} 位成員
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* 頁面導航 */}
            {householdPages.length > 0 && (
              <div className="flex items-center justify-between bg-default-100 p-3 rounded-lg">
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={currentViewPage === 0}
                  onClick={() => setCurrentViewPage(currentViewPage - 1)}
                >
                  ← 上一頁
                </Button>
                <span className="text-sm font-semibold">
                  第 {currentViewPage + 1} 頁 / 共 {householdPages.length + 1} 頁
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={currentViewPage >= householdPages.length}
                  onClick={() => setCurrentViewPage(currentViewPage + 1)}
                >
                  下一頁 →
                </Button>
              </div>
            )}

            {/* 第一頁：基本資料 + 戶長 + 成員 */}
            {currentViewPage === 0 && (
              <div className="space-y-6">
                {/* 基本資料 */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-semibold mb-3 text-primary">📋 基本資料</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-default-500 mb-1">戶號</label>
                      <input
                        type="text"
                        value={householdData.header?.householdNumber || ''}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            header: { ...householdData.header, householdNumber: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-default-500 mb-1">戶長統號</label>
                      <input
                        type="text"
                        value={householdData.header?.householdHeadIdNumber || ''}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            header: { ...householdData.header, householdHeadIdNumber: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-default-500 mb-1">戶別</label>
                      <input
                        type="text"
                        value={householdData.header?.householdType || ''}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            header: { ...householdData.header, householdType: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-default-500 mb-1">戶籍地址</label>
                      <input
                        type="text"
                        value={householdData.header?.address || ''}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            header: { ...householdData.header, address: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                  </div>
                </div>

                {/* 戶長資料 */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-semibold mb-3 text-primary">👤 戶長資料</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-default-500 mb-1">姓名</label>
                      <input
                        type="text"
                        value={householdData.householdHead.name}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            householdHead: { ...householdData.householdHead, name: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-default-500 mb-1">性別</label>
                      <input
                        type="text"
                        value={householdData.householdHead.gender}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            householdHead: { ...householdData.householdHead, gender: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-default-500 mb-1">出生日期</label>
                      <input
                        type="text"
                        value={householdData.householdHead.birthDate}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            householdHead: { ...householdData.householdHead, birthDate: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-default-500 mb-1">身分證字號</label>
                      <input
                        type="text"
                        value={householdData.householdHead.idNumber}
                        onChange={(e) => {
                          const newData: HouseholdDataJSON = {
                            ...householdData,
                            householdHead: { ...householdData.householdHead, idNumber: e.target.value }
                          }
                          setHouseholdData(newData)
                          onDataChange?.(newData)
                        }}
                        className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                      />
                    </div>
                  </div>
                </div>

                {/* 第一頁成員 */}
                {householdData.members.filter((m: any) => m.pageNumber === 1).map((member: any, idx: number) => {
                  const memberIdx = householdData.members.findIndex((m: any) => m.id === member.id)
                  return (
                    <div key={member.id} className="border-b pb-4">
                      <h4 className="text-md font-semibold mb-3 text-default-700">
                        👥 成員 {idx + 1} - {member.relationship || ''}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-default-500 mb-1">姓名</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => {
                              const newMembers = [...householdData.members]
                              newMembers[memberIdx] = { ...newMembers[memberIdx], name: e.target.value }
                              const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                              setHouseholdData(newData)
                              onDataChange?.(newData)
                            }}
                            className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-default-500 mb-1">性別</label>
                          <input
                            type="text"
                            value={member.gender}
                            onChange={(e) => {
                              const newMembers = [...householdData.members]
                              newMembers[memberIdx] = { ...newMembers[memberIdx], gender: e.target.value }
                              const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                              setHouseholdData(newData)
                              onDataChange?.(newData)
                            }}
                            className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-default-500 mb-1">出生日期</label>
                          <input
                            type="text"
                            value={member.birthDate}
                            onChange={(e) => {
                              const newMembers = [...householdData.members]
                              newMembers[memberIdx] = { ...newMembers[memberIdx], birthDate: e.target.value }
                              const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                              setHouseholdData(newData)
                              onDataChange?.(newData)
                            }}
                            className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-default-500 mb-1">身分證字號</label>
                          <input
                            type="text"
                            value={member.idNumber}
                            onChange={(e) => {
                              const newMembers = [...householdData.members]
                              newMembers[memberIdx] = { ...newMembers[memberIdx], idNumber: e.target.value }
                              const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                              setHouseholdData(newData)
                              onDataChange?.(newData)
                            }}
                            className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-default-500 mb-1">與戶長關係</label>
                          <input
                            type="text"
                            value={member.relationship}
                            onChange={(e) => {
                              const newMembers = [...householdData.members]
                              newMembers[memberIdx] = { ...newMembers[memberIdx], relationship: e.target.value }
                              const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                              setHouseholdData(newData)
                              onDataChange?.(newData)
                            }}
                            className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 其他頁：只顯示該頁成員 */}
            {currentViewPage > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-primary">
                  第 {currentViewPage + 1} 頁成員資料
                </h4>
                {householdData.members
                  .filter((m: any) => m.pageNumber === currentViewPage + 1)
                  .map((member: any, idx: number) => {
                    const memberIdx = householdData.members.findIndex((m: any) => m.id === member.id)
                    return (
                      <div key={member.id} className="border-b pb-4">
                        <h5 className="text-md font-semibold mb-3 text-default-700">
                          👥 成員 {idx + 1} - {member.relationship || ''}
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-default-500 mb-1">姓名</label>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => {
                                const newMembers = [...householdData.members]
                                newMembers[memberIdx] = { ...newMembers[memberIdx], name: e.target.value }
                                const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                                setHouseholdData(newData)
                                onDataChange?.(newData)
                              }}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">性別</label>
                            <input
                              type="text"
                              value={member.gender}
                              onChange={(e) => {
                                const newMembers = [...householdData.members]
                                newMembers[memberIdx] = { ...newMembers[memberIdx], gender: e.target.value }
                                const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                                setHouseholdData(newData)
                                onDataChange?.(newData)
                              }}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">出生日期</label>
                            <input
                              type="text"
                              value={member.birthDate}
                              onChange={(e) => {
                                const newMembers = [...householdData.members]
                                newMembers[memberIdx] = { ...newMembers[memberIdx], birthDate: e.target.value }
                                const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                                setHouseholdData(newData)
                                onDataChange?.(newData)
                              }}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">身分證字號</label>
                            <input
                              type="text"
                              value={member.idNumber}
                              onChange={(e) => {
                                const newMembers = [...householdData.members]
                                newMembers[memberIdx] = { ...newMembers[memberIdx], idNumber: e.target.value }
                                const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                                setHouseholdData(newData)
                                onDataChange?.(newData)
                              }}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-default-500 mb-1">與戶長關係</label>
                            <input
                              type="text"
                              value={member.relationship}
                              onChange={(e) => {
                                const newMembers = [...householdData.members]
                                newMembers[memberIdx] = { ...newMembers[memberIdx], relationship: e.target.value }
                                const newData: HouseholdDataJSON = { ...householdData, members: newMembers }
                                setHouseholdData(newData)
                                onDataChange?.(newData)
                              }}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 戶長資料預覽卡片（表頭確認後顯示）*/}
      {!membersCompleted && headerConfirmed && householdData?.householdHead?.name && (
        <Card className="shadow-lg border-2 border-success">
          <CardHeader className="flex flex-row justify-between items-center bg-success-50">
            <div>
              <h3 className="text-lg font-semibold text-success-700">✓ 戶長資料</h3>
              <p className="text-xs text-success-600">AI 辨識完成，請確認資料正確性</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* 戶長資料 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-default-500 mb-1">姓名</label>
                <input
                  type="text"
                  value={householdData.householdHead.name}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      householdHead: {
                        ...householdData.householdHead,
                        name: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
              <div>
                <label className="block text-xs text-default-500 mb-1">性別</label>
                <input
                  type="text"
                  value={householdData.householdHead.gender}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      householdHead: {
                        ...householdData.householdHead,
                        gender: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
              <div>
                <label className="block text-xs text-default-500 mb-1">出生日期</label>
                <input
                  type="text"
                  value={householdData.householdHead.birthDate}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      householdHead: {
                        ...householdData.householdHead,
                        birthDate: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
              <div>
                <label className="block text-xs text-default-500 mb-1">身分證字號</label>
                <input
                  type="text"
                  value={householdData.householdHead.idNumber}
                  onChange={(e) => {
                    const newData: HouseholdDataJSON = {
                      ...householdData,
                      householdHead: {
                        ...householdData.householdHead,
                        idNumber: e.target.value
                      }
                    }
                    setHouseholdData(newData)
                    onDataChange?.(newData)
                  }}
                  className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 focus:border-success focus:ring-success/20"
                />
              </div>
            </div>

            <div className="p-3 bg-primary-50 rounded-lg">
              <p className="text-xs text-primary-700">
                ℹ️ 請確認戶長資料正確後，即可繼續填寫其他資料
              </p>
            </div>

            {/* 掃描額外頁面按鈕 */}
            <div className="pt-4 border-t border-default-200 space-y-3">
              {/* 顯示已上傳的頁面 */}
              {householdPages.length > 0 && (
                <div className="bg-success-50 p-3 rounded-lg">
                  <p className="text-xs text-success-700 font-semibold mb-2">
                    ✓ 已掃描 {householdPages.length + 1} 頁
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-success text-white text-xs rounded">第 1 頁</span>
                    {householdPages.map((_, index) => (
                      <span key={index} className="px-2 py-1 bg-success text-white text-xs rounded">
                        第 {index + 2} 頁
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 上傳下一頁 */}
              <CameraCapture
                label={`+ 掃描第 ${householdPages.length + 2} 頁`}
                onOriginalFileSelected={async (originalFile) => {
                  // 上傳原檔到 Storage
                  const pageNum = householdPages.length + 2
                  console.log(`📤 第 ${pageNum} 頁原檔上傳到 Storage（${originalFile.size} bytes）...`)

                  try {
                    const { url } = await uploadToTemp(originalFile, sessionUuid, 'household', pageNum)
                    console.log(`✅ 第 ${pageNum} 頁原檔已上傳: ${url}`)

                    // 保存 URL
                    const storageUrlKey = `${sessionUuid}_household_page${pageNum}_url`
                    localStorage.setItem(storageUrlKey, url)
                  } catch (error) {
                    console.error('❌ Storage 上傳失敗:', error)
                  }
                }}
                onCapture={async (editedFile) => {
                  try {
                    const pageNum = householdPages.length + 2

                    // 保存編輯後的檔案（用於預覽）
                    setHouseholdPages([...householdPages, editedFile])
                    console.log(`✅ 第 ${pageNum} 頁已保存`)
                  } catch (error) {
                    console.error('❌ 處理失敗:', error)
                    alert(`第 ${pageNum} 頁處理失敗`)
                  }
                }}
                currentImage={null}
              />

              {/* 完成掃描並處理成員資料 */}
              {!isProcessingMembers && (
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    color="success"
                    size="lg"
                    className="w-full"
                    onClick={handleProcessAllMembers}
                  >
                    ✓ 完成掃描，開始辨識成員資料（{householdPages.length + 1} 頁）
                  </Button>
                  {householdPages.length === 0 && (
                    <p className="text-xs text-center text-default-500">
                      💡 如果只有一頁，可直接點擊「完成掃描」
                    </p>
                  )}
                </div>
              )}

              {isProcessingMembers && (
                <div className="p-3 bg-primary-50 rounded-lg text-center">
                  <p className="text-sm text-primary-700">
                    🤖 正在處理 {householdPages.length + 1} 頁成員資料...
                  </p>
                </div>
              )}

              <p className="text-xs text-default-500">
                💡 如果家族成員較多，可繼續上傳第 2、3 頁，完成後點擊「完成掃描」
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
