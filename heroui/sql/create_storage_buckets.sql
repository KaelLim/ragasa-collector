-- ========================================
-- 創建 Supabase Storage Buckets
-- ========================================

-- 1. 創建 media bucket（媒體檔案）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,  -- 公開讀取
  52428800,  -- 50MB 限制
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 設置 Storage 政策（允許認證用戶上傳）
CREATE POLICY "認證用戶可上傳檔案"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
);

-- 3. 允許所有人讀取公開 bucket
CREATE POLICY "所有人可讀取 media bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- 4. 認證用戶可刪除自己的檔案
CREATE POLICY "認證用戶可刪除檔案"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- 5. 認證用戶可更新檔案
CREATE POLICY "認證用戶可更新檔案"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- 驗證 bucket 創建成功
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'media';
