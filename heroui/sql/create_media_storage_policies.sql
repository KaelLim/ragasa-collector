-- Storage RLS 政策 for media bucket (個資收集系統)
-- 確保申請資料照片只有認證用戶可存取

-- 先刪除舊政策（如果存在）
DROP POLICY IF EXISTS "media_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "media_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "media_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "media_delete_policy" ON storage.objects;

-- 允許認證用戶上傳檔案
CREATE POLICY "media_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (
    -- temp 資料夾：任何認證用戶都可上傳
    (storage.foldername(name))[1] = 'temp'
    OR
    -- applications 資料夾：任何認證用戶都可上傳
    (storage.foldername(name))[1] = 'applications'
  )
);

-- 允許所有認證用戶查看申請照片（跨用戶查看）
CREATE POLICY "media_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- 允許認證用戶更新檔案
CREATE POLICY "media_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- 允許認證用戶刪除檔案
CREATE POLICY "media_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');
