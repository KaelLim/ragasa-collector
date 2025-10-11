-- Storage RLS 政策 for visitrecords bucket
-- 確保訪視紀錄照片只有認證用戶可存取

-- 先刪除舊政策（如果存在）
DROP POLICY IF EXISTS "visitrecords_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "visitrecords_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "visitrecords_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "visitrecords_delete_policy" ON storage.objects;

-- 允許認證用戶上傳檔案（僅能上傳到自己的資料夾）
CREATE POLICY "visitrecords_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'visitrecords' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允許所有認證用戶查看訪視照片（跨用戶查看）
CREATE POLICY "visitrecords_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'visitrecords');

-- 允許用戶更新自己上傳的檔案
CREATE POLICY "visitrecords_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'visitrecords' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允許用戶刪除自己上傳的檔案
CREATE POLICY "visitrecords_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'visitrecords' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
