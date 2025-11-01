# Supabase Schema 欄位對比分析

**分析時間**: 2025-09-30 06:24
**目的**: 確認前端表單欄位與資料庫 Schema 的一致性

---

## 📋 前端表單欄位 (app/application/new/page.tsx)

### formData 狀態定義 (第 38-49 行)
```typescript
const [formData, setFormData] = useState({
  victim_name: '',      // 受災者姓名
  id_number: '',        // 身分證字號
  phone_number: '',     // 聯絡電話
  address: '',          // 聯絡地址
  bank_code: '',        // 銀行代碼
  bank_name: '',        // 銀行名稱 ⚠️ 新增欄位
  bank_branch: '',      // 分行名稱 ⚠️ 新增欄位
  bank_account: '',     // 銀行帳號
  account_name: '',     // 帳戶名稱 ⚠️ 新增欄位
  contactOption: ''     // 聯絡選項 (僅前端使用)
})
```

### 檔案上傳欄位 (第 56-61 行)
```typescript
const [fileData, setFileData] = useState({
  frontIdPhoto: null as File | null,  // 身分證正面
  backIdPhoto: null as File | null,   // 身分證背面
  bankPhoto: null as File | null,     // 銀行存摺照片
  // signature: null - 已移除簽名欄位 ✅
})
```

---

## 🗄️ 資料庫 Schema (sql/setup_simple.sql)

### disaster_applications 表結構 (第 29-45 行)
```sql
CREATE TABLE public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  victim_name VARCHAR(50) NOT NULL,      -- ✅ 對應
  id_number VARCHAR(10) NOT NULL,        -- ✅ 對應
  phone_number VARCHAR(20) NOT NULL,     -- ✅ 對應
  address TEXT NOT NULL,                 -- ✅ 對應
  bank_code VARCHAR(3) NOT NULL,         -- ✅ 對應
  bank_account VARCHAR(20) NOT NULL,     -- ✅ 對應
  front_id_photo VARCHAR(255),           -- ✅ 對應
  back_id_photo VARCHAR(255),            -- ✅ 對應
  bank_photo VARCHAR(255),               -- ✅ 對應
  signature VARCHAR(255),                -- ❌ 前端已移除，需刪除
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚠️ 欄位不一致分析

### 1. 前端新增但資料庫缺少的欄位

| 欄位名稱 | 前端存在 | 資料庫存在 | 狀態 | 建議動作 |
|---------|---------|-----------|------|---------|
| `bank_name` | ✅ | ❌ | **缺少** | 需新增至資料庫 |
| `bank_branch` | ✅ | ❌ | **缺少** | 需新增至資料庫 |
| `account_name` | ✅ | ❌ | **缺少** | 需新增至資料庫 |

**問題**: 前端收集了這些資料，但提交時**未儲存到資料庫**！

**程式碼證據** (第 170-178 行):
```typescript
.insert([{
  user_id: user.id,
  victim_name: formData.victim_name,
  id_number: formData.id_number,
  phone_number: formData.phone_number,
  address: formData.address,
  bank_code: formData.bank_code,
  bank_account: formData.bank_account
  // ❌ 缺少: bank_name, bank_branch, account_name
}])
```

### 2. 資料庫存在但前端已移除的欄位

| 欄位名稱 | 前端存在 | 資料庫存在 | 狀態 | 建議動作 |
|---------|---------|-----------|------|---------|
| `signature` | ❌ | ✅ | **多餘** | 從資料庫移除 |

**證據**:
- 前端第 60 行註解: `// signature: null as File | null - 簽名已移除`
- 前端第 206 行註解: `// 簽名已移除，不再上傳簽名檔案`

---

## 📊 資料型別建議

基於前端驗證邏輯和實際使用：

| 欄位 | 建議型別 | 長度限制 | 理由 |
|-----|---------|---------|------|
| `bank_name` | `VARCHAR(100)` | max 100 | 銀行全名 |
| `bank_branch` | `VARCHAR(100)` | max 100 | 分行名稱可能較長 |
| `account_name` | `VARCHAR(50)` | max 50 | 與 victim_name 一致 |

