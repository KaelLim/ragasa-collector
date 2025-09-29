'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@heroui/button'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { useTranslation } from 'react-i18next'
import EXIF from 'exif-js'

interface ImageEditorProps {
  isOpen: boolean
  onClose: () => void
  imageFile: File | null
  imageUrl: string | null
  onSave: (file: File) => void
  label?: string
}

export default function ImageEditor({
  isOpen,
  onClose,
  imageFile,
  imageUrl,
  onSave,
  label = ''
}: ImageEditorProps) {
  const { i18n } = useTranslation()
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [isProcessing, setIsProcessing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageSrc, setImageSrc] = useState<string>('')
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [imageInfo, setImageInfo] = useState<string>('')

  // 載入圖片
  useEffect(() => {
    if (imageUrl) {
      setImageSrc(imageUrl)
    } else if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageSrc(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [imageFile, imageUrl])

  // 載入原始圖片並處理 EXIF 方向
  useEffect(() => {
    if (!imageSrc) return

    const processImage = async () => {
      // 如果有原始檔案，先讀取 EXIF 資訊
      if (imageFile) {
        try {
          await new Promise<void>((resolve) => {
            EXIF.getData(imageFile as any, function(this: any) {
              const orientation = EXIF.getTag(this, 'Orientation')
              console.log(`EXIF Orientation: ${orientation || 1}`)

              const img = new Image()
              img.onload = () => {
                // 記錄圖片資訊
                const info = `原始尺寸: ${img.width}×${img.height}, EXIF: ${orientation || 1}`
                setImageInfo(info)
                console.log(`圖片資訊 - ${info}`)

                setOriginalImage(img)
                if (canvasRef.current) {
                  handleExifOrientation(img, orientation || 1)
                }
                resolve()
              }
              img.src = imageSrc
            })
          })
        } catch (error) {
          console.error('Error reading EXIF data:', error)
          // 如果 EXIF 讀取失敗，仍然載入圖片
          const img = new Image()
          img.onload = () => {
            setOriginalImage(img)
            if (canvasRef.current) {
              handleExifOrientation(img, 1)
            }
          }
          img.src = imageSrc
        }
      } else {
        // 如果沒有原始檔案（例如從 URL 載入），直接載入圖片
        const img = new Image()
        img.onload = () => {
          setOriginalImage(img)
          if (canvasRef.current) {
            handleExifOrientation(img, 1)
          }
        }
        img.src = imageSrc
      }
    }

    processImage()
  }, [imageSrc, imageFile])

  // 更新畫布
  const updateCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 設定畫布大小
    const maxWidth = 600
    const maxHeight = 400
    let width = originalImage.width
    let height = originalImage.height

    // 保持長寬比縮放
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width *= ratio
      height *= ratio
    }

    canvas.width = width
    canvas.height = height

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 儲存當前狀態
    ctx.save()

    // 移動到中心點
    ctx.translate(canvas.width / 2, canvas.height / 2)

    // 旋轉
    ctx.rotate((rotation * Math.PI) / 180)

    // 縮放
    ctx.scale(scale, scale)

    // 套用濾鏡
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`

    // 繪製圖片（從中心點）
    ctx.drawImage(
      originalImage,
      -width / 2,
      -height / 2,
      width,
      height
    )

    // 恢復狀態
    ctx.restore()
  }, [rotation, scale, brightness, contrast, originalImage])

  // 處理 EXIF 方向
  const handleExifOrientation = useCallback((img: HTMLImageElement, orientation: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = img.width
    let height = img.height

    // 設定最大尺寸
    const maxWidth = 800
    const maxHeight = 600

    // 計算縮放比例
    let scale = 1
    if (width > maxWidth || height > maxHeight) {
      scale = Math.min(maxWidth / width, maxHeight / height)
      width *= scale
      height *= scale
    }

    // 根據 EXIF 方向調整畫布大小
    // 方向 5-8 需要交換寬高
    if (orientation > 4 && orientation <= 8) {
      canvas.width = height
      canvas.height = width
    } else {
      canvas.width = width
      canvas.height = height
    }

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 儲存當前狀態
    ctx.save()

    // 根據 EXIF 方向應用變換
    switch (orientation) {
      case 2: // 水平翻轉
        ctx.transform(-1, 0, 0, 1, canvas.width, 0)
        break
      case 3: // 旋轉 180 度
        ctx.transform(-1, 0, 0, -1, canvas.width, canvas.height)
        break
      case 4: // 垂直翻轉
        ctx.transform(1, 0, 0, -1, 0, canvas.height)
        break
      case 5: // 垂直翻轉 + 順時針旋轉 90 度
        ctx.transform(0, 1, 1, 0, 0, 0)
        break
      case 6: // 順時針旋轉 90 度（最常見：手機直拍）
        // 實際上需要逆時針旋轉 90 度來修正
        ctx.transform(0, -1, 1, 0, 0, canvas.height)
        break
      case 7: // 水平翻轉 + 順時針旋轉 90 度
        ctx.transform(0, -1, -1, 0, canvas.width, canvas.height)
        break
      case 8: // 逆時針旋轉 90 度
        ctx.transform(0, 1, -1, 0, canvas.width, 0)
        break
      default: // 方向 1 或未定義，不需要轉換
        break
    }

    // 繪製圖片 - 使用縮放後的尺寸
    // 注意：對於旋轉的情況，畫布已經交換了寬高，但繪製時仍使用原始的寬高
    ctx.drawImage(img, 0, 0, width, height)

    // 恢復狀態
    ctx.restore()

    // 將修正後的圖片設為原始圖片
    const correctedImg = new Image()
    correctedImg.onload = () => {
      setOriginalImage(correctedImg)
      updateCanvas()
    }
    correctedImg.src = canvas.toDataURL('image/jpeg', 0.95)
  }, [updateCanvas])

  // 當參數改變時更新畫布
  useEffect(() => {
    updateCanvas()
  }, [updateCanvas])

  // 旋轉 90 度
  const rotateImage = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360)
  }

  // 重置所有設定
  const resetSettings = () => {
    setRotation(0)
    setScale(1)
    setBrightness(100)
    setContrast(100)
  }

  // 儲存編輯後的圖片
  const handleSave = async () => {
    if (!canvasRef.current) return

    setIsProcessing(true)
    try {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const fileName = imageFile?.name || `edited-${Date.now()}.jpg`
          const file = new File([blob], fileName, { type: 'image/jpeg' })
          onSave(file)
          onClose()
          resetSettings()
        }
      }, 'image/jpeg', 0.9)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {label || (i18n.language === 'zh-TW' ? '編輯圖片' : 'Edit Image')}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 圖片顯示區 */}
            <div className="flex-1 bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto border border-gray-300 rounded"
              />
            </div>

            {/* 控制面板 */}
            <div className="w-full lg:w-80 space-y-4">
              {/* 圖片資訊 */}
              {imageInfo && (
                <div className="text-sm text-gray-400 p-2 bg-gray-800 rounded">
                  {imageInfo}
                </div>
              )}

              {/* 旋轉控制 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">{i18n.language === 'zh-TW' ? '旋轉' : 'Rotation'}</span>
                  <span className="text-sm text-gray-400">{rotation}°</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => rotateImage(-90)}
                  >
                    ↶ 90°
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => rotateImage(90)}
                  >
                    ↷ 90°
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => setRotation(0)}
                  >
                    {i18n.language === 'zh-TW' ? '重置' : 'Reset'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            variant="light"
            onPress={onClose}
          >
            {i18n.language === 'zh-TW' ? '取消' : 'Cancel'}
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={isProcessing}
          >
            {i18n.language === 'zh-TW' ? '儲存' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}