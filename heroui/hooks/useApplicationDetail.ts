/**
 * 申請詳情查詢 Hook（支援 JSONB 格式）
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ApplicationData {
  id: string
  user_id: string
  application_data: {
    household?: {
      header: any
      householdHead: any
      members: any[]
    }
    victim: {
      name: string
      idNumber: string
      phone: string
      address: string
    }
    agent: {
      hasAgent: boolean
      name?: string
      idNumber?: string
      address?: string
    }
    bank: {
      code: string
      name: string
      branch: string
      account: string
      accountName: string
    }
    contact: {
      option: string
      phoneNumber: string | null
    }
    signature: string | null
    media: any
    additionalFiles: string[] | null
  }
  status: string
  created_at: string
  updated_at: string
}

export function useApplicationDetail(applicationId: string | null) {
  const [application, setApplication] = useState<ApplicationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!applicationId) {
      setLoading(false)
      return
    }

    fetchApplication(applicationId)
  }, [applicationId])

  const fetchApplication = async (id: string) => {
    setLoading(true)
    setError('')

    try {
      console.log('🔍 查詢申請詳情:', id)

      const { data, error: fetchError } = await supabase
        .from('disaster_applications')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('❌ 查詢錯誤:', fetchError)
        throw fetchError
      }

      if (!data) {
        throw new Error('找不到申請記錄')
      }

      console.log('✅ 查詢成功:', data)
      setApplication(data as ApplicationData)

    } catch (err: any) {
      console.error('申請詳情查詢失敗:', err)
      setError(err.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    if (applicationId) {
      fetchApplication(applicationId)
    }
  }

  return {
    application,
    loading,
    error,
    refresh
  }
}
