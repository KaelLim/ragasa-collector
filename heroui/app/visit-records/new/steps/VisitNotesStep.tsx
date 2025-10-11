'use client'

import { useState, useRef } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Textarea } from '@heroui/input'
import { useTranslation } from 'react-i18next'
import type { VisitRecordData } from '@/lib/visit-record-types'
import CameraCapture from '@/components/CameraCapture'

interface VisitNotesStepProps {
  formData: Partial<VisitRecordData>
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
  onPrev: () => void
}

export default function VisitNotesStep({
  formData,
  setFormData,
  onNext,
  onPrev
}: VisitNotesStepProps) {
  const { i18n } = useTranslation()

  const [visitNotes, setVisitNotes] = useState<string>(
    formData.visit?.notes || ''
  )
  const [interactionPhotos, setInteractionPhotos] = useState<File[]>([])
  const [otherPhotos, setOtherPhotos] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState<File | null>(null)
  const [photoType, setPhotoType] = useState<'interaction' | 'other' | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // 開始錄音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)

        // 停止所有音訊軌道
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      console.log('🎤 開始錄音...')
    } catch (error) {
      console.error('❌ 錄音失敗:', error)
      alert(i18n.language === 'zh-TW' ? '無法存取麥克風' : 'Cannot access microphone')
    }
  }

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log('🛑 停止錄音')
    }
  }

  // 語音轉文字
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)
      console.log('🎙️ 開始語音轉文字...')
      console.log('📊 音訊大小:', Math.round(audioBlob.size / 1024), 'KB')

      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model', 'large-v3-turbo')
      formData.append('language', 'zh')  // ⭐ 關鍵：輸出繁體中文

      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`轉錄失敗: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ 轉錄完成:', result.text.substring(0, 100) + '...')

      // 將轉錄文字附加到訪視記錄
      setVisitNotes(prev => {
        const newText = prev ? `${prev}\n\n${result.text}` : result.text
        return newText
      })

      alert(i18n.language === 'zh-TW' ? '語音轉文字完成！' : 'Transcription completed!')
    } catch (error) {
      console.error('❌ 轉錄失敗:', error)
      alert(i18n.language === 'zh-TW'
        ? `語音轉文字失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
        : `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  // 添加互動照片
  const handleAddInteractionPhoto = (file: File) => {
    setInteractionPhotos(prev => [...prev, file])
    setCurrentPhoto(null)
    setPhotoType(null)
    console.log('✅ 互動照片已新增，總數:', interactionPhotos.length + 1)
  }

  // 添加其他佐證照片
  const handleAddOtherPhoto = (file: File) => {
    setOtherPhotos(prev => [...prev, file])
    setCurrentPhoto(null)
    setPhotoType(null)
    console.log('✅ 其他照片已新增，總數:', otherPhotos.length + 1)
  }

  // 移除照片
  const removePhoto = (type: 'interaction' | 'other', index: number) => {
    if (type === 'interaction') {
      setInteractionPhotos(prev => prev.filter((_, i) => i !== index))
    } else {
      setOtherPhotos(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleNext = () => {
    // 驗證（訪視記錄為選填）

    // 更新表單資料（暫存檔案物件，稍後在提交時上傳）
    setFormData(prev => ({
      ...prev,
      visit: {
        notes: visitNotes,
        interactionPhotos: [], // 實際 URLs 在提交時生成
        otherPhotos: []
      },
      // 暫存檔案物件供提交時使用
      _tempFiles: {
        interactionPhotos,
        otherPhotos
      }
    } as any))

    onNext()
  }

  return (
    <Card>
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {i18n.language === 'zh-TW' ? '步驟 4: 訪視記錄' : 'Step 4: Visit Notes'}
          </h2>
          <p className="text-default-500 text-sm">
            {i18n.language === 'zh-TW'
              ? '記錄訪視互動情形與現場照片'
              : 'Record visit interactions and on-site photos'}
          </p>
        </div>

        {/* 訪視互動情形記錄 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">
              {i18n.language === 'zh-TW' ? '訪視互動情形記錄' : 'Visit Interaction Notes'}
            </h3>
            {!isRecording && !isTranscribing && (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                onClick={startRecording}
                startContent={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                  </svg>
                }
              >
                {i18n.language === 'zh-TW' ? '語音輸入' : 'Voice Input'}
              </Button>
            )}
            {isRecording && (
              <Button
                size="sm"
                color="danger"
                onClick={stopRecording}
                startContent={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                  </svg>
                }
                isLoading={true}
              >
                {i18n.language === 'zh-TW' ? '錄音中...' : 'Recording...'}
              </Button>
            )}
            {isTranscribing && (
              <Button
                size="sm"
                color="warning"
                isLoading={true}
                disabled
              >
                {i18n.language === 'zh-TW' ? '轉錄中...' : 'Transcribing...'}
              </Button>
            )}
          </div>

          <Textarea
            label={i18n.language === 'zh-TW' ? '訪視互動情形' : 'Visit Interaction'}
            placeholder={i18n.language === 'zh-TW'
              ? '請描述訪視過程、受災戶狀況、對話內容等（建議 200-500 字）'
              : 'Describe visit process, victim situation, conversations, etc.'}
            value={visitNotes}
            onValueChange={setVisitNotes}
            minRows={6}
            classNames={{
              inputWrapper: "bg-default-100"
            }}
          />
          <p className="text-xs text-default-500">
            {i18n.language === 'zh-TW'
              ? '💡 提示：可使用「語音輸入」按鈕錄音，系統會自動轉為繁體中文文字'
              : '💡 Tip: Use "Voice Input" button to record, system will auto-convert to text'}
          </p>
        </div>

        {/* 互動照片上傳 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">
              {i18n.language === 'zh-TW' ? '互動照片' : 'Interaction Photos'}
            </h3>
            <Button
              size="sm"
              color="warning"
              variant="flat"
              onClick={() => {
                setPhotoType('interaction')
                setCurrentPhoto(null)
              }}
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
              }
            >
              {i18n.language === 'zh-TW' ? '新增照片' : 'Add Photo'}
            </Button>
          </div>

          {/* 照片拍攝/上傳 */}
          {photoType === 'interaction' && (
            <CameraCapture
              label={i18n.language === 'zh-TW' ? '互動照片' : 'Interaction Photo'}
              onCapture={(file) => handleAddInteractionPhoto(file)}
              currentImage={currentPhoto}
            />
          )}

          {/* 已上傳的互動照片列表 */}
          {interactionPhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interactionPhotos.map((photo, index) => (
                <div key={index} className="relative border-2 border-default-200 rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`互動照片 ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    size="sm"
                    color="danger"
                    isIconOnly
                    className="absolute top-2 right-2"
                    onClick={() => removePhoto('interaction', index)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                    照片 {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 其他佐證照片上傳（選填）*/}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">
                {i18n.language === 'zh-TW' ? '其他佐證照片' : 'Other Supporting Photos'}
              </h3>
              <p className="text-xs text-default-500">
                {i18n.language === 'zh-TW' ? '選填（如租賃契約、村長證明等）' : 'Optional (lease contract, village chief certificate, etc.)'}
              </p>
            </div>
            <Button
              size="sm"
              color="default"
              variant="flat"
              onClick={() => {
                setPhotoType('other')
                setCurrentPhoto(null)
              }}
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
              }
            >
              {i18n.language === 'zh-TW' ? '新增照片' : 'Add Photo'}
            </Button>
          </div>

          {/* 照片拍攝/上傳 */}
          {photoType === 'other' && (
            <CameraCapture
              label={i18n.language === 'zh-TW' ? '其他佐證照片' : 'Other Photo'}
              onCapture={(file) => handleAddOtherPhoto(file)}
              currentImage={currentPhoto}
            />
          )}

          {/* 已上傳的其他照片列表 */}
          {otherPhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {otherPhotos.map((photo, index) => (
                <div key={index} className="relative border-2 border-default-200 rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`其他照片 ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    size="sm"
                    color="danger"
                    isIconOnly
                    className="absolute top-2 right-2"
                    onClick={() => removePhoto('other', index)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                    其他 {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 按鈕 */}
        <div className="flex justify-between mt-8">
          <Button variant="flat" onClick={onPrev}>
            {i18n.language === 'zh-TW' ? '上一步' : 'Previous'}
          </Button>
          <Button color="warning" onClick={handleNext}>
            {i18n.language === 'zh-TW' ? '下一步' : 'Next'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
