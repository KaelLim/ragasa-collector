-- 重新建立 disaster_applications 表（使用前端生成的 UUID7）
-- ⚠️ 此操作會刪除所有現有資料！僅適用於開發階段

-- 步驟 1: 備份現有資料（如有需要）
-- CREATE TABLE disaster_applications_backup AS SELECT * FROM disaster_applications;

-- 步驟 2: 刪除舊表（CASCADE 刪除相關外鍵）
DROP TABLE IF EXISTS disaster_applications CASCADE;

-- 步驟 3: 重新建立表（不使用 DEFAULT，由前端提供 UUID7）
CREATE TABLE disaster_applications (
  id UUID PRIMARY KEY,  -- 移除 DEFAULT，由前端明確提供 UUID7
  user_id UUID NOT NULL REFERENCES auth.users(id),
  application_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 步驟 4: 建立索引
CREATE INDEX idx_applications_user_id ON disaster_applications(user_id);
CREATE INDEX idx_applications_status ON disaster_applications(status);
CREATE INDEX idx_applications_created_at ON disaster_applications(created_at);
CREATE INDEX idx_applications_victim_name ON disaster_applications((application_data->'victim'->>'name'));
CREATE INDEX idx_applications_id_number ON disaster_applications((application_data->'victim'->>'idNumber'));

-- 步驟 5: 啟用 RLS
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;

-- 步驟 6: 刪除舊政策（如果存在）
DROP POLICY IF EXISTS applications_select_policy ON disaster_applications;
DROP POLICY IF EXISTS applications_insert_policy ON disaster_applications;
DROP POLICY IF EXISTS applications_update_policy ON disaster_applications;
DROP POLICY IF EXISTS applications_delete_policy ON disaster_applications;

-- 步驟 7: 建立新 RLS 政策
CREATE POLICY applications_select_policy ON disaster_applications
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY applications_insert_policy ON disaster_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY applications_update_policy ON disaster_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY applications_delete_policy ON disaster_applications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 步驟 8: 建立更新時間戳記函數
CREATE OR REPLACE FUNCTION update_disaster_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 步驟 9: 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_disaster_applications_updated_at ON disaster_applications;

CREATE TRIGGER trigger_update_disaster_applications_updated_at
  BEFORE UPDATE ON disaster_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_disaster_applications_updated_at();

-- 步驟 10: 建立註解
COMMENT ON TABLE disaster_applications IS '災害個資申請表 - 使用前端生成的 UUID7 作為主鍵';
COMMENT ON COLUMN disaster_applications.id IS '前端生成的 UUID7（包含時間戳記）';
COMMENT ON COLUMN disaster_applications.application_data IS 'JSONB 格式申請資料';
