'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'

interface LayoutRegion {
  type: string
  index: number
  yStart: number
  yEnd: number
  description: string
}

interface LayoutPreviewProps {
  imageUrl: string
  regions: LayoutRegion[]
  onConfirm: (adjustedRegions: LayoutRegion[]) => void
  onCancel: () => void
}

export default function LayoutPreview({
  imageUrl,
  regions: initialRegions,
  onConfirm,
  onCancel
}: LayoutPreviewProps) {
  const [regions, setRegions] = useState<LayoutRegion[]>(initialRegions)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  /**
   * 處理滑鼠按下（開始拖動）
   */
  const handleMouseDown = (index: number) => {
    setDraggingIndex(index)
  }

  /**
   * 處理滑鼠移動（拖動紅線）
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIndex === null || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const relativeY = Math.max(0, Math.min(1, y / rect.height))

    // 更新該邊界的 yEnd 和下一個區域的 yStart
    setRegions(prev => {
      const newRegions = [...prev]

      // 更新當前區域的 yEnd
      if (draggingIndex < newRegions.length) {
        newRegions[draggingIndex] = {
          ...newRegions[draggingIndex],
          yEnd: relativeY
        }
      }

      // 更新下一個區域的 yStart
      if (draggingIndex + 1 < newRegions.length) {
        newRegions[draggingIndex + 1] = {
          ...newRegions[draggingIndex + 1],
          yStart: relativeY
        }
      }

      return newRegions
    })
  }

  /**
   * 處理滑鼠釋放（結束拖動）
   */
  const handleMouseUp = () => {
    setDraggingIndex(null)
  }

  /**
   * 確認佈局
   */
  const handleConfirm = () => {
    onConfirm(regions)
  }

  return (
    <Card className="shadow-lg border-2 border-primary">
      <CardHeader className="flex flex-col items-start space-y-2 bg-primary-50">
        <h3 className="text-lg font-semibold text-primary-700">📐 文件佈局預覽</h3>
        <p className="text-sm text-primary-600">
          拖動紅線調整段落邊界 • 確認後進行 OCR 辨識
        </p>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* 圖片預覽區域 */}
        <div
          ref={containerRef}
          className="relative w-full bg-default-100 rounded-lg overflow-hidden cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ userSelect: 'none' }}
        >
          {/* 原始圖片 */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="戶口名簿佈局預覽"
            className="w-full h-auto"
            draggable={false}
          />

          {/* 紅線和標籤覆蓋層 */}
          {regions.map((region, index) => {
            const isLast = index === regions.length - 1

            return (
              <div key={index}>
                {/* 區域標籤 */}
                <div
                  className="absolute left-2 px-2 py-1 bg-primary/80 text-white text-xs rounded pointer-events-none"
                  style={{
                    top: `${region.yStart * 100}%`,
                    transform: 'translateY(4px)'
                  }}
                >
                  {region.index}. {region.description}
                </div>

                {/* 區域底部紅線（可拖動，除了最後一個區域）*/}
                {!isLast && (
                  <div
                    className="absolute left-0 right-0 cursor-ns-resize group"
                    style={{
                      top: `${region.yEnd * 100}%`,
                      transform: 'translateY(-2px)',
                      height: '4px'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleMouseDown(index)
                    }}
                  >
                    {/* 紅線 */}
                    <div className="w-full h-[2px] bg-danger group-hover:h-[3px] transition-all" />

                    {/* 拖動提示點 */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-3 h-3 bg-danger rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 區域資訊表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-default-100">
              <tr>
                <th className="px-3 py-2 text-left">區域</th>
                <th className="px-3 py-2 text-left">類型</th>
                <th className="px-3 py-2 text-right">起始位置</th>
                <th className="px-3 py-2 text-right">結束位置</th>
                <th className="px-3 py-2 text-right">高度</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((region, index) => (
                <tr key={index} className="border-t border-default-200">
                  <td className="px-3 py-2">{region.index}. {region.description}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                      {region.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{(region.yStart * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right">{(region.yEnd * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right">{((region.yEnd - region.yStart) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <Button
            color="danger"
            variant="light"
            onClick={onCancel}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            color="primary"
            onClick={handleConfirm}
            className="flex-1"
          >
            確認佈局並開始 OCR
          </Button>
        </div>

        {/* 使用說明 */}
        <div className="p-3 bg-default-100 rounded-lg">
          <p className="text-xs text-default-600">
            💡 <strong>使用提示：</strong>將滑鼠移到紅線上，出現圓點後可上下拖動調整邊界。確認佈局正確後，點擊「確認佈局並開始 OCR」繼續。
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
