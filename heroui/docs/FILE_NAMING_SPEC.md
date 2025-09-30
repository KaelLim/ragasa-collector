# 檔案命名規範

**更新時間**: 2025-09-30 07:00 CST
**狀態**: ✅ 已實作並驗證

---

## 📋 命名規則

所有上傳到 Supabase Storage 的檔案使用以下格式：

```
{folder}/{身份證ID}_{UUID7}_{證件類別}.{副檔名}
```

### 範例

```
front_id/A123456789_019997e3-b94f-768f-ab9d-8c6b1ef4c65a_front.jpg
back_id/A123456789_019997e3-b94f-768f-ab9d-92249b837e16_back.jpg
bank_account/A123456789_019997e3-b94f-768f-ab9d-969a5dc20422_bank.jpg
```

---

## 🔧 格式說明

### 1. 資料夾名稱 (folder)
| 證件類型 | 資料夾名稱 |
|---------|-----------|
| 身份證正面 | `front_id` |
| 身份證背面 | `back_id` |
| 銀行存摺 | `bank_account` |

### 2. 身份證號碼 (身份證ID)
- **格式**: 1個大寫英文字母 + 9個數字
- **範例**: `A123456789`, `B234567890`
- **正則表達式**: `^[A-Z][0-9]{9}$`

### 3. 唯一識別碼 (UUID7)
- **版本**: UUID v7 (基於時間戳)
- **格式**: `xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx`
- **範例**: `019997e3-b94f-768f-ab9d-8c6b1ef4c65a`
- **特性**:
  - 包含時間戳資訊，可按時間排序
  - 全球唯一，避免檔案名稱衝突
  - 符合 RFC 4122 標準

### 4. 證件類別 (docType)
| 類別 | 值 | 說明 |
|-----|---|------|
| 身份證正面 | `front` | ID card front |
| 身份證背面 | `back` | ID card back |
| 銀行存摺 | `bank` | Bank passbook |

### 5. 副檔名
- **支援格式**: `jpg`, `png`
- **預設**: `jpg`（根據檔案 MIME type 自動判斷）

---

## 📊 完整格式驗證

### 正則表達式
```regex
^[a-z_]+\/[A-Z][0-9]{9}_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}_(front|back|bank)\.(jpg|png)$
```

### 驗證範例
```javascript
const fileName = 'front_id/A123456789_019997e3-b94f-768f-ab9d-8c6b1ef4c65a_front.jpg';
const pattern = /^[a-z_]+\/[A-Z][0-9]{9}_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}_(front|back|bank)\.(jpg|png)$/;

console.log(pattern.test(fileName)); // true
```

---

## 💻 程式碼實作

### TypeScript 函數
```typescript
const uploadFileToStorage = async (file: File, folder: string, idNumber: string, docType: string) => {
  // 動態匯入 uuid
  const { v7: uuidv7 } = await import('uuid')

  const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
  const uniqueId = uuidv7()
  const fileName = `${folder}/${idNumber}_${uniqueId}_${docType}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error
  return fileName
}
```

### 使用範例
```typescript
// 上傳身份證正面
const frontPath = await uploadFileToStorage(
  file,           // File object
  'front_id',     // 資料夾
  'A123456789',   // 身份證號碼
  'front'         // 證件類別
);
// 結果: front_id/A123456789_019997e3-b94f-768f-ab9d-8c6b1ef4c65a_front.jpg

// 上傳身份證背面
const backPath = await uploadFileToStorage(
  file,
  'back_id',
  'A123456789',
  'back'
);
// 結果: back_id/A123456789_019997e3-b94f-768f-ab9d-92249b837e16_back.jpg

// 上傳銀行存摺
const bankPath = await uploadFileToStorage(
  file,
  'bank_account',
  'A123456789',
  'bank'
);
// 結果: bank_account/A123456789_019997e3-b94f-768f-ab9d-969a5dc20422_bank.jpg
```

---

## 🎯 優點

### 1. 可追溯性
- 檔案名稱包含身份證號碼，易於查詢和管理
- UUID v7 包含時間戳，可按時間排序

### 2. 唯一性
- UUID v7 保證全球唯一
- 同一身份證號碼可上傳多次不會衝突

### 3. 語意化
- 證件類別清楚標示檔案內容
- 資料夾結構明確分類

### 4. 安全性
- 檔案名稱不包含敏感個人資訊（除了身份證號碼）
- UUID 增加猜測難度

### 5. 維護性
- 格式統一，易於維護和搜尋
- 支援自動化處理和批次操作

---

## 🔄 與舊格式的差異

### 舊格式
```
front_id/{applicationId}.jpg
back_id/{applicationId}.jpg
bank_account/{applicationId}.jpg
```

### 新格式
```
front_id/{身份證ID}_{UUID7}_{證件類別}.jpg
back_id/{身份證ID}_{UUID7}_{證件類別}.jpg
bank_account/{身份證ID}_{UUID7}_{證件類別}.jpg
```

### 改進點
| 項目 | 舊格式 | 新格式 |
|-----|-------|--------|
| 唯一性 | 依賴 applicationId | UUID v7 全球唯一 |
| 可追溯性 | 需查詢資料庫 | 檔案名稱直接包含身份證號碼 |
| 語意化 | 無證件類別標示 | 明確標示證件類別 |
| 時間排序 | 不支援 | UUID v7 支援時間排序 |

---

## 📝 資料庫儲存

檔案路徑儲存在 `disaster_applications` 表的以下欄位：

| 欄位名稱 | 範例值 |
|---------|--------|
| `front_id_photo` | `front_id/A123456789_019997e3-b94f-768f-ab9d-8c6b1ef4c65a_front.jpg` |
| `back_id_photo` | `back_id/A123456789_019997e3-b94f-768f-ab9d-92249b837e16_back.jpg` |
| `bank_photo` | `bank_account/A123456789_019997e3-b94f-768f-ab9d-969a5dc20422_bank.jpg` |

---

## 🧪 測試

測試腳本位置：`scripts/test-file-naming.js`

```bash
# 執行測試
node scripts/test-file-naming.js
```

測試內容：
- ✅ 檔案命名格式生成
- ✅ UUID v7 唯一性驗證
- ✅ 正則表達式格式驗證
- ✅ 三種證件類型測試

---

## 📚 相關文件

- **主要實作**: `app/application/new/page.tsx` (line 140-157, 194-223)
- **測試腳本**: `scripts/test-file-naming.js`
- **資料庫 Schema**: `sql/rebuild_step2_create_v2.sql`
- **UUID 套件文檔**: https://www.npmjs.com/package/uuid

---

**規範版本**: v1.0
**生效日期**: 2025-09-30
**維護者**: Claude AI (Anthropic)