-- ========================================
-- 步驟 1: 建立資料表
-- 在 Supabase Studio SQL Editor 執行此腳本
-- ========================================

-- 1. 創建 bank_codes 表
CREATE TABLE IF NOT EXISTS public.bank_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 創建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_codes_code_name_unique ON bank_codes(code, name);

-- 2. 創建 disaster_applications 表
CREATE TABLE IF NOT EXISTS public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  victim_name VARCHAR(50) NOT NULL,
  id_number VARCHAR(10) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  bank_code VARCHAR(3) NOT NULL,
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account VARCHAR(20) NOT NULL,
  account_name VARCHAR(50),
  front_id_photo VARCHAR(255),
  back_id_photo VARCHAR(255),
  bank_photo VARCHAR(255),
  household_registry_photo VARCHAR(255),
  household_transcript_photo VARCHAR(255),
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;

-- 4. 創建 RLS 政策 - bank_codes 所有人可讀
DROP POLICY IF EXISTS "bank_codes_read_policy" ON bank_codes;
CREATE POLICY "bank_codes_read_policy"
ON bank_codes FOR SELECT
USING (true);

-- 執行完成後請執行 step2_insert_banks.sql
