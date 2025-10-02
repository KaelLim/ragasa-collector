-- ========================================
-- 新增 signature 欄位到 disaster_applications 表
-- 用於儲存電子簽名檔案路徑
-- ========================================

-- 1. 新增 signature 欄位（允許為 NULL，因為簽名是選填項目）
ALTER TABLE disaster_applications
ADD COLUMN IF NOT EXISTS signature CHARACTER VARYING(255);

-- 2. 新增註解說明
COMMENT ON COLUMN disaster_applications.signature IS '電子簽名檔案路徑（選填，長者或行動不便者可不簽名）';

-- 完成！現在：
-- ✅ signature 欄位已新增
-- ✅ 欄位允許為 NULL（選填項目）
-- ✅ 可以儲存簽名檔案路徑
