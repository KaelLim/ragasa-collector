-- 訪視紀錄表 (JSONB 格式)
-- 對應 Ragic 表單: https://ap11.ragic.com/TCTCharity/kava-kasha-temporary-form/15

-- 步驟 1: 建立 UUID v7 生成函數（如果不存在）
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
  unix_ts_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  unix_ts_ms = (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;
  uuid_bytes = (
    SUBSTRING(int8send(unix_ts_ms) FROM 3 FOR 6) ||
    gen_random_bytes(10)
  );

  -- Set version (7) and variant bits
  uuid_bytes = SET_BYTE(uuid_bytes, 6, (GET_BYTE(uuid_bytes, 6) & 15) | 112);
  uuid_bytes = SET_BYTE(uuid_bytes, 8, (GET_BYTE(uuid_bytes, 8) & 63) | 128);

  RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 步驟 2: 建立訪視紀錄表
CREATE TABLE IF NOT EXISTS visit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  application_id UUID NOT NULL UNIQUE,
  visit_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  visit_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 步驟 3: 建立外鍵約束
ALTER TABLE visit_records
  DROP CONSTRAINT IF EXISTS fk_visit_records_application;

ALTER TABLE visit_records
  ADD CONSTRAINT fk_visit_records_application
  FOREIGN KEY (application_id)
  REFERENCES disaster_applications(id)
  ON DELETE CASCADE;

ALTER TABLE visit_records
  DROP CONSTRAINT IF EXISTS fk_visit_records_user;

ALTER TABLE visit_records
  ADD CONSTRAINT fk_visit_records_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 步驟 4: 建立索引
CREATE INDEX IF NOT EXISTS idx_visit_records_application_id ON visit_records(application_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_visit_code ON visit_records(visit_code);
CREATE INDEX IF NOT EXISTS idx_visit_records_user_id ON visit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_village ON visit_records((visit_data->'basic'->>'village'));
CREATE INDEX IF NOT EXISTS idx_visit_records_visit_date ON visit_records((visit_data->'basic'->>'visitDate'));

-- 步驟 5: 啟用 RLS
ALTER TABLE visit_records ENABLE ROW LEVEL SECURITY;

-- 步驟 6: 刪除舊政策（如果存在）
DROP POLICY IF EXISTS visit_records_select_policy ON visit_records;
DROP POLICY IF EXISTS visit_records_insert_policy ON visit_records;
DROP POLICY IF EXISTS visit_records_update_policy ON visit_records;
DROP POLICY IF EXISTS visit_records_delete_policy ON visit_records;

-- 步驟 7: 建立新 RLS 政策
CREATE POLICY visit_records_select_policy ON visit_records
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY visit_records_insert_policy ON visit_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY visit_records_update_policy ON visit_records
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY visit_records_delete_policy ON visit_records
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 步驟 8: 建立更新時間戳記函數
CREATE OR REPLACE FUNCTION update_visit_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 步驟 9: 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_visit_records_updated_at ON visit_records;

CREATE TRIGGER trigger_update_visit_records_updated_at
  BEFORE UPDATE ON visit_records
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_records_updated_at();

-- 步驟 10: 建立註解
COMMENT ON TABLE visit_records IS '訪視紀錄表 - 對應 Ragic 華加沙臨時表單';
COMMENT ON COLUMN visit_records.visit_code IS '訪視編號格式: {主檔UUID7}B{村代碼}{流水號}';
COMMENT ON COLUMN visit_records.application_id IS '關聯個資主檔 UUID';
COMMENT ON COLUMN visit_records.visit_data IS 'JSONB 格式訪視資料，包含 basic, household, status, visit, receipt 五大區塊';
