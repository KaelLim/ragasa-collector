'use client'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { Progress } from '@heroui/progress'
import { useTranslation } from 'react-i18next'
import { usePDFSegmentation } from '@/hooks/usePDFSegmentation'
import { useRef } from 'react'
import type { PDFSegment } from '@/utils/pdfSegmentation'

interface PDFSegmenterProps {
  onSegmentsChange?: (segments: PDFSegment[][]) => void
  maxPages?: number
}

export default function PDFSegmenter({ onSegmentsChange, maxPages = 10 }: PDFSegmenterProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    pages,
    currentPage,
    totalPages,
    isProcessing,
    error,
    selectPDFFile,
    addNextPage,
    removePage,
    reset,
  } = usePDFSegmentation()

  /**
   * 檔案選擇處理
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await selectPDFFile(file)
    }
  }

  /**
   * 觸發檔案選擇器
   */
  const handleSelectFileClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * 新增下一頁
   */
  const handleAddNextPage = async () => {
    if (pages.length >= maxPages) {
      alert(`最多只能處理 ${maxPages} 頁`)
      return
    }

    await addNextPage()

    // 通知父組件更新
    if (onSegmentsChange) {
      const allSegments = pages.map(page => page.segments)
      onSegmentsChange(allSegments)
    }
  }

  /**
   * 移除頁面
   */
  const handleRemovePage = (pageNumber: number) => {
    removePage(pageNumber)

    // 通知父組件更新
    if (onSegmentsChange) {
      const remainingSegments = pages
        .filter(page => page.pageNumber !== pageNumber)
        .map(page => page.segments)
      onSegmentsChange(remainingSegments)
    }
  }

  /**
   * 重新開始
   */
  const handleReset = () => {
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onSegmentsChange?.([])
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col items-start space-y-2">
        <h2 className="text-lg font-bold">{t('pdfSegmenter.title')}</h2>
        <p className="text-sm text-default-500">{t('pdfSegmenter.description')}</p>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* 檔案選擇 */}
        {!totalPages && (
          <div className="space-y-2">
            <Button
              color="primary"
              onClick={handleSelectFileClick}
              className="w-full"
              isDisabled={isProcessing}
            >
              {t('pdfSegmenter.selectPDF')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* PDF 資訊 */}
        {totalPages && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {t('pdfSegmenter.totalPages')}: {totalPages}
              </span>
              <Button
                color="danger"
                size="sm"
                variant="light"
                onClick={handleReset}
              >
                {t('common.reset')}
              </Button>
            </div>

            {/* 進度條 */}
            <Progress
              value={(pages.length / Math.min(totalPages, maxPages)) * 100}
              className="w-full"
              color="primary"
            />
            <p className="text-xs text-default-500">
              {t('pdfSegmenter.processed')}: {pages.length} / {Math.min(totalPages, maxPages)}
            </p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        {/* 新增下一頁按鈕 */}
        {totalPages && currentPage <= totalPages && pages.length < maxPages && (
          <Button
            color="success"
            onClick={handleAddNextPage}
            isLoading={isProcessing}
            className="w-full"
          >
            {isProcessing
              ? t('pdfSegmenter.processing')
              : `${t('pdfSegmenter.addPage')} ${currentPage}`}
          </Button>
        )}

        {/* 已處理頁面列表 */}
        {pages.length > 0 && (
          <div className="space-y-4 mt-4">
            <h3 className="text-sm font-medium">{t('pdfSegmenter.processedPages')}</h3>
            {pages.map((page) => (
              <Card key={page.pageNumber} className="border-2 border-default-200">
                <CardBody className="space-y-3">
                  {/* 頁碼與移除按鈕 */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t('pdfSegmenter.page')} {page.pageNumber}
                      </span>
                      <Chip color="primary" size="sm" variant="flat">
                        {page.segments.length} {t('pdfSegmenter.segments')}
                      </Chip>
                    </div>
                    <Button
                      color="danger"
                      size="sm"
                      variant="light"
                      onClick={() => handleRemovePage(page.pageNumber)}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>

                  {/* 片段預覽 */}
                  <div className="grid grid-cols-5 gap-2">
                    {page.segments.map((segment) => (
                      <div
                        key={`${segment.pageNumber}-${segment.segmentIndex}`}
                        className="relative aspect-video rounded-lg overflow-hidden bg-default-100 border border-default-200"
                      >
                        <img
                          src={segment.dataUrl}
                          alt={`頁 ${segment.pageNumber} 片段 ${segment.segmentIndex}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1">
                          <Chip color="secondary" size="sm" variant="solid">
                            {segment.segmentIndex}
                          </Chip>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* 完成提示 */}
        {totalPages && currentPage > totalPages && (
          <div className="text-center p-4 bg-success-50 rounded-lg">
            <p className="text-sm text-success-600">
              {t('pdfSegmenter.allPagesProcessed')}
            </p>
          </div>
        )}

        {/* 達到最大頁數提示 */}
        {pages.length >= maxPages && currentPage <= (totalPages || 0) && (
          <div className="text-center p-4 bg-warning-50 rounded-lg">
            <p className="text-sm text-warning-600">
              {t('pdfSegmenter.maxPagesReached')}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
