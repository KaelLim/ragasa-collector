-- ========================================
-- 修復 village_applications RLS 政策
-- 新增 UPDATE 政策
-- ========================================

-- 新增 UPDATE 政策：允許認證使用者更新自己的資料
DROP POLICY IF EXISTS "Users can update their own applications" ON village_applications;
CREATE POLICY "Users can update their own applications"
ON village_applications FOR UPDATE
TO authenticated
USING (auth.uid()::text = (data->>'user_id')::text)
WITH CHECK (auth.uid()::text = (data->>'user_id')::text);

-- 完成！
-- ✅ 使用者現在可以更新自己的申請記錄
-- ✅ documents JSONB 欄位可以正常更新
