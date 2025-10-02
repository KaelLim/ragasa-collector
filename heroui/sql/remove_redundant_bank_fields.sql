-- ========================================
-- 調整 disaster_applications 表的銀行欄位結構
-- 新增 branch_code，移除 bank_name 和 bank_branch
-- 銀行名稱和分行名稱從 bank_codes 表查詢
-- ========================================

-- 1. 新增 branch_code 欄位（儲存分行代碼）
ALTER TABLE disaster_applications
ADD COLUMN IF NOT EXISTS branch_code CHARACTER VARYING(4);

-- 2. 移除 bank_name 欄位（可從 bank_codes 查詢）
ALTER TABLE disaster_applications
DROP COLUMN IF EXISTS bank_name;

-- 3. 移除 bank_branch 欄位（可從 bank_codes 查詢）
ALTER TABLE disaster_applications
DROP COLUMN IF EXISTS bank_branch;

-- 4. 新增註解
COMMENT ON COLUMN disaster_applications.branch_code IS '分行代碼（3-4碼，關聯到 bank_codes.branch_code）';

-- 完成！
-- ✅ 新增 branch_code 欄位
-- ✅ 移除多餘的 bank_name 和 bank_branch
-- ✅ 銀行名稱和分行名稱改從 bank_codes 表 JOIN 查詢
--
-- 查詢範例：
-- SELECT
--   da.*,
--   bc_main.name as bank_name,
--   bc_branch.branch_name
-- FROM disaster_applications da
-- LEFT JOIN bank_codes bc_main ON da.bank_code = bc_main.code AND bc_main.branch_code IS NULL
-- LEFT JOIN bank_codes bc_branch ON da.bank_code = bc_branch.code AND da.branch_code = bc_branch.branch_code
