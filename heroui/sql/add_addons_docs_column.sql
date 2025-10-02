-- ========================================
-- 新增 addons_docs 欄位到 disaster_applications 表
-- 使用 JSONB 格式儲存附加文件資料
-- ========================================

-- 1. 新增 addons_docs 欄位（JSONB 格式，允許為 NULL）
ALTER TABLE disaster_applications
ADD COLUMN IF NOT EXISTS addons_docs JSONB;

-- 2. 新增註解說明
COMMENT ON COLUMN disaster_applications.addons_docs IS '附加文件資料（JSONB格式）- 包含文件類型、檔案路徑等資訊';

-- 3. 建立索引以提升 JSONB 查詢效能
CREATE INDEX IF NOT EXISTS idx_disaster_applications_addons_docs
ON disaster_applications USING GIN (addons_docs);

-- 完成！
-- ✅ addons_docs 欄位已新增（JSONB 格式）
-- ✅ 可儲存多個附件的資訊
-- ✅ GIN 索引已建立，提升查詢效能

-- JSONB 資料格式範例：
-- [
--   {
--     "id": "uuid-xxx",
--     "type": "租賃契約",
--     "filePath": "media/addons_docs/uuid_rental.jpg",
--     "uploadedAt": "2025-10-01T00:00:00Z"
--   },
--   {
--     "id": "uuid-yyy",
--     "type": "戶籍謄本",
--     "filePath": "media/addons_docs/uuid_household.jpg",
--     "uploadedAt": "2025-10-01T00:00:00Z"
--   }
-- ]
