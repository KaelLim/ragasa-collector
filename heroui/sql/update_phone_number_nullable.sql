-- ========================================
-- 允許 phone_number 欄位為 NULL
-- 使用者可以選擇「略過」提供電話號碼
-- ========================================

-- 1. 移除 NOT NULL 約束
ALTER TABLE disaster_applications
ALTER COLUMN phone_number DROP NOT NULL;

-- 2. 更新檢查約束（只檢查非 NULL 值的格式）
DROP CONSTRAINT IF EXISTS check_phone_number_format ON disaster_applications;
ALTER TABLE disaster_applications
ADD CONSTRAINT check_phone_number_format
CHECK (phone_number IS NULL OR phone_number ~ '^[0-9#\-\+\(\)\s]+$');

-- 3. 新增註解說明
COMMENT ON COLUMN disaster_applications.phone_number IS '聯絡電話（可為空，使用者可選擇略過）';

-- 完成！現在：
-- ✅ phone_number 可以為 NULL
-- ✅ 如果提供電話，必須符合格式
-- ✅ 使用者可以選擇「略過」電話號碼
