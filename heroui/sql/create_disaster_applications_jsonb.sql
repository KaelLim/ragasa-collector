-- ========================================
-- 災害個人資料收集系統 - JSONB 架構設計
-- ========================================

-- 1. 創建申請表（JSONB 格式）
CREATE TABLE IF NOT EXISTS public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- 核心資料（JSONB 格式，彈性儲存所有申請資料）
  application_data JSONB NOT NULL,

  -- 狀態管理
  status VARCHAR(20) DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected')),

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 備註欄位（可選）
  admin_notes TEXT
);

-- 2. 創建 JSONB 索引（加速查詢）
CREATE INDEX IF NOT EXISTS idx_application_data_gin
  ON disaster_applications USING GIN (application_data);

-- 受災者姓名索引（支持搜尋）
CREATE INDEX IF NOT EXISTS idx_victim_name
  ON disaster_applications ((application_data->'victim'->>'name'));

-- 受災者身分證字號索引（支持搜尋）
CREATE INDEX IF NOT EXISTS idx_victim_id_number
  ON disaster_applications ((application_data->'victim'->>'idNumber'));

-- 狀態索引
CREATE INDEX IF NOT EXISTS idx_status
  ON disaster_applications (status);

-- 建立時間索引
CREATE INDEX IF NOT EXISTS idx_created_at
  ON disaster_applications (created_at DESC);

-- 使用者 ID 索引
CREATE INDEX IF NOT EXISTS idx_user_id
  ON disaster_applications (user_id);

-- 3. 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_disaster_applications_updated_at ON disaster_applications;
CREATE TRIGGER update_disaster_applications_updated_at
    BEFORE UPDATE ON disaster_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 創建輔助查詢函數
CREATE OR REPLACE FUNCTION search_applications_by_name(search_name TEXT)
RETURNS SETOF disaster_applications AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM disaster_applications
  WHERE application_data->'victim'->>'name' ILIKE '%' || search_name || '%';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_applications_by_id_number(search_id TEXT)
RETURNS SETOF disaster_applications AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM disaster_applications
  WHERE application_data->'victim'->>'idNumber' = search_id;
END;
$$ LANGUAGE plpgsql;

-- 5. JSONB 資料結構範例
/*
{
  "household": {
    "header": {
      "householdNumber": "U3679357",
      "householdHeadIdNumber": "Y120074499",
      "householdType": "共同生活戶",
      "address": "花蓮縣壽豐鄉光榮村011鄰中山路上段114號"
    },
    "householdHead": {
      "name": "曾至鴻",
      "gender": "男",
      "birthDate": "1969-12-28",
      "idNumber": "Y120074499"
    },
    "members": [
      {
        "name": "李怡燕",
        "gender": "女",
        "birthDate": "1972-07-08",
        "idNumber": "T220819666",
        "relationship": "妻"
      },
      {
        "name": "朱敏求",
        "gender": "女",
        "birthDate": "1942-04-25",
        "idNumber": "A200737658",
        "relationship": "母"
      },
      {
        "name": "曾寶瑩",
        "gender": "女",
        "birthDate": "2013-12-04",
        "idNumber": "F232916786",
        "relationship": "長女"
      }
    ]
  },
  "victim": {
    "name": "曾至鴻",
    "idNumber": "Y120074499",
    "phone": "0912345678",
    "address": "花蓮縣壽豐鄉光榮村011鄰中山路上段114號"
  },
  "agent": {
    "hasAgent": false
  },
  "bank": {
    "code": "004",
    "name": "台灣銀行",
    "branch": "城中分行",
    "account": "123456789",
    "accountName": "曾至鴻"
  },
  "contact": {
    "option": "provide",
    "phoneNumber": "0912345678"
  },
  "signature": "temp/UUID7_signature.png",
  "media": {
    "household": [
      "temp/UUID7_household-page1.jpg",
      "temp/UUID7_household-page2.jpg"
    ],
    "idFront": "temp/UUID7_id-head-front.jpg",
    "idBack": "temp/UUID7_id-head-back.jpg",
    "bankBook": "temp/UUID7_bank-book.jpg"
  },
  "additionalFiles": [
    "temp/UUID7_additional-file1.jpg",
    "temp/UUID7_additional-file2.pdf"
  ]
}
*/

-- 6. 驗證表創建成功
SELECT 'disaster_applications 表（JSONB 架構）創建完成' AS message;
SELECT tablename, indexname FROM pg_indexes WHERE tablename = 'disaster_applications';
