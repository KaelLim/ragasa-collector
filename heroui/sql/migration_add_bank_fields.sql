-- ========================================
-- Schema 修正：新增銀行欄位 + 移除簽名欄位
-- 執行日期: 2025-09-30
-- 目的: 同步前端表單與資料庫結構
-- ========================================

-- 1. 新增缺少的銀行相關欄位
ALTER TABLE disaster_applications
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100),
  ADD COLUMN IF NOT EXISTS account_name VARCHAR(50);

-- 2. 移除已廢棄的簽名欄位
ALTER TABLE disaster_applications
  DROP COLUMN IF EXISTS signature;

-- 3. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_disaster_applications_bank_name
  ON disaster_applications(bank_name);

-- 4. 驗證修改結果
COMMENT ON COLUMN disaster_applications.bank_name IS '銀行名稱（從 bank_codes 表選擇）';
COMMENT ON COLUMN disaster_applications.bank_branch IS '分行或分會名稱';
COMMENT ON COLUMN disaster_applications.account_name IS '帳戶名稱（戶名）';

-- 執行完成後可用此查詢驗證
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'disaster_applications'
-- ORDER BY ordinal_position;