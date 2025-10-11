# UUID7 全系統部署指南

> **版本**: V1.1.0
> **部署日期**: 2025-10-11
> **適用環境**: 開發環境（會清空所有資料）

---

## ⚠️ 重要警告

**此部署會刪除所有現有資料！**

- ❌ `disaster_applications` 表會被重建（所有申請記錄清空）
- ❌ `visit_records` 表會被建立（新表）
- ⚠️ 僅適用於開發階段，生產環境請勿執行

---

## 📋 部署步驟（嚴格按順序執行）

### 步驟 1: 重建個資申請表（UUID7）

**執行**: `sql/recreate_applications_uuid7.sql`

**功能**:
- 刪除舊的 `disaster_applications` 表
- 重新建立表（id UUID PRIMARY KEY，無 DEFAULT）
- 前端插入時明確指定 UUID7
- 建立索引和 RLS 政策

**確認**:
```sql
-- 檢查表格結構
\d disaster_applications

-- 確認 id 欄位沒有 DEFAULT
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'disaster_applications'
  AND column_name = 'id';
-- column_default 應為 null
```

---

### 步驟 2: 建立訪視紀錄表（UUID7）

**執行**: `sql/create_visit_records_v2.sql`

**功能**:
- 建立 `visit_records` 表（id UUID PRIMARY KEY，無 DEFAULT）
- 前端插入時明確指定 UUID7
- 建立外鍵約束（關聯 disaster_applications）
- 建立索引和 RLS 政策

**確認**:
```sql
-- 檢查表格是否存在
SELECT table_name FROM information_schema.tables
WHERE table_name = 'visit_records';

-- 檢查外鍵約束
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'visit_records';
```

---

### 步驟 3: 建立 Private Storage Buckets

#### 3.1 訪視紀錄 Bucket

1. **Storage** > **Create a new bucket**
2. 設定：
   - Name: `visitrecords`
   - Public: ❌ **不勾選**（Private）
   - File size limit: `10485760` (10 MB)
   - Allowed MIME types: `image/jpeg,image/png`
3. **Create**

#### 3.2 個資收集 Bucket（如已存在，跳過）

**確認 `media` bucket 存在**:
- 如不存在，建立方式同上
- Name: `media`
- Public: ❌ Private

---

### 步驟 4: 設定 Storage RLS 政策

#### 4.1 訪視紀錄 Storage RLS

**執行**: `sql/create_storage_policies.sql`

**政策**:
- `visitrecords_upload_policy`
- `visitrecords_select_policy`
- `visitrecords_update_policy`
- `visitrecords_delete_policy`

#### 4.2 個資收集 Storage RLS

**執行**: `sql/create_media_storage_policies.sql`

**政策**:
- `media_upload_policy`
- `media_select_policy`
- `media_update_policy`
- `media_delete_policy`

**確認**:
```sql
-- 檢查 Storage 政策
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
```

應該看到 8 個政策（4 個 media + 4 個 visitrecords）

---

## ✅ 驗證測試

### 測試 1: 個資收集系統

1. 前往 http://localhost:3000/application/new
2. 填寫申請表單
3. 上傳照片
4. 提交申請
5. **檢查 Console**:
   - 應顯示「✅ 申請提交成功！UUID7: ...」
   - UUID 長度應為 36 字元
6. **檢查資料庫**:
   ```sql
   SELECT id, created_at FROM disaster_applications ORDER BY created_at DESC LIMIT 1;
   ```
   - id 應為 UUID7 格式（前端生成）

### 測試 2: 訪視紀錄系統

1. 前往 http://localhost:3000/visit-records
2. 應顯示待訪視列表（剛才提交的申請）
3. 點擊「開始訪視」
4. **檢查華加沙編碼格式**:
   - 應為：`{UUID7}-{村代碼}{流水號}`
   - 範例：`01234567-89ab-cdef-0123-456789abcdef-A0001`
5. **檢查紀錄日期**:
   - 應為今天日期（YYYY/MM/DD）
   - 不應出現 3033/07/31 等錯誤日期

### 測試 3: Storage 安全性

1. **測試照片上傳**（個資收集）
2. **嘗試直接存取 URL**（登出狀態）
   - 應該無法存取（Private Bucket）
3. **登入後查看申請詳情**
   - 照片應正常顯示（Signed URL）

---

## 🔄 UUID7 vs UUID v4 比較

| 項目 | UUID v4 (舊) | UUID7 (新) |
|-----|-------------|-----------|
| 生成方式 | 完全隨機 | 時間戳記 + 隨機 |
| 可排序性 | ❌ 否 | ✅ 是（按建立時間） |
| 包含時間資訊 | ❌ 否 | ✅ 是（毫秒級） |
| 相容性 | ✅ UUID 標準 | ✅ UUID 標準 |
| 生成位置 | 資料庫 | 前端 |
| PostgreSQL 版本需求 | 任何版本 | 前端生成，無版本限制 |

### UUID7 格式

```
01916d21-7d3f-7000-8000-123456789abc
│       │   │ │    │    │
│       │   │ │    │    └─ 隨機數（48位）
│       │   │ │    └────── 變體位元
│       │   │ └─────────── 版本位元（0x7）
│       │   └───────────── 時間戳記低位
│       └───────────────── 時間戳記高位
└───────────────────────── Unix 時間戳記（ms）
```

---

## 🚨 Rollback 方案

如果部署後發現問題：

### 方案 1: 恢復備份（如有）

```sql
-- 如果有執行備份步驟
DROP TABLE disaster_applications CASCADE;
ALTER TABLE disaster_applications_backup RENAME TO disaster_applications;
```

### 方案 2: 重建使用 UUID v4

```sql
-- 重建表格使用 gen_random_uuid()
DROP TABLE disaster_applications CASCADE;

CREATE TABLE disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... 其他欄位
);
```

---

## 📊 前端程式碼已準備就緒

### 個資收集系統 ✅
- `generateApplicationUuid()` 使用 `uuidv7()`
- insert() 時明確指定 `id: sessionUuid`

### 訪視紀錄系統 ✅
- `createVisitRecord()` 動態 import `uuidv7()`
- 生成 recordId 並明確指定 id
- 訪視編號格式：`{UUID7}-{村代碼}{流水號}`

---

## 📝 執行完成後的狀態

### 資料庫
- ✅ `disaster_applications` 使用前端 UUID7
- ✅ `visit_records` 使用前端 UUID7
- ✅ 兩表都沒有 DEFAULT，由前端控制

### Storage
- ✅ `media` bucket (Private)
- ✅ `visitrecords` bucket (Private)
- ✅ Storage RLS 政策已設定

### 前端
- ✅ 個資收集表單正常運作
- ✅ 訪視紀錄列表正常顯示
- ✅ 訪視紀錄表單步驟 1 正常運作
- ✅ 訪視編號格式正確

---

**執行者**: Claude AI (Anthropic)
**最後更新**: 2025-10-11
