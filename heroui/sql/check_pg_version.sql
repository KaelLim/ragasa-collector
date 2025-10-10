-- 檢查 PostgreSQL 版本和 UUID7 支援
-- 執行方式：在 Supabase SQL Editor 或 psql 中執行

-- 1. 檢查 PostgreSQL 版本
SELECT version();

-- 2. 檢查 PostgreSQL 數字版本
SHOW server_version_num;

-- 3. 檢查是否有 pg_uuidv7 擴展
SELECT * FROM pg_available_extensions WHERE name = 'pg_uuidv7';

-- 4. 檢查已安裝的擴展
SELECT * FROM pg_extension WHERE extname LIKE '%uuid%';

-- 5. 測試 UUID v4 生成（目前使用）
SELECT gen_random_uuid() AS uuid_v4;

-- ========================================
-- UUID7 支援情況：
-- ========================================
-- PostgreSQL 17+: 原生支援 gen_random_uuid_v7()
-- PostgreSQL 13-16: 需安裝 pg_uuidv7 擴展
--   CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
--   SELECT uuid_generate_v7();
--
-- 如果資料庫版本 < 17，建議使用 JavaScript 生成 UUID7
-- ========================================
