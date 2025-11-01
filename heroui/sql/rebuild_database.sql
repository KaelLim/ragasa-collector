-- ========================================
-- 直接重建資料庫（開發環境用）
-- 執行日期: 2025-09-30
-- ========================================

-- 1. 刪除現有表（開發環境，資料已備份）
DROP TABLE IF EXISTS disaster_applications CASCADE;
DROP TABLE IF EXISTS bank_codes CASCADE;
DROP FUNCTION IF EXISTS validate_bank_code(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 2. 創建 bank_codes 表
CREATE TABLE public.bank_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 創建複合唯一索引
CREATE UNIQUE INDEX idx_bank_codes_code_name_unique ON bank_codes(code, name);

-- 3. 創建 validate_bank_code 函數
CREATE OR REPLACE FUNCTION validate_bank_code(code_value VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bank_codes
    WHERE code = code_value
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. 創建 disaster_applications 表（包含新欄位，移除 signature）
CREATE TABLE public.disaster_applications (
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
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 添加約束
ALTER TABLE disaster_applications ADD CONSTRAINT check_status
CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'));

ALTER TABLE disaster_applications ADD CONSTRAINT check_id_number_format
CHECK (LENGTH(id_number) = 10 AND id_number ~ '^[A-Z][0-9]{9}$');

ALTER TABLE disaster_applications ADD CONSTRAINT check_phone_number_format
CHECK (phone_number ~ '^[0-9#\-\+\(\)\s]+$');

-- 6. 創建索引
CREATE INDEX idx_disaster_applications_user_id ON disaster_applications(user_id);
CREATE INDEX idx_disaster_applications_status ON disaster_applications(status);
CREATE INDEX idx_disaster_applications_created_at ON disaster_applications(created_at);
CREATE INDEX idx_disaster_applications_id_number ON disaster_applications(id_number);
CREATE INDEX idx_disaster_applications_bank_code ON disaster_applications(bank_code);
CREATE INDEX idx_disaster_applications_bank_name ON disaster_applications(bank_name);

-- 7. 創建更新時間函數和觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_disaster_applications_updated_at
    BEFORE UPDATE ON disaster_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;

-- 9. 創建 RLS 政策（允許所有操作 - 開發環境）
CREATE POLICY "允許所有讀取操作" ON bank_codes FOR SELECT USING (true);
CREATE POLICY "允許所有讀取操作" ON disaster_applications FOR SELECT USING (true);
CREATE POLICY "允許認證用戶新增" ON disaster_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "允許用戶更新自己的申請" ON disaster_applications FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 重建完成！
-- ========================================
-- 驗證查詢：
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'disaster_applications'
-- ORDER BY ordinal_position;