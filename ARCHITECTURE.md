# 慈濟災害個人資料收集系統 - 技術架構文件

**專案名稱**: Ragasa Collector (Relief Fund Application System)
**版本**: v0.0.1
**最後更新**: 2025-09-28
**文件作者**: Claude AI Team (程編 + 工具人協作分析)

---

## 目錄

1. [專案概述](#專案概述)
2. [技術棧](#技術棧)
3. [系統架構](#系統架構)
4. [資料庫設計](#資料庫設計)
5. [核心業務流程](#核心業務流程)
6. [組件架構](#組件架構)
7. [安全性分析](#安全性分析)
8. [性能考量](#性能考量)
9. [開發指南](#開發指南)
10. [已知問題與改進建議](#已知問題與改進建議)

---

## 專案概述

### 業務目標
慈濟災害個人資料收集系統旨在提供一個快速、簡便的線上平台，讓災害受災戶能夠透過網頁表單提交個人資訊和申請慰問金。

### 核心功能
1. **用戶註冊與認證** - 使用預設密碼的快速註冊機制
2. **多步驟申請流程** - 包含慰問信閱讀、個資同意書、資料填寫
3. **檔案上傳管理** - 證件照片、銀行證明、電子簽名
4. **批量註冊功能** - 支援管理員批量建立帳號
5. **資料匯出功能** - CSV/Excel 格式匯出
6. **多語言支援** - 繁體中文與英文

### 目標用戶
- **受災戶**: 提交救助申請
- **慈濟志工**: 協助受災戶填寫表單
- **管理人員**: 審核申請、匯出資料

---

## 技術棧

### 前端技術
```
核心框架:
├── Next.js 15.3.1        # React 框架（App Router）
├── React 18.3.1          # UI 函式庫
├── TypeScript 5.6.3      # 型別系統
└── Tailwind CSS 4.1.11   # 樣式框架

UI 組件:
├── HeroUI 2.8.4          # UI 組件庫
├── Framer Motion 11.18.2 # 動畫
└── React Markdown 10.1.0 # Markdown 渲染

國際化:
├── i18next 25.5.2
└── react-i18next 16.0.0

開發工具:
├── ESLint 9.25.1
├── Prettier 3.5.3
└── TypeScript ESLint 8.34.1
```

### 後端服務
```
BaaS 平台:
└── Supabase
    ├── PostgreSQL (資料庫)
    ├── Supabase Auth (認證)
    ├── Supabase Storage (檔案儲存)
    └── Row Level Security (資料安全)
```

### 部署環境
- **開發伺服器**: Next.js Dev Server (Turbopack)
- **生產部署**: 可部署至 Vercel、Netlify 或自建伺服器

---

## 系統架構

### 整體架構圖

```
┌─────────────────────────────────────────────────┐
│                   用戶介面層                      │
│  ┌──────────────────────────────────────────┐   │
│  │  Next.js App Router (Client Components)  │   │
│  │  ├── 頁面路由 (app/)                      │   │
│  │  ├── 共用組件 (components/)               │   │
│  │  └── 國際化 (lib/i18n/)                   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────┐
│                   業務邏輯層                      │
│  ┌──────────────────────────────────────────┐   │
│  │  React Hooks & State Management          │   │
│  │  ├── 表單狀態管理                         │   │
│  │  ├── 檔案處理邏輯                         │   │
│  │  └── 驗證邏輯                             │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────┐
│                   資料存取層                      │
│  ┌──────────────────────────────────────────┐   │
│  │  Supabase Client (lib/supabase.ts)       │   │
│  │  ├── Auth API                            │   │
│  │  ├── Database Queries                    │   │
│  │  └── Storage Operations                  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────┐
│                   後端服務層                      │
│  ┌──────────────────────────────────────────┐   │
│  │  Supabase Platform                       │   │
│  │  ├── PostgreSQL Database                 │   │
│  │  ├── Authentication Service              │   │
│  │  ├── Storage Service                     │   │
│  │  └── Row Level Security                  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 目錄結構

```
relieffundpj/
├── heroui/                      # 主應用目錄
│   ├── app/                     # Next.js App Router 頁面
│   │   ├── page.tsx             # 首頁（重定向到登入）
│   │   ├── login/               # 登入頁
│   │   ├── register/            # 註冊頁
│   │   ├── dashboard/           # 儀表板
│   │   ├── application/         # 申請相關頁面
│   │   │   └── new/             # 新申請表單（核心業務）
│   │   ├── applications/        # 申請列表
│   │   ├── application-detail/  # 申請詳情
│   │   ├── bulk-register/       # 批量註冊
│   │   └── layout.tsx           # 根佈局
│   ├── components/              # 共用組件
│   │   ├── CameraCapture.tsx    # 相機拍照組件
│   │   ├── SignatureCanvas.tsx  # 電子簽名組件
│   │   ├── BankSelector.tsx     # 銀行選擇器
│   │   ├── LanguageSwitcher.tsx # 語言切換
│   │   ├── ThemeSwitcher.tsx    # 主題切換
│   │   ├── MobileMenu.tsx       # 行動選單
│   │   └── form-steps/          # 表單步驟組件
│   ├── lib/                     # 工具函式庫
│   │   ├── supabase.ts          # Supabase 客戶端配置
│   │   └── i18n/                # 國際化配置
│   │       ├── index.ts
│   │       └── locales/         # 翻譯檔案
│   ├── config/                  # 配置檔案
│   │   ├── site.ts              # 網站配置
│   │   └── fonts.ts             # 字型配置
│   ├── sql/                     # 資料庫腳本
│   │   ├── setup_simple.sql     # 簡化版設置
│   │   ├── setup_production.sql # 生產環境設置
│   │   ├── setup_rls.sql        # RLS 策略
│   │   └── insert_bank_codes.sql# 銀行代碼資料
│   ├── public/                  # 靜態資源
│   │   └── content/             # 內容檔案
│   │       ├── letter-page-1.jpg
│   │       ├── letter-page-2.jpg
│   │       └── comfort-letter.pdf
│   ├── styles/                  # 樣式檔案
│   ├── types/                   # TypeScript 型別定義
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.js
├── letter.pdf                   # 慰問信文件
└── README.md
```

---

## 資料庫設計

### ER 圖

```
┌─────────────────────────────┐
│      auth.users             │
│  (Supabase 內建表)           │
├─────────────────────────────┤
│  id (UUID, PK)              │
│  email                      │
│  user_metadata              │
│    └─ full_name             │
└─────────────────────────────┘
              │ 1
              │
              │ N
┌─────────────────────────────┐
│  disaster_applications      │
├─────────────────────────────┤
│  id (UUID, PK)              │
│  user_id (UUID, FK)         │──┐
│  victim_name                │  │
│  id_number                  │  │
│  phone_number               │  │
│  address                    │  │
│  bank_code (FK) ────────────┼──┼─→ ┌──────────────────┐
│  bank_account               │  │   │   bank_codes     │
│  front_id_photo             │  │   ├──────────────────┤
│  back_id_photo              │  │   │  id (PK)         │
│  bank_photo                 │  │   │  code (VARCHAR3) │
│  signature                  │  │   │  name            │
│  status                     │  │   │  type            │
│  created_at                 │  │   └──────────────────┘
│  updated_at                 │  │
└─────────────────────────────┘  │
              ↓                   │
         (檔案儲存)                │
┌─────────────────────────────┐  │
│  Supabase Storage           │  │
│  Bucket: media              │  │
├─────────────────────────────┤  │
│  /front_id/{uuid}.jpg       │←─┘
│  /back_id/{uuid}.jpg        │
│  /bank_account/{uuid}.jpg   │
│  /signature/{uuid}.png      │
└─────────────────────────────┘
```

### 資料表詳細定義

#### 1. bank_codes（銀行代碼表）

```sql
CREATE TABLE public.bank_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bank_codes_code_name_unique
  ON bank_codes(code, name);
```

**欄位說明**:
- `code`: 銀行代碼（如 "004", "700"）
- `name`: 銀行名稱（如 "臺灣銀行", "中華郵政"）
- `type`: 類型
  - `bank` - 一般銀行
  - `postal` - 郵局
  - `credit_union` - 信用合作社
  - `farmers_association` - 農會

#### 2. disaster_applications（災害申請表）

```sql
CREATE TABLE public.disaster_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  victim_name VARCHAR(50) NOT NULL,
  id_number VARCHAR(10) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  bank_code VARCHAR(3) NOT NULL,
  bank_account VARCHAR(20) NOT NULL,
  front_id_photo VARCHAR(255),
  back_id_photo VARCHAR(255),
  bank_photo VARCHAR(255),
  signature VARCHAR(255),
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**欄位說明**:
- `id`: UUID 主鍵
- `user_id`: 關聯到 Supabase Auth 用戶
- `victim_name`: 受災人姓名
- `id_number`: 身分證號碼（格式：A123456789）
- `phone_number`: 聯絡電話
- `address`: 地址
- `bank_code`: 銀行代碼（外鍵）
- `bank_account`: 銀行帳號
- `front_id_photo`, `back_id_photo`, `bank_photo`, `signature`: Storage 檔案路徑
- `status`: 申請狀態
  - `submitted` - 已提交
  - `reviewed` - 已審核
  - `approved` - 已核准
  - `rejected` - 已拒絕
- `created_at`, `updated_at`: 時間戳記

**資料約束**:
```sql
-- 狀態檢查
ALTER TABLE disaster_applications ADD CONSTRAINT check_status
CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected'));

-- 身分證格式檢查
ALTER TABLE disaster_applications ADD CONSTRAINT check_id_number_format
CHECK (LENGTH(id_number) = 10 AND id_number ~ '^[A-Z][0-9]{9}$');

-- 電話號碼格式檢查
ALTER TABLE disaster_applications ADD CONSTRAINT check_phone_number_format
CHECK (phone_number ~ '^[0-9#\-\+\(\)\s]+$');
```

**索引**:
```sql
CREATE INDEX idx_disaster_applications_user_id ON disaster_applications(user_id);
CREATE INDEX idx_disaster_applications_status ON disaster_applications(status);
CREATE INDEX idx_disaster_applications_created_at ON disaster_applications(created_at);
CREATE INDEX idx_disaster_applications_id_number ON disaster_applications(id_number);
CREATE INDEX idx_disaster_applications_bank_code ON disaster_applications(bank_code);
```

**自動更新時間戳**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_disaster_applications_updated_at
    BEFORE UPDATE ON disaster_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Row Level Security (RLS) 策略

```sql
-- 啟用 RLS
ALTER TABLE bank_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_applications ENABLE ROW LEVEL SECURITY;

-- bank_codes: 所有認證用戶可讀取
CREATE POLICY "Enable read access for authenticated users"
ON bank_codes FOR SELECT
TO authenticated
USING (true);

-- disaster_applications: 用戶只能查看自己的申請
CREATE POLICY "Users can view own applications"
ON disaster_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- disaster_applications: 用戶可以新增自己的申請
CREATE POLICY "Users can insert own applications"
ON disaster_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- disaster_applications: 用戶可以更新自己的申請
CREATE POLICY "Users can update own applications"
ON disaster_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
```

---

## 核心業務流程

### 用戶註冊流程

```
使用者訪問 /register
         ↓
輸入姓名和電子郵件
         ↓
系統使用預設密碼 (94800552) 建立帳號
         ↓
呼叫 Supabase Auth signUp
         ↓
呼叫 PHP API 自動確認帳號
         ↓
3 秒後自動跳轉到登入頁
```

**關鍵代碼**:
```typescript
// app/register/page.tsx
const defaultPassword = '94800552'

const handleSubmit = async (e: React.FormEvent) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: defaultPassword,
    options: {
      data: { full_name: name.trim() },
      emailRedirectTo: undefined,
    },
  })

  // 自動確認機制
  await fetch('/api/confirm-user.php', {
    method: 'POST',
    body: JSON.stringify({ email })
  })

  setTimeout(() => router.push('/login'), 3000)
}
```

### 申請表單流程

```
Step 1: 上人慰問信
├─ 顯示兩頁 PDF 圖片
├─ 可放大檢視
└─ 提供 PDF 下載

Step 2: 個資授權同意書
├─ 顯示完整法律條款
├─ 必須勾選同意 checkbox
└─ 才能進入下一步

Step 3: 應急慰問金申請 (4 個子步驟)
│
├─ Sub-step 1: 基本資料填寫
│   ├─ 受災人姓名 (必填)
│   ├─ 身分證號碼 (必填, 即時驗證)
│   ├─ 電話號碼 (必填, 即時驗證)
│   ├─ 地址 (必填)
│   ├─ 銀行代碼 (必填, Autocomplete 搜尋)
│   └─ 銀行帳號 (必填, 即時驗證)
│
├─ Sub-step 2: 證件拍照
│   ├─ 身分證正面 (必填)
│   ├─ 身分證反面 (必填)
│   └─ 銀行存摺或證明 (必填)
│
├─ Sub-step 3: 電子簽名
│   └─ Canvas 手寫簽名 (必填)
│
└─ Sub-step 4: 確認提交
    ├─ 顯示資料預覽
    ├─ 確認所有檔案已上傳
    └─ 提交到 Supabase

提交流程:
1. 取得當前用戶 ID
2. 插入基本資料到資料庫
3. 獲取新建的 application ID
4. 並行上傳所有檔案到 Storage
5. 更新資料庫記錄加入檔案路徑
6. 顯示完成頁面
```

**表單驗證規則**:

```typescript
// 基本資料驗證
const validateBasicInfo = () => {
  return (
    formData.victim_name.trim() &&
    /^[A-Z][0-9]{9}$/.test(formData.id_number) &&
    /^[0-9\-]{8,12}$/.test(formData.phone_number) &&
    formData.address.trim() &&
    formData.bank_code &&
    /^[0-9]{5,20}$/.test(formData.bank_account)
  )
}

// 照片驗證
const validatePhotos = () => {
  return fileData.frontIdPhoto &&
         fileData.backIdPhoto &&
         fileData.bankPhoto
}

// 簽名驗證
const validateSignature = () => {
  return fileData.signature
}
```

### 檔案上傳機制

```typescript
// 上傳單一檔案
const uploadFileToStorage = async (
  file: File,
  folder: string,
  uuid: string
) => {
  const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
  const fileName = `${folder}/${uuid}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error
  return fileName
}

// 並行上傳所有檔案
const handleFinalSubmit = async () => {
  // 1. 插入基本資料
  const { data: applicationData } = await supabase
    .from('disaster_applications')
    .insert([{ ...formData, user_id: user.id }])
    .select()
    .single()

  const newApplicationId = applicationData.id

  // 2. 準備上傳
  const uploads: Promise<string>[] = []
  if (fileData.frontIdPhoto) {
    uploads.push(uploadFileToStorage(
      fileData.frontIdPhoto,
      'front_id',
      newApplicationId
    ))
  }
  // ... 其他檔案

  // 3. 並行上傳
  await Promise.all(uploads)

  // 4. 更新資料庫
  await supabase
    .from('disaster_applications')
    .update(updateData)
    .eq('id', newApplicationId)
}
```

---

## 組件架構

### 頁面組件

#### 1. 登入頁 (`app/login/page.tsx`)
- 功能: 用戶登入
- 使用預設密碼 `94800552`
- Supabase Auth 整合

#### 2. 註冊頁 (`app/register/page.tsx`)
- 功能: 新用戶註冊
- 自動使用預設密碼
- 呼叫 PHP API 自動確認帳號

#### 3. 儀表板 (`app/dashboard/page.tsx`)
- 功能: 主要導航中心
- 卡片式選單:
  - 新增申請
  - 申請記錄
  - 下載檔案
- 批量註冊入口（管理員功能）

#### 4. 新申請表單 (`app/application/new/page.tsx`)
⚠️ **巨型組件警告**: 943 行，建議拆分

**組件結構**:
```typescript
export default function NewApplicationPage() {
  const [currentStep, setCurrentStep] = useState<FormStep>()
  const [currentSubStep, setCurrentSubStep] = useState(1)
  const [formData, setFormData] = useState({ ... })
  const [fileData, setFileData] = useState({ ... })

  // Step 1: 慰問信
  if (currentStep === 'comfort-letter') { ... }

  // Step 2: 同意書
  if (currentStep === 'consent-form') { ... }

  // Step 3: 申請表單（4 個子步驟）
  if (currentStep === 'application-form') {
    if (currentSubStep === 1) { /* 基本資料 */ }
    if (currentSubStep === 2) { /* 證件拍照 */ }
    if (currentSubStep === 3) { /* 電子簽名 */ }
    if (currentSubStep === 4) { /* 確認提交 */ }
  }

  // Step 4: 完成
  if (currentStep === 'completed') { ... }
}
```

### 共用組件

#### 1. CameraCapture (`components/CameraCapture.tsx`)
**功能**: 拍照或上傳照片
- 支援相機拍照
- 支援檔案選擇
- 圖片預覽
- 重新拍攝

**使用範例**:
```typescript
<CameraCapture
  label="身分證正面"
  onCapture={(file) => setFileData(prev => ({
    ...prev,
    frontIdPhoto: file
  }))}
  isRequired
  currentImage={fileData.frontIdPhoto ?
    URL.createObjectURL(fileData.frontIdPhoto) : null
  }
/>
```

#### 2. SignatureCanvas (`components/SignatureCanvas.tsx`)
**功能**: 電子簽名板
- Canvas 手寫簽名
- 清除重簽功能
- 匯出為 PNG

**使用範例**:
```typescript
<SignatureCanvas
  label="請在下方簽名"
  onSave={(file) => setFileData(prev => ({
    ...prev,
    signature: file
  }))}
  isRequired
  currentSignature={fileData.signature ?
    URL.createObjectURL(fileData.signature) : null
  }
/>
```

#### 3. BankSelector (`components/BankSelector.tsx`)
**功能**: 銀行代碼選擇器
- Autocomplete 搜尋
- 支援銀行名稱和代碼搜尋
- 分類顯示（銀行/郵局/信用合作社/農會）

**使用範例**:
```typescript
<BankSelector
  bankCodes={bankCodes}
  selectedBankCode={formData.bank_code}
  onSelectionChange={(code, name) => {
    setFormData(prev => ({
      ...prev,
      bank_code: code,
      bank_name: name
    }))
  }}
  placeholder="搜尋銀行名稱或代碼"
  isRequired
/>
```

#### 4. LanguageSwitcher (`components/LanguageSwitcher.tsx`)
**功能**: 語言切換
- 支援繁體中文/英文
- 使用 i18next

#### 5. ThemeSwitcher (`components/ThemeSwitcher.tsx`)
**功能**: 深色/淺色主題切換
- 使用 next-themes

---

## 安全性分析

### 🚨 嚴重安全問題

#### 問題 1: 共用密碼機制
**風險等級**: 嚴重 (Critical)

**問題描述**:
- 所有用戶使用相同的硬編碼密碼 `94800552`
- 密碼直接顯示在註冊頁面 UI
- 下載功能也使用相同密碼驗證

**影響**:
- 任何知道密碼的人都可以註冊並訪問系統
- 無法區分不同用戶的權限
- 資料洩露風險極高

**建議解決方案**:
```typescript
// 短期: 使用環境變數
const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_DEFAULT_PASSWORD

// 中期: 實作個別密碼機制
const handleSubmit = async () => {
  const generatedPassword = generateSecurePassword()
  await supabase.auth.signUp({
    email,
    password: generatedPassword,
  })
  // 透過郵件或簡訊發送密碼給用戶
  await sendPasswordToUser(email, generatedPassword)
}

// 長期: 實作完整的密碼管理
- 密碼強度驗證
- 密碼重設功能
- 兩因素認證
```

#### 問題 2: Supabase 匿名金鑰暴露
**風險等級**: 中等 (Medium)

**問題描述**:
```typescript
// lib/supabase.ts
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**緩解措施**:
1. 這是 Supabase 的標準做法（前端必須有 anon key）
2. 必須搭配 RLS 策略保護資料
3. 確保所有敏感操作都透過 RLS 限制

**建議**:
- 使用環境變數管理金鑰
- 定期輪換金鑰
- 審查 RLS 策略完整性

#### 問題 3: 檔案上傳安全
**風險等級**: 高 (High)

**問題描述**:
- 缺少檔案類型驗證
- 無檔案大小限制
- 未檢查惡意內容

**建議解決方案**:
```typescript
// 檔案類型白名單
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const validateFile = (file: File): boolean => {
  // 檢查類型
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('不支援的檔案格式')
  }

  // 檢查大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('檔案大小超過 5MB')
  }

  return true
}

// 在上傳前驗證
const handleCapture = (file: File) => {
  try {
    validateFile(file)
    setFileData(prev => ({ ...prev, frontIdPhoto: file }))
  } catch (error) {
    showError(error.message)
  }
}
```

### Row Level Security (RLS) 驗證

**當前狀態**: ✅ 已啟用

**建議定期檢查**:
```sql
-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 檢查策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 性能考量

### 當前性能特性

#### 優勢
- ✅ Next.js App Router 提供良好的路由性能
- ✅ Supabase 資料庫索引配置合理
- ✅ 使用 UUID 主鍵，適合分散式系統

#### 潛在瓶頸

**1. 巨型組件渲染**
```
問題: application/new/page.tsx (943 行)
影響:
- 首次渲染較慢
- 難以實現 Code Splitting
- 增加 Bundle Size

建議:
- 拆分為多個小組件
- 使用 React.lazy() 動態載入
- 實作組件層級的 Code Splitting
```

**2. 並行檔案上傳無進度追蹤**
```
問題: Promise.all(uploads) 無法追蹤個別進度
影響:
- 用戶無法得知上傳狀態
- 網路錯誤時難以定位問題檔案

建議:
- 實作上傳進度條
- 使用 Promise.allSettled() 處理部分失敗
- 添加重試機制
```

**3. 大型圖片未經壓縮**
```
問題: 直接上傳原始照片
影響:
- 上傳時間較長
- 佔用較多儲存空間
- 增加流量成本

建議:
- 使用 browser-image-compression 壓縮圖片
- 目標: 1920x1080, 品質 80%
- 壓縮前顯示預覽
```

### 性能優化建議

#### 短期優化（1-2 週）

```typescript
// 1. 圖片壓縮
import imageCompression from 'browser-image-compression'

const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  return await imageCompression(file, options)
}

// 2. 上傳進度追蹤
const uploadWithProgress = async (
  file: File,
  folder: string,
  uuid: string,
  onProgress: (progress: number) => void
) => {
  const compressedFile = await compressImage(file)
  // ... 上傳邏輯 + 進度回調
}

// 3. 表單自動儲存（localStorage）
useEffect(() => {
  const savedFormData = localStorage.getItem('formData')
  if (savedFormData) {
    setFormData(JSON.parse(savedFormData))
  }
}, [])

useEffect(() => {
  localStorage.setItem('formData', JSON.stringify(formData))
}, [formData])
```

#### 中期優化（1-2 個月）

```typescript
// 1. 組件拆分
// Before: 單一巨型組件
export default function NewApplicationPage() { /* 943 lines */ }

// After: 拆分為多個組件
import { ComfortLetterStep } from './steps/ComfortLetterStep'
import { ConsentFormStep } from './steps/ConsentFormStep'
import { ApplicationFormStep } from './steps/ApplicationFormStep'

export default function NewApplicationPage() {
  return (
    <FormWizard>
      <ComfortLetterStep />
      <ConsentFormStep />
      <ApplicationFormStep />
    </FormWizard>
  )
}

// 2. 狀態管理重構（引入 Zustand）
import { create } from 'zustand'

const useApplicationStore = create((set) => ({
  formData: {},
  fileData: {},
  updateFormData: (data) => set({ formData: data }),
  updateFileData: (data) => set({ fileData: data }),
}))
```

---

## 開發指南

### 環境設置

#### 前置需求
- Node.js 20.x 或更高
- npm 或 yarn
- Supabase 帳號

#### 安裝步驟

```bash
# 1. Clone 專案
cd /Users/chih-hungtseng/projects/relieffundpj/heroui

# 2. 安裝依賴
npm install

# 3. 配置環境變數（創建 .env.local）
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# 4. 設置資料庫
# 在 Supabase Dashboard 執行 sql/setup_simple.sql
# 然後執行 sql/insert_bank_codes.sql

# 5. 啟動開發伺服器
npm run dev

# 6. 開啟瀏覽器
open http://localhost:3000
```

### 開發規範

#### 程式碼風格
```bash
# ESLint 檢查
npm run lint

# 自動修復
npm run lint -- --fix
```

#### Git Commit 規範
```
feat: 新增功能
fix: 修復 bug
docs: 文件更新
style: 代碼格式調整
refactor: 重構
test: 測試
chore: 建置或輔助工具變更
```

#### 分支策略
```
main          # 生產環境
├── develop   # 開發環境
└── feature/* # 功能分支
```

### 測試指南

⚠️ **當前狀態**: 無測試覆蓋

**建議測試策略**:

```typescript
// 1. 單元測試（Jest + React Testing Library）
// tests/components/BankSelector.test.tsx
describe('BankSelector', () => {
  it('should filter banks by search term', () => {
    // ...
  })
})

// 2. 整合測試
// tests/integration/application-flow.test.tsx
describe('Application Flow', () => {
  it('should complete full application process', () => {
    // ...
  })
})

// 3. E2E 測試（Playwright）
// e2e/application.spec.ts
test('user can submit disaster application', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('button[type="submit"]')
  // ...
})
```

---

## 已知問題與改進建議

### 架構評分（1-10 分）

| 評估項目 | 分數 | 說明 |
|---------|------|------|
| **安全性** | 4/10 | ⚠️ 嚴重問題：共用密碼機制 |
| **可維護性** | 5/10 | 組件過大、缺少測試 |
| **可擴展性** | 6/10 | 基礎架構可行，需要更多抽象層 |
| **性能** | 7/10 | 基本性能良好，可進一步優化 |
| **用戶體驗** | 7/10 | 流程清晰，RWD 支援良好 |

### 優先級改進清單

#### 🔴 高優先級（立即處理）

1. **安全性增強**
   - [ ] 移除硬編碼密碼
   - [ ] 實作檔案上傳驗證（類型、大小）
   - [ ] 添加 rate limiting
   - [ ] 使用環境變數管理敏感資訊

2. **錯誤處理**
   - [ ] 統一錯誤訊息格式
   - [ ] 添加 Toast 通知系統
   - [ ] 實作網路錯誤重試機制
   - [ ] 上傳失敗回滾邏輯

#### 🟡 中優先級（1-2 個月）

3. **架構重構**
   - [ ] 拆分 `application/new/page.tsx` 巨型組件
   - [ ] 引入狀態管理（Zustand 或 Redux）
   - [ ] 實作 API Service Layer
   - [ ] 組件抽象化和可重用性

4. **測試覆蓋**
   - [ ] 單元測試（Jest）
   - [ ] 整合測試
   - [ ] E2E 測試（Playwright）
   - [ ] 視覺回歸測試

5. **性能優化**
   - [ ] 圖片壓縮和優化
   - [ ] 上傳進度追蹤
   - [ ] 實作 PWA 功能
   - [ ] 添加快取策略

#### 🟢 低優先級（3-6 個月）

6. **企業級功能**
   - [ ] 審計日誌系統
   - [ ] 角色權限管理（RBAC）
   - [ ] 資料匯出和備份
   - [ ] 批量操作優化

7. **可觀測性**
   - [ ] 整合監控系統（Sentry）
   - [ ] 性能追蹤（Vercel Analytics）
   - [ ] 使用者行為分析
   - [ ] 錯誤追蹤和報告

8. **合規性**
   - [ ] GDPR 合規性
   - [ ] 資料加密（at rest & in transit）
   - [ ] 安全審計
   - [ ] 隱私政策和條款

### 技術債務清單

| 類別 | 描述 | 優先級 | 預估工時 |
|-----|------|--------|---------|
| 安全性 | 共用密碼機制 | 🔴 高 | 3 天 |
| 架構 | 巨型組件拆分 | 🔴 高 | 5 天 |
| 測試 | 無測試覆蓋 | 🟡 中 | 2 週 |
| 性能 | 圖片未壓縮 | 🟡 中 | 2 天 |
| 文件 | API 文件缺失 | 🟢 低 | 3 天 |
| 監控 | 無錯誤追蹤 | 🟢 低 | 1 週 |

### 適用場景評估

#### ✅ 適用場景
- 災害救助快速部署
- 小規模試點專案（<500 用戶）
- 內部管理系統（受控環境）

#### ⚠️ 需要改進才適用
- 中型組織應用（500-5000 用戶）
  - 需要：架構重構、測試覆蓋、性能優化
- 公開服務
  - 需要：安全性增強、RBAC、監控系統

#### ❌ 不適用場景
- 大規模公開服務（>5000 用戶）
  - 需要完全重新設計架構
- 需要高度安全性的金融應用
  - 需要通過安全審計和認證
- 複雜的企業級工作流程
  - 需要更強大的狀態管理和業務邏輯層

---

## 結論

### 專案優勢
1. ✅ **完整的業務流程實現** - 三步驟申請流程清晰明確
2. ✅ **現代化技術棧** - Next.js 15, React 18, TypeScript
3. ✅ **良好的多語言支援** - i18next 整合完善
4. ✅ **RWD 響應式設計** - 行動裝置體驗良好
5. ✅ **Supabase 整合** - BaaS 降低後端開發成本

### 關鍵挑戰
1. ⚠️ **安全性問題** - 共用密碼機制需要立即改進
2. ⚠️ **可維護性** - 巨型組件和缺少測試
3. ⚠️ **技術債務** - 需要持續重構和優化

### 建議發展路徑

**階段一：安全性加固（立即 - 2 週）**
- 修復共用密碼問題
- 添加檔案上傳驗證
- 實作基本的錯誤處理

**階段二：架構優化（1-2 個月）**
- 組件拆分和重構
- 引入狀態管理
- 添加測試覆蓋

**階段三：企業級升級（3-6 個月）**
- 實作 RBAC
- 添加監控和日誌
- 性能優化和 PWA

---

## 附錄

### A. 環境變數清單

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# 應用配置
NEXT_PUBLIC_APP_NAME=慈濟災害個人資料收集系統
NEXT_PUBLIC_DEFAULT_LOCALE=zh-TW

# 功能開關
NEXT_PUBLIC_ENABLE_BULK_REGISTER=true
NEXT_PUBLIC_ENABLE_FILE_COMPRESSION=false
```

### B. 常用指令

```bash
# 開發
npm run dev              # 啟動開發伺服器（Turbopack）
npm run build            # 建置生產版本
npm run start            # 啟動生產伺服器
npm run lint             # ESLint 檢查

# 資料庫
psql -h localhost -U postgres -d supabase -f sql/setup_simple.sql

# 部署
vercel --prod            # 部署到 Vercel
```

### C. 相關資源

- [Next.js 文件](https://nextjs.org/docs)
- [Supabase 文件](https://supabase.com/docs)
- [HeroUI 文件](https://heroui.com/)
- [i18next 文件](https://www.i18next.com/)

---

**文件版本**: v1.0
**最後更新**: 2025-09-28
**維護者**: Claude AI Development Team
**授權**: MIT License