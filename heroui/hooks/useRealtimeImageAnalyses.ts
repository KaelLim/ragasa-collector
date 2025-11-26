import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageAnalysis } from '@/types/database.types'

/**
 * Realtime 圖片分析訂閱 Hook
 * 監聽使用者的圖片分析記錄變化
 *
 * @param userId - 使用者 ID
 * @returns 圖片分析記錄列表、載入狀態、訂閱狀態、錯誤訊息
 */
export function useRealtimeImageAnalyses(userId: string | null) {
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('disconnected')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setAnalyses([])
      setIsLoading(false)
      setSubscriptionStatus('disconnected')
      return
    }

    // 載入初始資料
    const loadInitial = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('image_analyses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (queryError) {
          console.error('載入分析記錄失敗:', queryError)
          setError(queryError.message)
        } else {
          setAnalyses(data || [])
          setError(null)
        }
      } catch (err) {
        console.error('載入初始資料錯誤:', err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadInitial()

    // 訂閱 Realtime 更新
    const channel = supabase
      .channel(`user-${userId}-analyses`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'image_analyses',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Realtime 事件:', payload.eventType, payload.new?.id)

          if (payload.eventType === 'INSERT') {
            setAnalyses((prev) => [payload.new as ImageAnalysis, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setAnalyses((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as ImageAnalysis) : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setAnalyses((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime 訂閱狀態:', status)
        setSubscriptionStatus(status)

        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime 訂閱成功')
          setError(null)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime 訂閱失敗:', err)
          setError('Realtime 訂閱失敗，將使用輪詢模式')
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Realtime 訂閱超時')
          setError('Realtime 連線超時')
        }
      })

    return () => {
      console.log('🧹 清理 Realtime 訂閱')
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { analyses, isLoading, subscriptionStatus, error }
}

/**
 * 訂閱單張圖片的處理狀態
 *
 * @param imageId - 圖片分析 ID
 * @param onStatusChange - 狀態變更回調函數
 * @param onSubscriptionError - 訂閱錯誤回調函數（可選）
 * @returns 取消訂閱函數
 */
export function subscribeToProcessingStatus(
  imageId: string,
  onStatusChange: (status: string, data: ImageAnalysis) => void,
  onSubscriptionError?: (error: string) => void
) {
  const channel = supabase
    .channel(`processing-${imageId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'image_analyses',
        filter: `id=eq.${imageId}`
      },
      (payload) => {
        const newData = payload.new as ImageAnalysis
        console.log(`圖片 ${imageId} 狀態更新:`, newData.status)
        onStatusChange(newData.status, newData)

        // 處理完成或失敗時自動取消訂閱
        if (newData.status === 'completed' || newData.status === 'failed') {
          console.log('處理結束，自動取消訂閱')
          supabase.removeChannel(channel)
        }
      }
    )
    .subscribe((status, err) => {
      console.log('訂閱狀態:', status)

      if (status === 'SUBSCRIBED') {
        console.log('✅ 訂閱成功')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ 訂閱失敗:', err)
        onSubscriptionError?.('Realtime 訂閱失敗')
      } else if (status === 'TIMED_OUT') {
        console.warn('⏱️ 訂閱超時')
        onSubscriptionError?.('Realtime 連線超時')
      }
    })

  return () => {
    console.log('手動取消訂閱')
    supabase.removeChannel(channel)
  }
}
