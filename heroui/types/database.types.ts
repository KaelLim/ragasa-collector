export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // 圖片分析主表
      image_analyses: {
        Row: {
          id: string
          user_id: string | null
          tenant_id: string
          image_name: string
          image_url: string
          thumbnail_key: string | null
          exif_datetime: string | null
          exif_gps: Json | null
          exif_camera: string | null
          exif_raw: Json | null
          event_description: string | null
          caption: string | null
          tags: Json | null
          caption_embedding: number[] | null  // vector(2000)
          tags_embedding: number[] | null     // vector(2000)
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          tenant_id?: string
          image_name: string
          image_url: string
          thumbnail_key?: string | null
          exif_datetime?: string | null
          exif_gps?: Json | null
          exif_camera?: string | null
          exif_raw?: Json | null
          event_description?: string | null
          caption?: string | null
          tags?: Json | null
          caption_embedding?: number[] | null
          tags_embedding?: number[] | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          tenant_id?: string
          image_name?: string
          image_url?: string
          thumbnail_key?: string | null
          exif_datetime?: string | null
          exif_gps?: Json | null
          exif_camera?: string | null
          exif_raw?: Json | null
          event_description?: string | null
          caption?: string | null
          tags?: Json | null
          caption_embedding?: number[] | null
          tags_embedding?: number[] | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
          processed_at?: string | null
        }
      }
      // AI 處理佇列表
      processing_queue: {
        Row: {
          id: string
          image_id: string | null
          status: 'queued' | 'processing' | 'completed' | 'failed'
          priority: number
          retry_count: number
          max_retries: number
          created_at: string
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          last_error_at: string | null
        }
        Insert: {
          id?: string
          image_id?: string | null
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          priority?: number
          retry_count?: number
          max_retries?: number
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          last_error_at?: string | null
        }
        Update: {
          id?: string
          image_id?: string | null
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          priority?: number
          retry_count?: number
          max_retries?: number
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          last_error_at?: string | null
        }
      }
      // 提示詞元數據表
      prompts: {
        Row: {
          id: string
          prompt_type: 'caption' | 'tags'
          name: string
          description: string | null
          active_version_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prompt_type: 'caption' | 'tags'
          name: string
          description?: string | null
          active_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prompt_type?: 'caption' | 'tags'
          name?: string
          description?: string | null
          active_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // 提示詞版本歷史表
      prompt_versions: {
        Row: {
          id: string
          prompt_id: string | null
          version_number: number
          version_tag: string | null
          content: string
          system_prompt: string | null
          description: string | null
          action: 'create' | 'update' | 'restore' | null
          content_hash: string | null
          is_active: boolean | null
          is_draft: boolean | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id?: string | null
          version_number: number
          version_tag?: string | null
          content: string
          system_prompt?: string | null
          description?: string | null
          action?: 'create' | 'update' | 'restore' | null
          content_hash?: string | null
          is_active?: boolean | null
          is_draft?: boolean | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string | null
          version_number?: number
          version_tag?: string | null
          content?: string
          system_prompt?: string | null
          description?: string | null
          action?: 'create' | 'update' | 'restore' | null
          content_hash?: string | null
          is_active?: boolean | null
          is_draft?: boolean | null
          created_by?: string | null
          created_at?: string
        }
      }
      // 舊版災害申請表（保留相容性）
      disaster_applications: {
        Row: {
          id: string
          user_id: string
          victim_name: string
          id_number: string
          phone_number: string
          address: string
          bank_code: string
          bank_account: string
          front_id_photo: string | null
          back_id_photo: string | null
          bank_photo: string | null
          signature: string | null
          status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          victim_name: string
          id_number: string
          phone_number: string
          address: string
          bank_code: string
          bank_account: string
          front_id_photo?: string | null
          back_id_photo?: string | null
          bank_photo?: string | null
          signature?: string | null
          status?: 'submitted' | 'reviewed' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          victim_name?: string
          id_number?: string
          phone_number?: string
          address?: string
          bank_code?: string
          bank_account?: string
          front_id_photo?: string | null
          back_id_photo?: string | null
          bank_photo?: string | null
          signature?: string | null
          status?: 'submitted' | 'reviewed' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      // 銀行代碼表
      bank_codes: {
        Row: {
          id: number
          code: string
          name: string
          type: string
          created_at: string
        }
        Insert: {
          id?: number
          code: string
          name: string
          type: string
          created_at?: string
        }
        Update: {
          id?: number
          code?: string
          name?: string
          type?: string
          created_at?: string
        }
      }
    }
    Views: {
      // 處理統計報表
      processing_statistics: {
        Row: {
          stat_date: string | null
          total_processed: number | null
          completed_count: number | null
          failed_count: number | null
          processing_count: number | null
          success_rate: number | null
          avg_processing_time: number | null
          avg_caption_length: number | null
          avg_tags_count: number | null
        }
      }
    }
    Functions: {
      // 語意搜尋函數
      match_image_analyses: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          image_url: string
          image_name: string
          caption: string
          tags: Json
          exif_datetime: string | null
          exif_gps: Json | null
          exif_camera: string | null
          event_description: string | null
          similarity: number
          created_at: string
        }[]
      }
    }
  }
}

