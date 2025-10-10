-- 創建 disaster_applications 表（JSONB 格式）

CREATE TABLE public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  application_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加狀態約束
ALTER TABLE public.disaster_applications
  ADD CONSTRAINT check_status
  CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'));

-- 創建索引
CREATE INDEX idx_application_data_gin ON disaster_applications USING GIN (application_data);
CREATE INDEX idx_status ON disaster_applications (status);
CREATE INDEX idx_created_at ON disaster_applications (created_at DESC);
CREATE INDEX idx_user_id ON disaster_applications (user_id);

-- 更新時間觸發器
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

-- 驗證
SELECT 'disaster_applications 表創建完成' AS message;
