-- ========================================
-- 全新 bank_codes 表結構（版本 2）
-- 欄位：code, branch_code, name, branch_name, address
-- ========================================

-- 1. 刪除舊表（如果存在）
DROP TABLE IF EXISTS public.bank_codes CASCADE;

-- 2. 建立新的 bank_codes 表
CREATE TABLE public.bank_codes (
  id SERIAL PRIMARY KEY,
  code CHARACTER VARYING(3) NOT NULL,
  branch_code CHARACTER VARYING(4),
  name CHARACTER VARYING(100) NOT NULL,
  branch_name CHARACTER VARYING(100),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一約束：同一銀行代碼 + 分行代碼不能重複
  CONSTRAINT unique_bank_branch UNIQUE (code, branch_code)
);

-- 3. 建立索引
CREATE INDEX idx_bank_codes_code ON bank_codes(code);
CREATE INDEX idx_bank_codes_branch_code ON bank_codes(branch_code);
CREATE INDEX idx_bank_codes_name ON bank_codes(name);

-- 4. 新增註解
COMMENT ON TABLE bank_codes IS '銀行代碼與分行資料表（版本 2）';
COMMENT ON COLUMN bank_codes.code IS '銀行代碼（3碼）';
COMMENT ON COLUMN bank_codes.branch_code IS '分行代碼（4碼，可為空代表總行）';
COMMENT ON COLUMN bank_codes.name IS '銀行名稱';
COMMENT ON COLUMN bank_codes.branch_name IS '分行名稱（可為空）';
COMMENT ON COLUMN bank_codes.address IS '銀行/分行地址';

-- 5. 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;

-- 6. RLS 政策：允許所有認證使用者讀取
DROP POLICY IF EXISTS "Allow authenticated users to read bank codes" ON bank_codes;
CREATE POLICY "Allow authenticated users to read bank codes"
ON bank_codes FOR SELECT
TO authenticated
USING (true);

-- 7. Service Role 完整權限
DROP POLICY IF EXISTS "Allow service role full access to bank_codes" ON bank_codes;
CREATE POLICY "Allow service role full access to bank_codes"
ON bank_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 完成！
-- ✅ 新的 bank_codes 表已建立
-- ✅ 欄位：code, branch_code, name, branch_name, address
-- ✅ 索引與 RLS 政策已設定
