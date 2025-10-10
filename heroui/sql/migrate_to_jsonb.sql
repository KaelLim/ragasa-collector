-- ========================================
-- 遷移到 JSONB 架構
-- ========================================

-- 步驟 1: 備份舊表（如果有資料）
CREATE TABLE IF NOT EXISTS disaster_applications_backup AS
SELECT * FROM disaster_applications;

-- 步驟 2: 刪除舊表
DROP TABLE IF EXISTS disaster_applications CASCADE;

-- 步驟 3: 創建新表（JSONB 格式）
CREATE TABLE public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  application_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 步驟 4: 添加約束
ALTER TABLE public.disaster_applications
  ADD CONSTRAINT check_status
  CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'));

-- 步驟 5: 創建索引
CREATE INDEX idx_application_data_gin ON disaster_applications USING GIN (application_data);
CREATE INDEX idx_status ON disaster_applications (status);
CREATE INDEX idx_created_at ON disaster_applications (created_at DESC);
CREATE INDEX idx_user_id ON disaster_applications (user_id);

-- 步驟 6: 創建更新時間觸發器
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

-- 步驟 7: 驗證
SELECT 'disaster_applications 表（JSONB 架構）創建完成' AS message;
SELECT COUNT(*) AS backup_count FROM disaster_applications_backup;
SELECT COUNT(*) AS new_count FROM disaster_applications;
