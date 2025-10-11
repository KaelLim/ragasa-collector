import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  VisitRecord,
  VisitRecordData,
  PendingVisitCase,
  generateVisitCode,
  getNextSequenceNumber
} from '@/lib/visit-record-types'

/**
 * 訪視紀錄 Hook
 */
export function useVisitRecord() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 獲取待訪視案件列表（步驟 0）
   * 查詢尚未建立訪視紀錄的申請案件
   */
  const fetchPendingVisitCases = useCallback(async (): Promise<PendingVisitCase[]> => {
    try {
      setLoading(true)
      setError(null)

      // 查詢所有申請，LEFT JOIN visit_records，篩選出尚未建立訪視記錄的
      const { data: applications, error: fetchError } = await supabase
        .from('disaster_applications')
        .select(`
          id,
          application_data,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // 獲取所有已建立訪視紀錄的 application_id
      const { data: visitRecords, error: visitError } = await supabase
        .from('visit_records')
        .select('application_id')

      if (visitError) throw visitError

      const visitedIds = new Set(visitRecords?.map(v => v.application_id) || [])

      // 過濾出尚未建立訪視記錄的申請
      const pending: PendingVisitCase[] = applications
        ?.filter(app => !visitedIds.has(app.id))
        .map(app => ({
          application_id: app.id,
          victim_name: app.application_data?.victim?.name || '-',
          application_number: app.id.substring(0, 8).toUpperCase(), // 使用 UUID 前8碼作為申請編號
          address: app.application_data?.victim?.address || '-',
          created_at: app.created_at
        })) || []

      return pending
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending visit cases'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 獲取所有訪視紀錄
   */
  const fetchVisitRecords = useCallback(async (): Promise<VisitRecord[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('visit_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return data as VisitRecord[]
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch visit records'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 根據 ID 獲取單筆訪視紀錄
   */
  const fetchVisitRecordById = useCallback(async (id: string): Promise<VisitRecord> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('visit_records')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return data as VisitRecord
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch visit record'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 根據申請 ID 獲取訪視紀錄
   */
  const fetchVisitRecordByApplicationId = useCallback(async (applicationId: string): Promise<VisitRecord | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('visit_records')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle()

      if (fetchError) throw fetchError

      return data as VisitRecord | null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch visit record by application ID'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 上傳單張照片到 Supabase Storage
   */
  const uploadPhoto = useCallback(async (
    file: File,
    folder: 'id-front' | 'id-back' | 'interactions' | 'receipts' | 'transcripts' | 'others'
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('visit-media')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('visit-media')
      .getPublicUrl(fileName)

    return data.publicUrl
  }, [])

  /**
   * 上傳多張照片到 Supabase Storage
   */
  const uploadMultiplePhotos = useCallback(async (
    files: File[],
    folder: 'interactions' | 'others'
  ): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadPhoto(file, folder))
    return Promise.all(uploadPromises)
  }, [uploadPhoto])

  /**
   * 新增訪視紀錄
   */
  const createVisitRecord = useCallback(async (
    applicationId: string,
    visitData: VisitRecordData
  ): Promise<VisitRecord> => {
    try {
      setLoading(true)
      setError(null)

      // 取得當前使用者
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // 獲取所有現有的訪視編號，計算流水號
      const { data: existingRecords } = await supabase
        .from('visit_records')
        .select('visit_code')

      const existingCodes = existingRecords?.map(r => r.visit_code) || []
      const sequenceNumber = getNextSequenceNumber(existingCodes, visitData.basic.village)

      // 生成訪視編號
      const visitCode = generateVisitCode(applicationId, visitData.basic.village, sequenceNumber)

      // 建立資料庫記錄
      const recordData = {
        application_id: applicationId,
        visit_code: visitCode,
        user_id: user.id,
        visit_data: visitData
      }

      const { data, error: insertError } = await supabase
        .from('visit_records')
        .insert(recordData)
        .select()
        .single()

      if (insertError) throw insertError

      return data as VisitRecord
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create visit record'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 更新訪視紀錄
   */
  const updateVisitRecord = useCallback(async (
    id: string,
    visitData: Partial<VisitRecordData>
  ): Promise<VisitRecord> => {
    try {
      setLoading(true)
      setError(null)

      // 獲取現有記錄
      const { data: existing, error: fetchError } = await supabase
        .from('visit_records')
        .select('visit_data')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // 合併更新資料
      const updatedData = {
        ...existing.visit_data,
        ...visitData,
        basic: { ...existing.visit_data.basic, ...visitData.basic },
        household: { ...existing.visit_data.household, ...visitData.household },
        status: { ...existing.visit_data.status, ...visitData.status },
        documents: { ...existing.visit_data.documents, ...visitData.documents },
        visit: { ...existing.visit_data.visit, ...visitData.visit }
      }

      const { data, error: updateError } = await supabase
        .from('visit_records')
        .update({ visit_data: updatedData })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      return data as VisitRecord
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update visit record'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 刪除訪視紀錄
   */
  const deleteVisitRecord = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('visit_records')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete visit record'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    fetchPendingVisitCases,
    fetchVisitRecords,
    fetchVisitRecordById,
    fetchVisitRecordByApplicationId,
    uploadPhoto,
    uploadMultiplePhotos,
    createVisitRecord,
    updateVisitRecord,
    deleteVisitRecord
  }
}