// 便捷型別別名 - image_analyses
export type ImageAnalysis = Database['public']['Tables']['image_analyses']['Row']
export type ImageAnalysisInsert = Database['public']['Tables']['image_analyses']['Insert']
export type ImageAnalysisUpdate = Database['public']['Tables']['image_analyses']['Update']

// 便捷型別別名 - processing_queue
export type ProcessingQueue = Database['public']['Tables']['processing_queue']['Row']
export type ProcessingQueueInsert = Database['public']['Tables']['processing_queue']['Insert']
export type ProcessingQueueUpdate = Database['public']['Tables']['processing_queue']['Update']

// 便捷型別別名 - prompts
export type Prompt = Database['public']['Tables']['prompts']['Row']
export type PromptInsert = Database['public']['Tables']['prompts']['Insert']
export type PromptUpdate = Database['public']['Tables']['prompts']['Update']

// 便捷型別別名 - prompt_versions
export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row']
export type PromptVersionInsert = Database['public']['Tables']['prompt_versions']['Insert']
export type PromptVersionUpdate = Database['public']['Tables']['prompt_versions']['Update']

// 便捷型別別名 - disaster_applications
export type DisasterApplicationRow = Database['public']['Tables']['disaster_applications']['Row']
export type DisasterApplicationInsert = Database['public']['Tables']['disaster_applications']['Insert']
export type DisasterApplicationUpdate = Database['public']['Tables']['disaster_applications']['Update']

// 便捷型別別名 - bank_codes
export type BankCode = Database['public']['Tables']['bank_codes']['Row']
export type BankCodeInsert = Database['public']['Tables']['bank_codes']['Insert']
export type BankCodeUpdate = Database['public']['Tables']['bank_codes']['Update']

// 便捷型別別名 - Views & Functions
export type ProcessingStatistics = Database['public']['Views']['processing_statistics']['Row']
export type SearchResult = Database['public']['Functions']['match_image_analyses']['Returns'][0]

// 圖片標籤介面（對應 tags JSONB 欄位）
export interface ImageTags {
  團體?: string           // 團體組織
  人?: string             // 人物
  事?: string             // 事件
  時?: string             // 時間
  地?: string             // 地點
  物?: string             // 物品
  動作?: string           // 動作
  天候?: string           // 天氣
  環境?: string           // 環境
}

// GPS 座標介面（對應 exif_gps JSONB 欄位）
export interface GpsCoordinate {
  lat: number   // 緯度
  lon: number   // 經度
}

// 舊版災害申請型別（保留相容性）
export interface DisasterApplication {
  id: string
  user_id: string
  victim_name: string
  id_number: string
  phone_number: string
  address: string
  bank_code: string
  bank_account: string
  front_id_photo?: string | null
  back_id_photo?: string | null
  bank_photo?: string | null
  signature?: string | null
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

// 使用者角色（來自 auth.users.user_metadata.role）
export type UserRole = 'admin' | 'editor' | 'user'

// 使用者 Metadata（來自 auth.users.user_metadata）
export interface UserMetadata {
  name?: string
  role: UserRole
  tenant_id: string
}

// EXIF 解析結果介面
export interface ExifData {
  datetime: string | null
  gps: GpsCoordinate | null
  camera: string | null
  raw: any
}
