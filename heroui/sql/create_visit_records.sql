-- 訪視紀錄表 (JSONB 格式)
-- 對應 Ragic 表單: https://ap11.ragic.com/TCTCharity/kava-kasha-temporary-form/15

CREATE TABLE IF NOT EXISTS visit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),

  -- 關聯個資主檔（每個申請只能有一筆訪視紀錄）
  application_id UUID REFERENCES disaster_applications(id) NOT NULL UNIQUE,

  -- 訪視編號：{主檔UUID7}B{村代碼}{流水號}
  -- 範例: 01234567-89ab-cdef-0123-456789abcdefBA0001
  visit_code TEXT NOT NULL UNIQUE,

  -- 建立者
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- 訪視資料 (JSONB 格式)
  visit_data JSONB NOT NULL,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_visit_records_application_id ON visit_records(application_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_visit_code ON visit_records(visit_code);
CREATE INDEX IF NOT EXISTS idx_visit_records_user_id ON visit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_village ON visit_records((visit_data->'basic'->>'village'));
CREATE INDEX IF NOT EXISTS idx_visit_records_visit_date ON visit_records((visit_data->'basic'->>'visitDate'));

-- RLS (Row Level Security) 政策
ALTER TABLE visit_records ENABLE ROW LEVEL SECURITY;

-- 所有認證用戶可以查看所有訪視紀錄
CREATE POLICY "Allow authenticated users to view visit records"
  ON visit_records
  FOR SELECT
  TO authenticated
  USING (true);

-- 所有認證用戶可以新增訪視紀錄
CREATE POLICY "Allow authenticated users to create visit records"
  ON visit_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能更新自己建立的訪視紀錄
CREATE POLICY "Allow users to update own visit records"
  ON visit_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能刪除自己建立的訪視紀錄
CREATE POLICY "Allow users to delete own visit records"
  ON visit_records
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 更新時間戳記觸發器
CREATE OR REPLACE FUNCTION update_visit_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visit_records_updated_at
  BEFORE UPDATE ON visit_records
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_records_updated_at();

-- 建立 Supabase Storage bucket (如果尚未存在)
-- 執行方式：在 Supabase Dashboard 的 Storage 中手動建立，或使用 SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('visit-media', 'visit-media', true);

COMMENT ON TABLE visit_records IS '訪視紀錄表 - 對應 Ragic 華加沙臨時表單';
COMMENT ON COLUMN visit_records.visit_code IS '訪視編號格式: {主檔UUID7}B{村代碼}{流水號}';
COMMENT ON COLUMN visit_records.application_id IS '關聯個資主檔 UUID';
COMMENT ON COLUMN visit_records.visit_data IS 'JSONB 格式訪視資料，包含 basic, household, status, documents, visit 五大區塊';
