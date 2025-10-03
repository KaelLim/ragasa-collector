import { createClient } from '@supabase/supabase-js'

// 慈濟救災系統 - Supabase Community 版本配置
const supabaseUrl = 'https://sberelieffundpj.tzuchi-org.tw'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

// 資料庫類型定義
export interface BankCode {
  id: number
  code: string
  branch_code: string | null
  name: string
  branch_name: string | null
  address: string | null
  created_at: string
}

export interface DisasterApplication {
  id: string
  user_id: string
  victim_name: string
  id_number: string
  phone_number: string | null
  address: string
  bank_code: string
  bank_name?: string | null
  bank_branch?: string | null
  bank_account: string
  account_name?: string | null
  front_id_photo?: string
  back_id_photo?: string
  bank_photo?: string
  signature?: string | null
  addons_docs?: Array<{
    id: string
    type: string
    customType?: string
    filePath: string
    uploadedAt: string
  }>
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  // Ragic 特有欄位（用於 detail 頁面）
  village?: string
  cityDistrict?: string
  villageLi?: string
  householdDoc?: string
  otherDocs?: string | string[]  // 單一檔案時為字串，多個檔案時為陣列
}

export interface VillageApplication {
  uuid: string
  village: string
  data: {
    user_id: string
    victim_name: string
    id_number: string
    phone_number: string | null
    address: string
    [key: string]: any
  }
  documents?: {
    front_id_photo?: string
    back_id_photo?: string
    signature?: string
    addons_docs?: Array<{
      id: string
      type: string
      customType?: string
      filePath: string
      uploadedAt: string
    }>
    [key: string]: any
  }
  created_at: string
  updated_at: string
}