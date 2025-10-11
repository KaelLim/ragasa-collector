import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface HouseholdDocument {
  id: string
  type: 'household_registry' | 'household_transcript'
  file: File | null
  preview: string | null
  uploaded: boolean
  url?: string
}

export function useHouseholdUpload() {
  const [documents, setDocuments] = useState<HouseholdDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  /**
   * 新增戶籍文件
   */
  const addDocument = (type: 'household_registry' | 'household_transcript') => {
    const newDoc: HouseholdDocument = {
      id: `${type}_${Date.now()}`,
      type,
      file: null,
      preview: null,
      uploaded: false,
    }
    setDocuments(prev => [...prev, newDoc])
  }

  /**
   * 更新文件（拍照或選擇檔案後）
   */
  const updateDocument = (id: string, file: File, preview: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id
          ? { ...doc, file, preview, uploaded: false }
          : doc
      )
    )
  }

  /**
   * 移除文件
   */
  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
  }

  /**
   * 上傳單一文件到 Supabase Storage
   */
  const uploadDocument = async (doc: HouseholdDocument): Promise<string | null> => {
    if (!doc.file) return null

    try {
      const fileExt = doc.file.name.split('.').pop()
      const fileName = `${doc.type}_${Date.now()}.${fileExt}`
      const filePath = `household-documents/${fileName}`

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, doc.file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // 返回檔案路徑（用於 Signed URL）
      return data.path
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  /**
   * 批次上傳所有文件
   */
  const uploadAllDocuments = async (): Promise<Record<string, string>> => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const uploadedUrls: Record<string, string> = {}

      for (const doc of documents) {
        if (doc.file && !doc.uploaded) {
          const url = await uploadDocument(doc)
          if (url) {
            uploadedUrls[doc.type] = url
            // 標記為已上傳
            setDocuments(prev =>
              prev.map(d =>
                d.id === doc.id ? { ...d, uploaded: true, url } : d
              )
            )
          }
        }
      }

      return uploadedUrls
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上傳失敗'
      setUploadError(errorMessage)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  /**
   * 驗證是否至少有一份文件
   */
  const validateDocuments = (): boolean => {
    return documents.some(doc => doc.file !== null)
  }

  /**
   * 重置所有狀態
   */
  const reset = () => {
    setDocuments([])
    setIsUploading(false)
    setUploadError(null)
  }

  return {
    documents,
    isUploading,
    uploadError,
    addDocument,
    updateDocument,
    removeDocument,
    uploadAllDocuments,
    validateDocuments,
    reset,
  }
}
