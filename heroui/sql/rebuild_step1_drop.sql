-- 步驟 1: 刪除現有表
DROP TABLE IF EXISTS disaster_applications CASCADE;
DROP TABLE IF EXISTS bank_codes CASCADE;
DROP FUNCTION IF EXISTS validate_bank_code(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;