-- ========================================
-- 僅創建 disaster_applications 表
-- (bank_codes 表已存在，跳過)
-- ========================================

-- 創建 disaster_applications 表
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

-- 添加約束
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_status') THEN
    ALTER TABLE disaster_applications ADD CONSTRAINT check_status
    CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_id_number_format') THEN
    ALTER TABLE disaster_applications ADD CONSTRAINT check_id_number_format
    CHECK (LENGTH(id_number) = 10 AND id_number ~ '^[A-Z][0-9]{9}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_phone_number_format') THEN
    ALTER TABLE disaster_applications ADD CONSTRAINT check_phone_number_format
    CHECK (phone_number ~ '^[0-9#\-\+\(\)\s]+$');
  END IF;
END $$;

-- 創建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_disaster_applications_user_id ON disaster_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_status ON disaster_applications(status);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_created_at ON disaster_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_id_number ON disaster_applications(id_number);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_bank_code ON disaster_applications(bank_code);

-- 創建更新時間函數（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器（如果不存在）
DROP TRIGGER IF EXISTS update_disaster_applications_updated_at ON disaster_applications;
CREATE TRIGGER update_disaster_applications_updated_at
    BEFORE UPDATE ON disaster_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 驗證表創建成功
SELECT 'disaster_applications 表創建完成' AS message;
SELECT COUNT(*) AS record_count FROM disaster_applications;
