'use client'

import { useState } from 'react'
import PDFSegmenter from '@/components/PDFSegmenter'
import type { PDFSegment } from '@/utils/pdfSegmentation'

export default function TestPDFSegmenterPage() {
  const [allSegments, setAllSegments] = useState<PDFSegment[][]>([])

  const handleSegmentsChange = (segments: PDFSegment[][]) => {
    setAllSegments(segments)
    console.log('所有片段更新:', segments)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PDF 分割測試頁面
          </h1>
          <p className="text-gray-600">
            測試 PDF 自動切割成 5 個水平片段的功能
          </p>
        </div>

        <PDFSegmenter
          onSegmentsChange={handleSegmentsChange}
          maxPages={5}
        />

        {/* 統計資訊 */}
        {allSegments.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">處理統計</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">已處理頁面</p>
                <p className="text-2xl font-bold text-blue-700">
                  {allSegments.length}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 mb-1">總片段數</p>
                <p className="text-2xl font-bold text-green-700">
                  {allSegments.reduce((total, page) => total + page.length, 0)}
                </p>
              </div>
            </div>

            {/* 片段資訊 */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">片段詳情</h3>
              {allSegments.map((pageSegments, pageIndex) => (
                <div key={pageIndex} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-3">
                    第 {pageSegments[0]?.pageNumber || pageIndex + 1} 頁
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {pageSegments.map((segment, segmentIndex) => (
                      <div
                        key={segmentIndex}
                        className="text-center"
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          片段 {segment.segmentIndex}
                        </div>
                        <div className="text-sm font-medium">
                          {segment.width} × {segment.height}
                        </div>
                        <div className="text-xs text-gray-400">
                          {(segment.blob.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
