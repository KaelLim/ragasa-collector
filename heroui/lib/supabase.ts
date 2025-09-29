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
  name: string
  type: 'bank' | 'postal' | 'credit_union' | 'farmers_association'
  created_at: string
}

export interface DisasterApplication {
  id: string
  user_id: string
  victim_name: string
  id_number: string
  phone_number: string
  address: string
  bank_code: string
  bank_account: string
  front_id_photo?: string
  back_id_photo?: string
  bank_photo?: string
  signature?: string
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}