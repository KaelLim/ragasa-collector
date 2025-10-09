/**
 * 戶口名簿批次 OCR Hook
 *
 * 功能：
 * 1. 批次處理 6 個戶口名簿切片
 * 2. 顯示處理進度
 * 3. 轉換為 HouseholdDataJSON 格式
 */

import { useState, useCallback } from 'react'
import { HouseholdDataJSON } from '@/components/HouseholdRegistration'

interface OCRProgress {
  current: number      // 目前處理的切片索引 (1-6)
  total: number        // 總切片數 (固定 6)
  percentage: number   // 進度百分比 (0-100)
  status: 'idle' | 'processing' | 'completed' | 'error'
  currentSegment?: string  // 目前處理的切片描述 (戶長/成員1-5)
}

interface OCRError {
  segmentIndex: number
  error: string
}

export function useHouseholdOCR() {
  const [progress, setProgress] = useState<OCRProgress>({
    current: 0,
    total: 6,
    percentage: 0,
    status: 'idle'
  })
  const [errors, setErrors] = useState<OCRError[]>([])

  /**
   * 批次處理 6 個戶口名簿切片
   * @param segments - 6 個切片的 Blob 陣列
   * @returns HouseholdDataJSON 格式資料
   */
  const processAllSegments = useCallback(async (segments: Blob[]): Promise<HouseholdDataJSON | null> => {
    if (segments.length !== 6) {
      console.error(`Expected 6 segments, got ${segments.length}`)
      setProgress({
        current: 0,
        total: 6,
        percentage: 0,
        status: 'error'
      })
      return null
    }

    setProgress({
      current: 0,
      total: 6,
      percentage: 0,
      status: 'processing'
    })
    setErrors([])

    const ocrResults: any[] = []
    const newErrors: OCRError[] = []

    // 逐一處理每個切片
    for (let i = 0; i < segments.length; i++) {
      const segmentIndex = i + 1
      const segmentName = segmentIndex === 1 ? '戶長' : `成員${segmentIndex - 1}`

      setProgress({
        current: segmentIndex,
        total: 6,
        percentage: Math.round((segmentIndex / 6) * 100),
        status: 'processing',
        currentSegment: segmentName
      })

      try {
        const formData = new FormData()
        formData.append('image', segments[i])
        formData.append('type', 'household')
        formData.append('segmentIndex', segmentIndex.toString())

        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `OCR failed for segment ${segmentIndex}`)
        }

        const result = await response.json()

        if (result.success && result.data) {
          ocrResults.push(result.data)
        } else {
          throw new Error(result.error || 'OCR processing failed')
        }

      } catch (error) {
        console.error(`OCR error for segment ${segmentIndex}:`, error)
        newErrors.push({
          segmentIndex,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        // 失敗時推入空資料，但保留 segmentIndex
        ocrResults.push({
          segmentIndex,
          name: '',
          gender: '',
          birthDate: '',
          idNumber: '',
          relationship: segmentIndex === 1 ? '戶長' : ''
        })
      }
    }

    setErrors(newErrors)
    setProgress({
      current: 6,
      total: 6,
      percentage: 100,
      status: newErrors.length === 0 ? 'completed' : 'error'
    })

    // 轉換為 HouseholdDataJSON 格式
    const householdData: HouseholdDataJSON = {
      householdHead: {
        id: 'head',
        name: ocrResults[0]?.name || '',
        gender: ocrResults[0]?.gender || '',
        birthDate: ocrResults[0]?.birthDate || '',
        idNumber: ocrResults[0]?.idNumber || '',
        relationship: '戶長'
      },
      members: []
    }

    // 處理 5 位成員 (索引 1-5)
    for (let i = 1; i < 6; i++) {
      const memberData = ocrResults[i] || {}
      householdData.members.push({
        id: `member-${i}`,
        name: memberData.name || '',
        gender: memberData.gender || '',
        birthDate: memberData.birthDate || '',
        idNumber: memberData.idNumber || '',
        relationship: memberData.relationship || ''
      })
    }

    return householdData
  }, [])

  /**
   * 重置進度和錯誤狀態
   */
  const reset = useCallback(() => {
    setProgress({
      current: 0,
      total: 6,
      percentage: 0,
      status: 'idle'
    })
    setErrors([])
  }, [])

  return {
    processAllSegments,
    progress,
    errors,
    reset,
    isProcessing: progress.status === 'processing',
    isCompleted: progress.status === 'completed',
    hasErrors: errors.length > 0
  }
}
