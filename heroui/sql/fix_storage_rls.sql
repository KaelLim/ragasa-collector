-- 修正 Supabase Storage RLS 政策
-- 允許已認證使用者上傳、讀取、更新、刪除 media bucket 中的檔案

-- 1. 確保 media bucket 存在且設定為 public
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. 刪除現有的 RLS 政策（如果存在）
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 3. 建立新的 RLS 政策

-- 允許所有人讀取 media bucket 的檔案（因為 bucket 是 public）
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- 允許已認證使用者上傳到 media bucket
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- 允許已認證使用者更新自己上傳的檔案
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid() = owner);

-- 允許已認證使用者刪除自己上傳的檔案
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid() = owner);
