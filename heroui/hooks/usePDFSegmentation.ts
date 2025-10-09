import { useState, useCallback } from 'react'
import {
  processPDFPage,
  getPDFPageCount,
  isPDFFile,
  type PDFPageInfo,
  type PDFSegment,
} from '@/utils/pdfSegmentation'

export interface PDFPageData {
  pageNumber: number
  file: File
  segments: PDFSegment[]
  processed: boolean
}

export interface UsePDFSegmentationReturn {
  pages: PDFPageData[]
  currentPage: number
  totalPages: number | null
  isProcessing: boolean
  error: string | null

  // 操作方法
  selectPDFFile: (file: File) => Promise<void>
  processPage: (pageNumber: number) => Promise<void>
  addNextPage: () => Promise<void>
  removePage: (pageNumber: number) => void
  reset: () => void
}

export function usePDFSegmentation(): UsePDFSegmentationReturn {
  const [pages, setPages] = useState<PDFPageData[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  /**
   * 選擇 PDF 檔案並取得總頁數
   */
  const selectPDFFile = useCallback(async (file: File) => {
    if (!isPDFFile(file)) {
      setError('請選擇有效的 PDF 檔案')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const pageCount = await getPDFPageCount(file)
      setPdfFile(file)
      setTotalPages(pageCount)
      setCurrentPage(1)
      setPages([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PDF 讀取失敗'
      setError(errorMessage)
      console.error('PDF 選擇失敗:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  /**
   * 處理指定頁面，分割成 5 個片段
   */
  const processPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfFile) {
        setError('請先選擇 PDF 檔案')
        return
      }

      if (totalPages && (pageNumber < 1 || pageNumber > totalPages)) {
        setError(`頁碼 ${pageNumber} 超出範圍（共 ${totalPages} 頁）`)
        return
      }

      // 檢查該頁是否已處理
      const existingPage = pages.find(p => p.pageNumber === pageNumber)
      if (existingPage?.processed) {
        console.warn(`頁面 ${pageNumber} 已經處理過`)
        return
      }

      setIsProcessing(true)
      setError(null)

      try {
        const pageInfo: PDFPageInfo = await processPDFPage(pdfFile, pageNumber)

        const newPageData: PDFPageData = {
          pageNumber,
          file: pdfFile,
          segments: pageInfo.segments,
          processed: true,
        }

        setPages(prev => {
          const filtered = prev.filter(p => p.pageNumber !== pageNumber)
          return [...filtered, newPageData].sort((a, b) => a.pageNumber - b.pageNumber)
        })

        console.log(`✅ 頁面 ${pageNumber} 處理完成，共 ${pageInfo.segments.length} 個片段`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `頁面 ${pageNumber} 處理失敗`
        setError(errorMessage)
        console.error('頁面處理失敗:', err)
      } finally {
        setIsProcessing(false)
      }
    },
    [pdfFile, totalPages, pages]
  )

  /**
   * 新增下一頁（自動處理）
   */
  const addNextPage = useCallback(async () => {
    if (!pdfFile || !totalPages) {
      setError('請先選擇 PDF 檔案')
      return
    }

    if (currentPage > totalPages) {
      setError('已達到最後一頁')
      return
    }

    await processPage(currentPage)
    setCurrentPage(prev => prev + 1)
  }, [pdfFile, totalPages, currentPage, processPage])

  /**
   * 移除指定頁面
   */
  const removePage = useCallback((pageNumber: number) => {
    setPages(prev => prev.filter(p => p.pageNumber !== pageNumber))
  }, [])

  /**
   * 重置所有狀態
   */
  const reset = useCallback(() => {
    setPages([])
    setCurrentPage(1)
    setTotalPages(null)
    setIsProcessing(false)
    setError(null)
    setPdfFile(null)
  }, [])

  return {
    pages,
    currentPage,
    totalPages,
    isProcessing,
    error,

    selectPDFFile,
    processPage,
    addNextPage,
    removePage,
    reset,
  }
}
