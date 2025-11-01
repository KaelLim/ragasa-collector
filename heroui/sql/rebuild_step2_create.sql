-- 步驟 2: 創建表和函數

-- 創建 bank_codes 表
CREATE TABLE public.bank_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bank_codes_code_name_unique ON bank_codes(code, name);

-- 創建 validate_bank_code 函數
CREATE OR REPLACE FUNCTION validate_bank_code(code_value VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bank_codes
    WHERE code = code_value
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 創建 disaster_applications 表（包含新欄位）
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

-- 添加約束
ALTER TABLE disaster_applications ADD CONSTRAINT check_status
CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'));

ALTER TABLE disaster_applications ADD CONSTRAINT check_id_number_format
CHECK (LENGTH(id_number) = 10 AND id_number ~ '^[A-Z][0-9]{9}$');

ALTER TABLE disaster_applications ADD CONSTRAINT check_phone_number_format
CHECK (phone_number ~ '^[0-9#\-\+\(\)\s]+$');

-- 創建索引
CREATE INDEX idx_disaster_applications_user_id ON disaster_applications(user_id);
CREATE INDEX idx_disaster_applications_status ON disaster_applications(status);
CREATE INDEX idx_disaster_applications_created_at ON disaster_applications(created_at);
CREATE INDEX idx_disaster_applications_id_number ON disaster_applications(id_number);
CREATE INDEX idx_disaster_applications_bank_code ON disaster_applications(bank_code);
CREATE INDEX idx_disaster_applications_bank_name ON disaster_applications(bank_name);

-- 創建更新時間函數和觸發器
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

-- 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;