---

## ✅ 建議的 Schema 修正動作

### 方案 A: 新增缺少的欄位 + 移除多餘欄位

```sql
-- 1. 新增缺少的欄位
ALTER TABLE disaster_applications
  ADD COLUMN bank_name VARCHAR(100),
  ADD COLUMN bank_branch VARCHAR(100),
  ADD COLUMN account_name VARCHAR(50);

-- 2. 移除已廢棄的簽名欄位
ALTER TABLE disaster_applications
  DROP COLUMN signature;

-- 3. 更新前端提交邏輯
-- 修改 app/application/new/page.tsx 第 170-178 行
```

### 方案 B: 僅新增欄位 (保留 signature 以防萬一)

```sql
-- 僅新增缺少的欄位，保留 signature 作為歷史遺留
ALTER TABLE disaster_applications
  ADD COLUMN bank_name VARCHAR(100),
  ADD COLUMN bank_branch VARCHAR(100),
  ADD COLUMN account_name VARCHAR(50);
```

---

## 🔧 需要同步修改的檔案

### 1. 前端提交邏輯
**檔案**: `app/application/new/page.tsx`
**位置**: 第 170-178 行

```typescript
// 修改前
.insert([{
  user_id: user.id,
  victim_name: formData.victim_name,
  id_number: formData.id_number,
  phone_number: formData.phone_number,
  address: formData.address,
  bank_code: formData.bank_code,
  bank_account: formData.bank_account
}])

// 修改後
.insert([{
  user_id: user.id,
  victim_name: formData.victim_name,
  id_number: formData.id_number,
  phone_number: formData.phone_number,
  address: formData.address,
  bank_code: formData.bank_code,
  bank_name: formData.bank_name,        // ✅ 新增
  bank_branch: formData.bank_branch,    // ✅ 新增
  bank_account: formData.bank_account,
  account_name: formData.account_name   // ✅ 新增
}])
```

### 2. TypeScript 型別定義
**檔案**: `lib/supabase.ts`
**位置**: 第 24-40 行

```typescript
// 修改前
export interface DisasterApplication {
  id: string
  user_id: string
  victim_name: string
  id_number: string
  phone_number: string
  address: string
  bank_code: string
  bank_account: string
  front_id_photo?: string
  back_id_photo?: string
  bank_photo?: string
  signature?: string              // ❌ 需移除
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

// 修改後
export interface DisasterApplication {
  id: string
  user_id: string
  victim_name: string
  id_number: string
  phone_number: string
  address: string
  bank_code: string
  bank_name?: string              // ✅ 新增
  bank_branch?: string            // ✅ 新增
  bank_account: string
  account_name?: string           // ✅ 新增
  front_id_photo?: string
  back_id_photo?: string
  bank_photo?: string
  // signature 已移除               // ✅ 移除
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}
```

### 3. 資料庫 Schema 檔案
**檔案**: `sql/setup_simple.sql`
**動作**: 建立新的遷移腳本

---

## 🎯 執行優先順序

1. **高優先 - 資料完整性問題** ⚠️
   - 新增 `bank_name`, `bank_branch`, `account_name` 欄位
   - 修改前端提交邏輯，儲存這些資料

2. **中優先 - 清理多餘欄位**
   - 移除 `signature` 欄位（已確認前端不使用）

3. **低優先 - 文件更新**
   - 更新 ARCHITECTURE.md
   - 更新 TypeScript 型別定義

---

## 📌 總結

### 關鍵發現
✅ 前端表單**已實作** 3 個新欄位（bank_name, bank_branch, account_name）
❌ 但資料庫**缺少**這些欄位
❌ 前端提交時**未儲存**這些資料
⚠️ 導致使用者輸入的銀行詳細資訊**永久遺失**

### 建議立即行動
**必須執行**：方案 A（新增欄位 + 移除 signature）
**原因**：避免資料遺失，確保功能完整性

---

**文件生成者**: Claude Code
**檔案版本**: v1.0
**最後更新**: 2025-09-30