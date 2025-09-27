-- ========================================
-- 慈濟救災系統 - 清理並重新設定
-- ========================================

-- 1. 先清理現有物件
DROP TABLE IF EXISTS disaster_applications CASCADE;
DROP TABLE IF EXISTS bank_codes CASCADE;
DROP FUNCTION IF EXISTS validate_bank_code(character varying) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 2. 創建 bank_codes 表
CREATE TABLE bank_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, name)
);

-- 3. 創建 validate_bank_code 函數
CREATE FUNCTION validate_bank_code(input_code VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bank_codes
    WHERE code = input_code
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. 創建 disaster_applications 表
CREATE TABLE disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  victim_name VARCHAR(50) NOT NULL,
  id_number VARCHAR(10) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  bank_code VARCHAR(3) NOT NULL,
  bank_account VARCHAR(20) NOT NULL,
  front_id_photo VARCHAR(255),
  back_id_photo VARCHAR(255),
  bank_photo VARCHAR(255),
  signature VARCHAR(255),
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 約束
  CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected')),
  CHECK (LENGTH(id_number) = 10 AND id_number ~ '^[A-Z][0-9]{9}$'),
  CHECK (phone_number ~ '^[0-9#\-\+\(\)\s]+$'),
  CHECK (validate_bank_code(bank_code))
);

-- 5. 創建更新時間函數和觸發器
CREATE FUNCTION update_updated_at_column()
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

-- 6. 創建索引
CREATE INDEX idx_disaster_applications_user_id ON disaster_applications(user_id);
CREATE INDEX idx_disaster_applications_status ON disaster_applications(status);
CREATE INDEX idx_disaster_applications_created_at ON disaster_applications(created_at);
CREATE INDEX idx_disaster_applications_id_number ON disaster_applications(id_number);
CREATE INDEX idx_disaster_applications_bank_code ON disaster_applications(bank_code);

-- 7. 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;

-- 完成
SELECT 'Database structure created successfully!' as result;