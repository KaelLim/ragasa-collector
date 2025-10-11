# 訪視紀錄模組部署指南

> **版本**: V1.1.0
> **最後更新**: 2025-10-11

---

## 📋 部署檢查清單

- [ ] 步驟 1: 建立 `visit_records` 資料表
- [ ] 步驟 2: 建立 Private Storage Bucket
- [ ] 步驟 3: 設定 Storage RLS 政策
- [ ] 步驟 4: 驗證功能

---

## 🔧 步驟 1: 建立資料表

### 在 Supabase Studio 執行

1. 前往 https://sbevisitpj.tzuchi-org.tw
2. 登入後點選 **SQL Editor**
3. 點擊 **New query**
4. 複製貼上 `sql/create_visit_records_v2.sql` 的**完整內容**
5. 點擊 **Run**

### 預期結果

執行成功後應該看到：
- ✅ `visit_records` 表已建立
- ✅ 5 個索引已建立
- ✅ 4 個 RLS 政策已建立
- ✅ 1 個觸發器已建立

---

## 🔒 步驟 2: 建立 Private Storage Bucket

### ⚠️ 重要：使用 Private Bucket（非 Public）

**為什麼使用 Private Bucket？**
- ✅ 防止未授權存取敏感照片
- ✅ 身分證、簽名等資料受 RLS 保護
- ✅ 只有認證用戶可存取
- ✅ 使用 Signed URL 控制存取時效

### 建立步驟

1. 點選左側選單 **Storage**
2. 點擊 **Create a new bucket**
3. 設定：
   - **Name**: `visitrecords`
   - **Public bucket**: ❌ **不要勾選**（保持 Private）
   - **File size limit**: `10485760` (10 MB)
   - **Allowed MIME types**: `image/jpeg,image/png`
4. 點擊 **Create bucket**

---

## 🛡️ 步驟 3: 設定 Storage RLS 政策

### 在 SQL Editor 執行

1. 點選 **SQL Editor** > **New query**
2. 複製貼上 `sql/create_storage_policies.sql` 的**完整內容**
3. 點擊 **Run**

### 政策說明

| 政策 | 對象 | 權限 | 說明 |
|-----|------|------|------|
| Upload | authenticated | INSERT | 用戶只能上傳到自己的資料夾 |
| View | authenticated | SELECT | 所有認證用戶可查看訪視照片 |
| Update | authenticated | UPDATE | 用戶只能更新自己的檔案 |
| Delete | authenticated | DELETE | 用戶只能刪除自己的檔案 |

### 檔案路徑結構

```
visitrecords/
├── {user_id_1}/
│   ├── id-front/
│   │   └── {uuid}.jpg
│   ├── id-back/
│   ├── interactions/
│   ├── receipts/
│   ├── transcripts/
│   └── others/
└── {user_id_2}/
    └── ...
```

---

## ✅ 步驟 4: 驗證部署

### 測試資料表

在 **SQL Editor** 執行：

```sql
-- 檢查表格是否存在
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'visit_records';

-- 檢查索引
SELECT indexname
FROM pg_indexes
WHERE tablename = 'visit_records';

-- 檢查 RLS 政策
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'visit_records';
```

### 測試 Storage Bucket

在 **Storage** 檢查：
- ✅ `visitrecords` bucket 存在
- ✅ Public 欄位顯示 **Private**
- ✅ 點擊 bucket 可看到政策設定

### 測試前端功能

1. 開啟瀏覽器：http://localhost:3000/visit-records
2. 應該看到待訪視列表（不再有 404 錯誤）
3. 點擊「開始訪視」測試步驟 1

---

## 🔐 安全性優勢

使用 Private Bucket + RLS 的優勢：

| 項目 | Public Bucket | Private Bucket + RLS |
|-----|--------------|---------------------|
| URL 知道即可存取 | ❌ 是 | ✅ 否 |
| 需要認證 | ❌ 否 | ✅ 是 |
| 可設定存取時效 | ❌ 否 | ✅ 是（Signed URL） |
| 防止外洩 | ❌ 弱 | ✅ 強 |
| 符合資安規範 | ❌ 否 | ✅ 是 |

### Signed URL 機制

```typescript
// 儲存在資料庫：檔案路徑（非 URL）
"id_front_photo": "user123/id-front/abc-123.jpg"

// 前端顯示時：動態生成 Signed URL（1小時有效）
const signedUrl = await getSignedUrl("user123/id-front/abc-123.jpg", 3600)
// => "https://...?token=xxx&expires=1234567890"
```

### 使用方式

```typescript
import { getSignedUrl, getSignedUrls } from '@/lib/storage-utils'

// 單張照片
const url = await getSignedUrl(record.visit_data.documents.idFrontPhoto)

// 多張照片
const urls = await getSignedUrls(record.visit_data.visit.interactionPhotos)
```

---

## 🚨 常見問題

### Q1: 為什麼不用 Public Bucket？
**A**: 訪視紀錄包含身分證、簽名等敏感資料，使用 Public Bucket 會造成安全風險。任何人只要知道 URL 就能存取照片。

### Q2: Signed URL 會過期嗎？
**A**: 是的，預設 1 小時後過期。這是安全機制，防止 URL 被長期濫用。前端每次載入時會重新生成新的 Signed URL。

### Q3: 如果 URL 過期怎麼辦？
**A**: 前端會自動重新獲取新的 Signed URL。使用者無感知，系統自動處理。

### Q4: Storage RLS 和資料表 RLS 有什麼差別？
**A**:
- **資料表 RLS**: 控制誰能讀寫 `visit_records` 表的記錄
- **Storage RLS**: 控制誰能上傳/下載 `visitrecords` bucket 的檔案
- 兩者搭配使用提供完整的安全防護

---

## 📝 部署後確認

### 資料庫檢查

```sql
-- 確認表格建立
\dt visit_records

-- 確認 RLS 已啟用
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'visit_records';

-- 確認政策數量
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'visit_records';
-- 應該返回 4
```

### Storage 檢查

在 Supabase Studio:
1. **Storage** > `visitrecords`
2. 點擊 **Policies** 標籤
3. 應該看到 4 個政策

### 前端測試

```bash
# 確認開發服務器運行中
curl http://localhost:3000/visit-records

# 應該返回 200 OK（登入後）
```

---

**部署完成後，系統會使用 Private Bucket + Signed URLs 確保照片安全！**
