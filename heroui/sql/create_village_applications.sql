-- ========================================
-- 建立 village_applications 表
-- 大村資料收集系統
-- ========================================

-- 1. 建立表
CREATE TABLE IF NOT EXISTS public.village_applications (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village VARCHAR(50) NOT NULL,
  data JSONB,
  documents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_village_applications_village ON village_applications(village);
CREATE INDEX IF NOT EXISTS idx_village_applications_created_at ON village_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_village_applications_data ON village_applications USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_village_applications_documents ON village_applications USING GIN (documents);

-- 3. 建立 updated_at 自動更新觸發器
CREATE OR REPLACE FUNCTION update_village_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_village_applications_updated_at ON village_applications;
CREATE TRIGGER trigger_update_village_applications_updated_at
    BEFORE UPDATE ON village_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_village_applications_updated_at();

-- 4. 新增註解
COMMENT ON TABLE village_applications IS '大村資料收集申請表';
COMMENT ON COLUMN village_applications.uuid IS '唯一識別碼';
COMMENT ON COLUMN village_applications.village IS '大村名稱';
COMMENT ON COLUMN village_applications.data IS '申請資料（JSONB格式）';
COMMENT ON COLUMN village_applications.documents IS '文件檔案資料（JSONB格式）';
COMMENT ON COLUMN village_applications.created_at IS '建立時間';
COMMENT ON COLUMN village_applications.updated_at IS '更新時間';

-- 5. 啟用 RLS
ALTER TABLE village_applications ENABLE ROW LEVEL SECURITY;

-- 6. RLS 政策：允許認證使用者讀取自己的資料
DROP POLICY IF EXISTS "Users can view their own applications" ON village_applications;
CREATE POLICY "Users can view their own applications"
ON village_applications FOR SELECT
TO authenticated
USING (auth.uid()::text = (data->>'user_id')::text);

-- 7. RLS 政策：允許認證使用者插入資料
DROP POLICY IF EXISTS "Users can insert applications" ON village_applications;
CREATE POLICY "Users can insert applications"
ON village_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = (data->>'user_id')::text);

-- 8. Service Role 完整權限
DROP POLICY IF EXISTS "Service role full access" ON village_applications;
CREATE POLICY "Service role full access"
ON village_applications FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 完成！
-- ✅ village_applications 表已建立
-- ✅ 支援 JSONB 儲存彈性資料
-- ✅ 按大村分組
-- ✅ RLS 安全政策已設定
