-- ========================================
-- 慈濟救災系統 - 生產環境完整 SQL 設定
-- ========================================

-- 1. 創建 bank_codes 表
CREATE TABLE IF NOT EXISTS public.bank_codes (
  id SERIAL PRIMARY KEY,
  code CHARACTER VARYING(3) NOT NULL,
  name CHARACTER VARYING(100) NOT NULL,
  type CHARACTER VARYING(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bank_codes_code_name_key UNIQUE (code, name)
);

-- 2. 創建 disaster_applications 表
CREATE TABLE IF NOT EXISTS public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  victim_name CHARACTER VARYING(50) NOT NULL,
  id_number CHARACTER VARYING(10) NOT NULL,
  phone_number CHARACTER VARYING(20) NOT NULL,
  address TEXT NOT NULL,
  bank_code CHARACTER VARYING(3) NOT NULL,
  bank_account CHARACTER VARYING(20) NOT NULL,
  front_id_photo CHARACTER VARYING(255),
  back_id_photo CHARACTER VARYING(255),
  bank_photo CHARACTER VARYING(255),
  signature CHARACTER VARYING(255),
  status CHARACTER VARYING(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 約束檢查
  CONSTRAINT check_status CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected')),
  CONSTRAINT check_id_number_format CHECK (LENGTH(id_number) = 10 AND id_number ~ '^[A-Z][0-9]{9}$'),
  CONSTRAINT check_phone_number_format CHECK (phone_number ~ '^[0-9#\-\+\(\)\s]+$')
);

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

-- 4. 添加 bank_code 約束（先刪除再創建）
DO $$
BEGIN
    -- 嘗試刪除現有約束
    ALTER TABLE disaster_applications DROP CONSTRAINT IF EXISTS check_bank_code_exists;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 添加新約束
ALTER TABLE disaster_applications
ADD CONSTRAINT check_bank_code_exists
CHECK (validate_bank_code(bank_code));

-- 5. 創建更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 創建觸發器
DROP TRIGGER IF EXISTS update_disaster_applications_updated_at ON disaster_applications;
CREATE TRIGGER update_disaster_applications_updated_at
    BEFORE UPDATE ON disaster_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 創建索引
CREATE INDEX IF NOT EXISTS idx_disaster_applications_user_id ON disaster_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_status ON disaster_applications(status);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_created_at ON disaster_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_id_number ON disaster_applications(id_number);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_bank_code ON disaster_applications(bank_code);
CREATE INDEX IF NOT EXISTS idx_disaster_applications_phone_number ON disaster_applications(phone_number);

-- 8. 添加註解
COMMENT ON TABLE disaster_applications IS '救災個資收集申請表 - 關聯到認證用戶';
COMMENT ON COLUMN disaster_applications.user_id IS '提交申請的用戶ID（關聯到 auth.users）';
COMMENT ON COLUMN disaster_applications.victim_name IS '受災戶姓名';
COMMENT ON COLUMN disaster_applications.id_number IS '身分證字號';
COMMENT ON COLUMN disaster_applications.phone_number IS '聯絡電話';
COMMENT ON COLUMN disaster_applications.address IS '地址';
COMMENT ON COLUMN disaster_applications.bank_code IS '銀行代碼（參照bank_codes表）';
COMMENT ON COLUMN disaster_applications.bank_account IS '銀行帳號';
COMMENT ON COLUMN disaster_applications.front_id_photo IS '身分證正面照片路徑';
COMMENT ON COLUMN disaster_applications.back_id_photo IS '身分證反面照片路徑';
COMMENT ON COLUMN disaster_applications.bank_photo IS '銀行帳戶照片路徑';
COMMENT ON COLUMN disaster_applications.signature IS '簽名檔案路徑';

-- ========================================
-- RLS (Row Level Security) 設定
-- ========================================

-- 9. 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;

-- 10. bank_codes 的 RLS 政策
DROP POLICY IF EXISTS "Allow authenticated users to read bank codes" ON bank_codes;
CREATE POLICY "Allow authenticated users to read bank codes"
ON bank_codes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service role full access to bank_codes" ON bank_codes;
CREATE POLICY "Allow service role full access to bank_codes"
ON bank_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 11. disaster_applications 的 RLS 政策
DROP POLICY IF EXISTS "Users can insert their own applications" ON disaster_applications;
CREATE POLICY "Users can insert their own applications"
ON disaster_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own applications" ON disaster_applications;
CREATE POLICY "Users can view their own applications"
ON disaster_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own applications" ON disaster_applications;
CREATE POLICY "Users can update their own applications"
ON disaster_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'submitted')
WITH CHECK (auth.uid() = user_id AND status IN ('submitted', 'reviewed'));

DROP POLICY IF EXISTS "Service role full access to applications" ON disaster_applications;
CREATE POLICY "Service role full access to applications"
ON disaster_applications FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- Storage Bucket 設定
-- ========================================

-- 12. 創建 media bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- 13. Storage RLS 政策
DROP POLICY IF EXISTS "Allow authenticated users to upload their own files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (
    name ~ '^front_id/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|JPG|JPEG)$' OR
    name ~ '^back_id/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|JPG|JPEG)$' OR
    name ~ '^bank_account/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|JPG|JPEG)$' OR
    name ~ '^signature/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$'
  )
);

DROP POLICY IF EXISTS "Allow users to view their own application files" ON storage.objects;
CREATE POLICY "Allow users to view their own application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM disaster_applications da
    WHERE da.user_id = auth.uid()
    AND (
      name = 'front_id/' || da.id::text || '.jpg' OR
      name = 'front_id/' || da.id::text || '.jpeg' OR
      name = 'back_id/' || da.id::text || '.jpg' OR
      name = 'back_id/' || da.id::text || '.jpeg' OR
      name = 'bank_account/' || da.id::text || '.jpg' OR
      name = 'bank_account/' || da.id::text || '.jpeg' OR
      name = 'signature/' || da.id::text || '.png'
    )
  )
);

DROP POLICY IF EXISTS "Allow users to update their own application files" ON storage.objects;
CREATE POLICY "Allow users to update their own application files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM disaster_applications da
    WHERE da.user_id = auth.uid()
    AND da.status = 'submitted'
    AND (
      name = 'front_id/' || da.id::text || '.jpg' OR
      name = 'front_id/' || da.id::text || '.jpeg' OR
      name = 'back_id/' || da.id::text || '.jpg' OR
      name = 'back_id/' || da.id::text || '.jpeg' OR
      name = 'bank_account/' || da.id::text || '.jpg' OR
      name = 'bank_account/' || da.id::text || '.jpeg' OR
      name = 'signature/' || da.id::text || '.png'
    )
  )
);

DROP POLICY IF EXISTS "Service role full access to media bucket" ON storage.objects;
CREATE POLICY "Service role full access to media bucket"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- ========================================
-- 完成提示
-- ========================================
SELECT 'Database setup completed successfully!' as result;