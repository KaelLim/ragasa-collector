'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { useTranslation } from 'react-i18next'

interface SignatureCanvasProps {
  onSave: (file: File) => void
  label: string
  isRequired?: boolean
  currentSignature?: string | null
}

export default function SignatureCanvas({
  onSave,
  label,
  isRequired = false,
  currentSignature
}: SignatureCanvasProps) {
  const { i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!currentSignature)
  const [signatureImage, setSignatureImage] = useState<string | null>(currentSignature ?? null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // 設定 canvas 樣式
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'

    // 設定 canvas 尺寸
    canvas.width = canvas.offsetWidth * 2 // 提高解析度
    canvas.height = canvas.offsetHeight * 2
    context.scale(2, 2)

    // 設定背景為白色
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    setIsDrawing(true)
    context.beginPath()
    context.moveTo(pos.x, pos.y)
  }, [])

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawing) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.lineTo(pos.x, pos.y)
    context.stroke()
    setHasSignature(true)
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    // 完全清除並重置 canvas
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // 重新設定 canvas 樣式
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'

    setHasSignature(false)
    setSignatureImage(null)
  }, [])

  const addWatermark = useCallback((canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const timeStr = now.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const canvasWidth = canvas.width / 2 // 因為 scale(2, 2)
    const canvasHeight = canvas.height / 2

    // 設定 watermark 樣式
    context.save()
    context.globalAlpha = 0.15
    context.fillStyle = '#666666'
    context.font = '16px Arial, sans-serif'

    const watermarkUnit = `慈濟基金會 ${dateStr} ${timeStr}   ` // 加入間距
    const unitWidth = context.measureText(watermarkUnit).width
    const lineHeight = 40 // 行高

    // 計算部分文字的輔助函數
    const getPartialText = (fullText: string, maxWidth: number) => {
      for (let i = fullText.length; i > 0; i--) {
        const partialText = fullText.substring(0, i)
        if (context.measureText(partialText).width <= maxWidth) {
          return partialText
        }
      }
      return ''
    }

    // 創建連續的水平文字流
    for (let y = lineHeight; y <= canvasHeight; y += lineHeight) {
      let currentX = 0

      while (currentX < canvasWidth) {
        // 計算當前位置可以容納多少完整文字
        const remainingWidth = canvasWidth - currentX

        if (remainingWidth >= unitWidth) {
          // 足夠空間，繪製完整文字
          context.fillText(watermarkUnit, currentX, y)
          currentX += unitWidth
        } else {
          // 空間不足，繪製部分文字直到邊界
          const partialText = getPartialText(watermarkUnit, remainingWidth)
          if (partialText) {
            context.fillText(partialText, currentX, y)
          }
          break
        }
      }
    }

    context.restore()
  }, [])

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !hasSignature) return

    // 添加 watermark
    addWatermark(canvas, context)

    // 轉換為 PNG blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' })
        const imageUrl = URL.createObjectURL(blob)

        setSignatureImage(imageUrl)
        onSave(file)
      }
    }, 'image/png')
  }, [hasSignature, addWatermark, onSave])

  // 滑鼠事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing(getMousePos(e))
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draw(getMousePos(e))
  }

  const handleMouseUp = () => {
    stopDrawing()
  }

  // 觸控事件
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    startDrawing(getTouchPos(e))
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    draw(getTouchPos(e))
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing()
  }

  return (
    <div className="space-y-3">

      {signatureImage ? (
        <Card>
          <CardBody className="p-4">
            <img
              src={signatureImage}
              alt={label}
              className="w-full h-48 object-contain bg-white rounded-lg border mb-3"
            />
            <div className="flex gap-2">
              <Button
                variant="bordered"
                onClick={() => {
                  // 完全重置簽名組件
                  setSignatureImage(null)
                  setHasSignature(false)
                  clearSignature()

                  // 強制重新初始化 canvas
                  setTimeout(() => {
                    const canvas = canvasRef.current
                    const context = canvas?.getContext('2d')
                    if (!canvas || !context) return

                    // 重新設定 canvas 尺寸和樣式
                    canvas.width = canvas.offsetWidth * 2
                    canvas.height = canvas.offsetHeight * 2
                    context.scale(2, 2)
                    context.strokeStyle = '#000000'
                    context.lineWidth = 2
                    context.lineCap = 'round'
                    context.lineJoin = 'round'
                    context.fillStyle = '#ffffff'
                    context.fillRect(0, 0, canvas.width, canvas.height)
                  }, 10)
                }}
                className="flex-1"
              >
{i18n.language === 'zh-TW' ? '重新簽名' : 'Re-sign'}
              </Button>
              <Button
                color="success"
                className="flex-1"
                disabled
              >
{i18n.language === 'zh-TW' ? '已完成' : 'Completed'} ✓
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-4">
            <div className="text-center mb-3">
              <p className="text-sm text-default-500">
                {i18n.language === 'zh-TW'
                  ? '請在下方區域內簽名'
                  : 'Please sign in the area below'
                }
              </p>
            </div>

            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full h-48 border border-default-300 rounded-lg cursor-crosshair touch-none bg-white"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            />

            <div className="flex gap-2 mt-3">
              <Button
                variant="bordered"
                onClick={clearSignature}
                className="flex-1"
                isDisabled={!hasSignature}
              >
{i18n.language === 'zh-TW' ? '清除' : 'Clear'}
              </Button>
              <Button
                color="primary"
                onClick={saveSignature}
                className="flex-1"
                isDisabled={!hasSignature}
              >
{i18n.language === 'zh-TW' ? '完成簽名' : 'Complete Signature'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}