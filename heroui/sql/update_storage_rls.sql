-- ========================================
-- Storage RLS 政策更新
-- 簡化版本：允許認證使用者上傳到 media bucket
-- ========================================

-- 1. 刪除舊的複雜政策
DROP POLICY IF EXISTS "Allow authenticated users to upload their own files" ON storage.objects;

-- 2. 建立簡化的上傳政策
CREATE POLICY "Allow authenticated users to upload to media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- 3. 更新檢視政策（簡化版）
DROP POLICY IF EXISTS "Allow users to view their own application files" ON storage.objects;
CREATE POLICY "Allow authenticated users to view media files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- 4. 確保 Service Role 有完整存取權限
DROP POLICY IF EXISTS "Service role full access to media bucket" ON storage.objects;
CREATE POLICY "Service role full access to media bucket"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- 完成！現在：
-- ✅ 所有認證使用者可以上傳檔案到 media bucket
-- ✅ 所有認證使用者可以檢視 media bucket 中的檔案
-- ✅ Service Role 有完整權限
-- ✅ 檔案安全由應用層控制（disaster_applications 表的 RLS）
