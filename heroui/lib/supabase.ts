import { createClient } from '@supabase/supabase-js'
import type { Database, DisasterApplication, BankCode } from '@/types/database.types'

// 重新匯出型別供其他模組使用
export type { DisasterApplication, BankCode }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
