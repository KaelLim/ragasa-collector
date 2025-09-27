-- ========================================
-- RLS (Row Level Security) 政策設定
-- ========================================

-- bank_codes 的 RLS 政策
CREATE POLICY "Allow authenticated users to read bank codes"
ON bank_codes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role full access to bank_codes"
ON bank_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- disaster_applications 的 RLS 政策
CREATE POLICY "Users can insert their own applications"
ON disaster_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
ON disaster_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
ON disaster_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'submitted')
WITH CHECK (auth.uid() = user_id AND status IN ('submitted', 'reviewed'));

CREATE POLICY "Service role full access to applications"
ON disaster_applications FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- Storage Bucket 和 RLS 政策
-- ========================================

-- 創建 media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 政策
CREATE POLICY "Allow authenticated users to upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (
    name ~ '^front_id/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|JPG|JPEG)$' OR
    name ~ '^back_id/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|JPG|JPEG)$' OR
    name ~ '^bank_account/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|JPG|JPEG)$' OR
    name ~ '^signature/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$'
  )
);

CREATE POLICY "Allow users to view their own application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM disaster_applications da
    WHERE da.user_id = auth.uid()
    AND (
      name = 'front_id/' || da.id::text || '.jpg' OR
      name = 'front_id/' || da.id::text || '.jpeg' OR
      name = 'back_id/' || da.id::text || '.jpg' OR
      name = 'back_id/' || da.id::text || '.jpeg' OR
      name = 'bank_account/' || da.id::text || '.jpg' OR
      name = 'bank_account/' || da.id::text || '.jpeg' OR
      name = 'signature/' || da.id::text || '.png'
    )
  )
);

CREATE POLICY "Allow users to update their own application files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM disaster_applications da
    WHERE da.user_id = auth.uid()
    AND da.status = 'submitted'
    AND (
      name = 'front_id/' || da.id::text || '.jpg' OR
      name = 'front_id/' || da.id::text || '.jpeg' OR
      name = 'back_id/' || da.id::text || '.jpg' OR
      name = 'back_id/' || da.id::text || '.jpeg' OR
      name = 'bank_account/' || da.id::text || '.jpg' OR
      name = 'bank_account/' || da.id::text || '.jpeg' OR
      name = 'signature/' || da.id::text || '.png'
    )
  )
);

CREATE POLICY "Service role full access to media bucket"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');