-- Storage RLS 政策 for audio bucket（音訊檔案專用）

-- 先刪除舊政策（如果存在）
DROP POLICY IF EXISTS "audio_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_delete_policy" ON storage.objects;

-- 允許認證用戶上傳音訊檔案
CREATE POLICY "audio_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio'
);

-- 允許所有認證用戶查看音訊檔案
CREATE POLICY "audio_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio');

-- 允許認證用戶更新音訊檔案
CREATE POLICY "audio_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio');

-- 允許認證用戶刪除音訊檔案
CREATE POLICY "audio_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio');
