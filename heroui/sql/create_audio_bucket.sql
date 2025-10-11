-- 建立音訊檔案專用 Storage Bucket
-- 用於訪視記錄的語音轉文字音訊檔案

-- 在 Supabase Dashboard > Storage 中執行，或使用以下 SQL：

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,  -- Private bucket
  52428800,  -- 50 MB
  ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE
SET
  allowed_mime_types = ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'],
  file_size_limit = 52428800;

-- 註解
COMMENT ON TABLE storage.buckets IS '音訊檔案專用 bucket，支援 webm/wav/mp3/ogg 格式';
