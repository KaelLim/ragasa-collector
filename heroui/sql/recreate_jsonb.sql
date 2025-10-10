-- 直接刪除舊表並創建 JSONB 新表

DROP TABLE IF EXISTS public.disaster_applications CASCADE;

CREATE TABLE public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  application_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'))
);

CREATE INDEX idx_application_data_gin ON disaster_applications USING GIN (application_data);
CREATE INDEX idx_status ON disaster_applications (status);
CREATE INDEX idx_created_at ON disaster_applications (created_at DESC);
CREATE INDEX idx_user_id ON disaster_applications (user_id);

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

SELECT 'JSONB 表創建完成' AS message;
