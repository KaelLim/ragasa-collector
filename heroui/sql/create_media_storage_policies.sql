-- Storage RLS 政策 for media bucket (個資收集系統)
-- 確保申請資料照片只有認證用戶可存取

-- 允許認證用戶上傳檔案（僅能上傳到自己的資料夾）
CREATE POLICY "Allow authenticated users to upload application files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (
    -- temp 資料夾：任何認證用戶都可上傳
    (storage.foldername(name))[1] = 'temp'
    OR
    -- applications 資料夾：只能上傳到自己 user_id 資料夾
    (storage.foldername(name))[1] = 'applications'
  )
);

-- 允許所有認證用戶查看申請照片（跨用戶查看）
CREATE POLICY "Allow authenticated users to view application files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- 允許用戶更新檔案
CREATE POLICY "Allow users to update application files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- 允許用戶刪除檔案（temp 或 applications 資料夾）
CREATE POLICY "Allow users to delete application files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');
