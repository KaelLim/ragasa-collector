-- ========================================
-- 修復 bank_codes RLS 政策
-- 允許匿名使用者（anon）讀取銀行代碼
-- ========================================

-- 刪除舊政策
DROP POLICY IF EXISTS "Allow authenticated users to read bank codes" ON bank_codes;

-- 建立新政策：允許所有人（包含未登入使用者）讀取
CREATE POLICY "Allow public to read bank codes"
ON bank_codes FOR SELECT
USING (true);

-- 保留 Service Role 完整權限
DROP POLICY IF EXISTS "Allow service role full access to bank_codes" ON bank_codes;
CREATE POLICY "Allow service role full access to bank_codes"
ON bank_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 完成！
-- ✅ 所有人（包含未登入使用者）都可以讀取銀行代碼
-- ✅ 銀行代碼是公開資料，不需要限制讀取權限
