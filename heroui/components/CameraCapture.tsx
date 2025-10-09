'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { useTranslation } from 'react-i18next'
import ImageEditor from './ImageEditor'
import EXIF from 'exif-js'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  label: string
  isRequired?: boolean
  currentImage?: string | null
}

export default function CameraCapture({
  onCapture,
  label,
  isRequired = false,
  currentImage
}: CameraCaptureProps) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(currentImage ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [exifInfo, setExifInfo] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 後置鏡頭優先
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert(i18n.language === 'zh-TW' ? '無法存取相機，請檢查權限設定' : 'Cannot access camera, please check permissions')
    } finally {
      setIsLoading(false)
    }
  }, [i18n.language])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // 設定 canvas 尺寸為 video 尺寸
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // 繪製 video 畫面到 canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 轉換為 blob（使用最高品質）
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const imageUrl = URL.createObjectURL(blob)

        // 開啟編輯器
        setTempFile(file)
        setTempImageUrl(imageUrl)
        stopCamera()
        setIsOpen(false)
        setIsEditorOpen(true)
      }
    }, 'image/jpeg', 1.0)
  }, [stopCamera])

  const handleOpenCamera = () => {
    setIsOpen(true)
    startCamera()
  }

  const handleClose = () => {
    stopCamera()
    setIsOpen(false)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    handleOpenCamera()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)

      // 讀取 EXIF 資訊
      EXIF.getData(file as any, function(this: any) {
        const orientation = EXIF.getTag(this, 'Orientation')
        const make = EXIF.getTag(this, 'Make')
        const model = EXIF.getTag(this, 'Model')
        const dateTime = EXIF.getTag(this, 'DateTime')

        // 構建 EXIF 資訊字串
        const exifData = []
        if (orientation) exifData.push(`方向: ${orientation}`)
        if (make) exifData.push(`相機廠商: ${make}`)
        if (model) exifData.push(`相機型號: ${model}`)
        if (dateTime) exifData.push(`拍攝時間: ${dateTime}`)

        const exifStr = exifData.length > 0 ? exifData.join(', ') : null
        setExifInfo(exifStr)

        console.log('EXIF 資訊:', {
          orientation,
          make,
          model,
          dateTime,
          allData: EXIF.getAllTags(this)
        })
      })

      // 開啟編輯器
      setTempFile(file)
      setTempImageUrl(imageUrl)
      setIsEditorOpen(true)
    }
  }

  const handleImageSave = (editedFile: File) => {
    const imageUrl = URL.createObjectURL(editedFile)
    setCapturedImage(imageUrl)
    onCapture(editedFile)
    setIsEditorOpen(false)
    setTempFile(null)
    setTempImageUrl(null)
    // EXIF 資訊會保留，因為已經處理過方向校正
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">

      {capturedImage ? (
        <Card>
          <CardBody className="p-4">
            <img
              src={capturedImage}
              alt={label}
              className="w-full aspect-video object-cover rounded-lg mb-3"
            />
            {exifInfo && (
              <div className="text-xs text-gray-500 mb-2">
                {exifInfo}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="bordered"
                onClick={retakePhoto}
                className="flex-1"
              >
{i18n.language === 'zh-TW' ? '重新拍攝' : 'Retake'}
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
        <div className="flex gap-2 w-full">
          <Button
            color="primary"
            variant="bordered"
            onClick={handleOpenCamera}
            className="flex-1 aspect-video flex flex-col gap-2 h-auto min-h-[120px]"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0-5c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2z"/>
              <path d="M20 4h-3.17l-1.24-1.35c-.37-.41-.91-.65-1.47-.65H9.88c-.56 0-1.1.24-1.47.65L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l1.83-2h4.24l1.83 2H20v12z"/>
            </svg>
            {i18n.language === 'zh-TW' ? '拍照' : 'Camera'}
          </Button>
          <Button
            color="primary"
            variant="bordered"
            onClick={triggerFileUpload}
            className="flex-1 aspect-video flex flex-col gap-2 h-auto min-h-[120px]"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {i18n.language === 'zh-TW' ? '上傳圖片' : 'Upload'}
          </Button>
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="full"
        classNames={{
          base: "bg-black/90",
          backdrop: "bg-black/50"
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">
            {label}
          </ModalHeader>
          <ModalBody className="flex items-center justify-center">
            <div className="relative w-full max-w-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto rounded-lg"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onClick={handleClose}>
              {i18n.language === 'zh-TW' ? '取消' : 'Cancel'}
            </Button>
            <Button
              color="primary"
              onClick={capturePhoto}
              isDisabled={!stream || isLoading}
            >
              {i18n.language === 'zh-TW' ? '拍攝' : 'Capture'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload image file"
      />

      {/* 圖片編輯器 */}
      <ImageEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        imageFile={tempFile}
        imageUrl={tempImageUrl}
        onSave={handleImageSave}
        label={label}
      />
    </div>
  )
}