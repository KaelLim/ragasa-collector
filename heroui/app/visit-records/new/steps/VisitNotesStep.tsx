'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Textarea } from '@heroui/input'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Select, SelectItem } from '@heroui/select'
import { useTranslation } from 'react-i18next'
import type { VisitRecordData } from '@/lib/visit-record-types'
import CameraCapture from '@/components/CameraCapture'

interface VisitNotesStepProps {
  formData: Partial<VisitRecordData>
  applicationData: any  // 個資主檔資料（包含戶口名簿）
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
  onPrev: () => void
}

export default function VisitNotesStep({
  formData,
  applicationData,
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
  const [isPaused, setIsPaused] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [currentPhoto, setCurrentPhoto] = useState<File | null>(null)
  const [photoType, setPhotoType] = useState<'interaction' | 'other' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // 多段錄音管理
  const [recordingSegments, setRecordingSegments] = useState<{
    text: string
    duration: number
    timestamp: string
    audioPath: string  // Storage 檔案路徑
  }[]>([])
  const [currentPhase, setCurrentPhase] = useState(1)  // 當前段落編號

  // 麥克風設定
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([])
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('')
  const [isMicSettingsOpen, setIsMicSettingsOpen] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 載入可用的麥克風列表
  useEffect(() => {
    loadMicrophones()
  }, [])

  // 錄音計時器
  useEffect(() => {
    if (isRecording && !isPaused) {
      // 開始計時
      recordingStartTimeRef.current = Date.now() - (recordingDuration * 1000)
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
        setRecordingDuration(elapsed)
      }, 100)  // 每 100ms 更新一次
    } else {
      // 停止計時
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isRecording, isPaused])

  const loadMicrophones = async () => {
    try {
      // 先請求權限
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // 獲取所有音訊輸入裝置
      const devices = await navigator.mediaDevices.enumerateDevices()
      const microphones = devices.filter(device => device.kind === 'audioinput')

      setAvailableMicrophones(microphones)

      // 如果尚未選擇，使用第一個麥克風
      if (!selectedMicrophoneId && microphones.length > 0) {
        setSelectedMicrophoneId(microphones[0].deviceId)
      }

      console.log('🎤 可用麥克風:', microphones.length)
      microphones.forEach((mic, index) => {
        console.log(`  ${index + 1}. ${mic.label || `麥克風 ${index + 1}`} (${mic.deviceId.substring(0, 8)}...)`)
      })
    } catch (error) {
      console.error('❌ 無法獲取麥克風列表:', error)
    }
  }

  // 開始錄音
  const startRecording = async () => {
    try {
      // 使用選擇的麥克風
      const constraints: MediaStreamConstraints = {
        audio: selectedMicrophoneId
          ? { deviceId: { exact: selectedMicrophoneId } }
          : true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      const selectedMic = availableMicrophones.find(m => m.deviceId === selectedMicrophoneId)
      console.log('🎤 使用麥克風:', selectedMic?.label || '預設麥克風')

      // 使用 MP3 格式（Whisper 更相容）
      // 檢查瀏覽器是否支援 MP3 編碼
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      console.log('🎵 錄音格式:', mimeType)

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // 使用錄音時的 mimeType
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        console.log('🎵 錄音完成，格式:', mimeType, '大小:', Math.round(audioBlob.size / 1024), 'KB')

        // 上傳最後一個段落到 Storage
        try {
          const { supabase } = await import('@/lib/supabase')
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
          const fileName = `temp/audio/phase${currentPhase}.${extension}`

          console.log(`💾 上傳最後段落: ${fileName}`)

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, audioBlob, {
              cacheControl: '3600',
              upsert: true
            })

          if (!uploadError) {
            console.log(`✅ 最後段落已上傳`)
            // 轉換最後一個段落
            await transcribeAudioSegment(audioBlob, recordingDuration, fileName)
          }
        } catch (error) {
          console.error('❌ 最後段落上傳失敗:', error)
        }

        // 停止所有音訊軌道
        stream.getTracks().forEach(track => track.stop())
      }

      // 開始錄音（每秒產生一次資料）
      mediaRecorder.start(1000)  // timeslice: 1000ms
      setIsRecording(true)
      setIsPaused(false)
      setRecordingDuration(0)
      recordingStartTimeRef.current = Date.now()
      console.log('🎤 開始錄音（每秒收集資料）...')
    } catch (error) {
      console.error('❌ 錄音失敗:', error)
      setErrorMessage(i18n.language === 'zh-TW' ? '無法存取麥克風，請檢查權限設定' : 'Cannot access microphone, please check permissions')
    }
  }

  // 暫停錄音並轉換
  const pauseRecording = async () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      // 先請求最後的資料
      mediaRecorderRef.current.requestData()

      // 等待 ondataavailable 觸發
      await new Promise(resolve => setTimeout(resolve, 100))

      mediaRecorderRef.current.pause()
      setIsPaused(true)
      console.log(`⏸️  暫停錄音（段落 ${currentPhase}），準備轉換...`)
      console.log('📊 已收集資料段數:', audioChunksRef.current.length)

      // 檢查是否有錄音資料
      if (audioChunksRef.current.length === 0) {
        console.warn('⚠️  無錄音資料，跳過轉換')
        setErrorMessage('錄音時間太短，請至少錄製 3 秒')
        return
      }

      // 建立音訊 Blob
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current.mimeType
      })
      console.log('🎵 段落音訊大小:', Math.round(audioBlob.size / 1024), 'KB')

      // 檢查音訊大小（至少 5 KB）
      if (audioBlob.size < 5000) {
        console.warn('⚠️  音訊檔案太小:', audioBlob.size, 'bytes')
        setErrorMessage('錄音時間太短，請至少錄製 3 秒')
        return
      }

      // 1. 先上傳音訊到 Storage（temp/audio/phaseX）
      console.log(`💾 上傳音訊到 Storage: temp/audio/phase${currentPhase}`)

      try {
        const { supabase } = await import('@/lib/supabase')
        const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
        const fileName = `temp/audio/phase${currentPhase}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, audioBlob, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) throw uploadError

        console.log(`✅ 音訊已上傳: ${fileName}`)

        // 2. 轉換當前段落（傳遞檔案路徑）
        await transcribeAudioSegment(audioBlob, recordingDuration, fileName)

        // 3. 轉換完成後清空 chunks，準備下一段
        audioChunksRef.current = []
        console.log('🗑️  段落轉換完成，已清空緩衝區')

        // 4. 遞增段落編號
        setCurrentPhase(prev => prev + 1)

      } catch (error) {
        console.error('❌ 音訊上傳失敗:', error)
        setErrorMessage('音訊檔案上傳失敗')
      }
    }
  }

  // 繼續錄音
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      // 此時 chunks 應該已經在暫停時清空了
      console.log('▶️  繼續錄音（新段落）...')
      console.log('📊 緩衝區狀態:', audioChunksRef.current.length, '個資料段')

      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // 重置計時器（新段落從 0 開始）
      setRecordingDuration(0)
      recordingStartTimeRef.current = Date.now()

      console.log('⏱️  計時器已重置')
    }
  }

  // 完全停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      setRecordingDuration(0)
      console.log('🛑 完全停止錄音')
    }
  }

  // 格式化時長（秒 → mm:ss）
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 語音轉文字（段落）
  const transcribeAudioSegment = async (audioBlob: Blob, duration: number, audioPath: string) => {
    try {
      setIsTranscribing(true)
      console.log('🎙️ 開始語音轉文字...')
      console.log('📁 音訊檔案:', audioPath)
      console.log('📊 音訊大小:', Math.round(audioBlob.size / 1024), 'KB')
      console.log('📊 音訊格式:', audioBlob.type)
      console.log('⏱️  段落時長:', formatDuration(duration))

      // 根據 MIME type 決定副檔名
      const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      const fileName = `recording.${extension}`

      const formData = new FormData()
      formData.append('file', audioBlob, fileName)
      formData.append('model', 'large-v3-turbo')
      formData.append('language', 'zh')

      // 傳遞戶口名簿資料供 Qwen3 比對
      if (applicationData?.application_data?.household) {
        const householdInfo = {
          householdHead: applicationData.application_data.household.householdHead,
          members: applicationData.application_data.household.members || []
        }
        formData.append('householdData', JSON.stringify(householdInfo))
        console.log('📋 已加入戶口名簿資料供比對')
      }

      console.log('📤 發送檔案:', fileName, '大小:', Math.round(audioBlob.size / 1024), 'KB')

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

      // 保存到錄音段落列表（包含音訊檔案路徑）
      const segment = {
        text: result.text,
        duration: duration,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        audioPath: audioPath
      }

      setRecordingSegments(prev => [...prev, segment])
      console.log('📝 錄音段落已保存，總段落數:', recordingSegments.length + 1)
      console.log('📁 音訊檔案:', audioPath)

      // 同時附加到訪視記錄
      setVisitNotes(prev => {
        const newText = prev ? `${prev}\n\n${result.text}` : result.text
        return newText
      })

      // 清除錯誤訊息（成功時）
      setErrorMessage('')
      console.log('✅ 段落', recordingSegments.length + 1, '轉換完成')
    } catch (error) {
      console.error('❌ 轉錄失敗:', error)
      setErrorMessage(i18n.language === 'zh-TW'
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

        {/* 錯誤訊息顯示 */}
        {errorMessage && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-danger-600 flex-shrink-0">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-danger-800">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-danger-600 hover:text-danger-800"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 訪視互動情形記錄 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">
              {i18n.language === 'zh-TW' ? '訪視互動情形記錄' : 'Visit Interaction Notes'}
            </h3>
            <div className="flex gap-2">
              {!isRecording && !isTranscribing && (
                <>
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
                  {availableMicrophones.length > 1 && (
                    <Button
                      size="sm"
                      variant="flat"
                      isIconOnly
                      onClick={() => setIsMicSettingsOpen(true)}
                      title={i18n.language === 'zh-TW' ? '麥克風設定' : 'Microphone Settings'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                      </svg>
                    </Button>
                  )}
                </>
              )}
              {isRecording && !isPaused && (
                <>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    disabled
                    startContent={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse">
                        <circle cx="12" cy="12" r="8" fill="currentColor" />
                      </svg>
                    }
                  >
                    {formatDuration(recordingDuration)}
                  </Button>
                  <Button
                    size="sm"
                    color="warning"
                    onClick={pauseRecording}
                    startContent={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                      </svg>
                    }
                  >
                    {i18n.language === 'zh-TW' ? '暫停' : 'Pause'}
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    onClick={stopRecording}
                    startContent={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18,18H6V6H18V18Z" />
                      </svg>
                    }
                  >
                    {i18n.language === 'zh-TW' ? '停止' : 'Stop'}
                  </Button>
                </>
              )}
              {isRecording && isPaused && (
                <>
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    disabled
                  >
                    ⏸️ {formatDuration(recordingDuration)}
                  </Button>
                  <Button
                    size="sm"
                    color="success"
                    onClick={resumeRecording}
                    startContent={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                      </svg>
                    }
                  >
                    {i18n.language === 'zh-TW' ? '繼續錄音' : 'Resume'}
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    onClick={stopRecording}
                  >
                    {i18n.language === 'zh-TW' ? '完全停止' : 'Stop All'}
                  </Button>
                </>
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
          </div>

          {/* 已錄製段落列表 */}
          {recordingSegments.length > 0 && (
            <div className="bg-success-100/50 dark:bg-success-900/20 rounded-lg p-4 space-y-2 border border-success-200 dark:border-success-800">
              <h4 className="font-semibold text-sm text-success-700 dark:text-success-400">
                {i18n.language === 'zh-TW' ? `已錄製 ${recordingSegments.length} 個段落` : `${recordingSegments.length} Segments Recorded`}
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recordingSegments.map((segment, index) => (
                  <div key={index} className="bg-default-100 dark:bg-default-50 rounded p-3 border border-default-200 dark:border-default-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-success-700 dark:text-success-500">
                        段落 {index + 1}
                      </span>
                      <span className="text-default-600 dark:text-default-400 text-xs">
                        {formatDuration(segment.duration)} • {segment.timestamp}
                      </span>
                    </div>
                    <p className="text-default-800 dark:text-default-200 text-sm line-clamp-2">
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* 麥克風設定 Modal */}
      <Modal
        isOpen={isMicSettingsOpen}
        onClose={() => setIsMicSettingsOpen(false)}
        size="md"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-bold">
              {i18n.language === 'zh-TW' ? '麥克風設定' : 'Microphone Settings'}
            </h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-default-600">
                {i18n.language === 'zh-TW'
                  ? '偵測到多支麥克風，請選擇要使用的麥克風裝置'
                  : 'Multiple microphones detected, please select the device to use'}
              </p>

              <Select
                label={i18n.language === 'zh-TW' ? '選擇麥克風' : 'Select Microphone'}
                aria-label="麥克風選擇"
                selectedKeys={selectedMicrophoneId ? [selectedMicrophoneId] : []}
                onSelectionChange={(keys) => {
                  const deviceId = Array.from(keys)[0] as string
                  setSelectedMicrophoneId(deviceId)
                  console.log('🎤 已選擇麥克風:', availableMicrophones.find(m => m.deviceId === deviceId)?.label)
                }}
                classNames={{
                  trigger: "bg-default-100"
                }}
              >
                {availableMicrophones.map((mic, index) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `麥克風 ${index + 1}`}
                  </SelectItem>
                ))}
              </Select>

              <div className="bg-primary-50 rounded-lg p-3">
                <p className="text-xs text-primary-800">
                  💡 {i18n.language === 'zh-TW'
                    ? '提示：選擇後點擊「確定」，再點擊「語音輸入」開始錄音'
                    : 'Tip: After selection, click "Confirm", then click "Voice Input" to start recording'}
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onClick={() => setIsMicSettingsOpen(false)}
            >
              {i18n.language === 'zh-TW' ? '取消' : 'Cancel'}
            </Button>
            <Button
              color="primary"
              onClick={() => setIsMicSettingsOpen(false)}
            >
              {i18n.language === 'zh-TW' ? '確定' : 'Confirm'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  )
}
