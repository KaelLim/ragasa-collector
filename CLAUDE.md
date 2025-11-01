# 慈濟災害個人資料收集系統 - Claude AI 開發指引

> **專案名稱**: 慈濟災害個人資料收集系統 (Tzu Chi Disaster Relief Personal Data Collection System)
> **版本**: v0.0.1
> **最後更新**: 2025-09-28

## 📋 快速索引

- [技術棧概覽](#技術棧概覽)
- [專案結構](#專案結構)
- [核心業務流程](#核心業務流程)
- [關鍵檔案位置](#關鍵檔案位置)
- [開發注意事項](#開發注意事項)
- [已知問題與限制](#已知問題與限制)
- [常見開發任務](#常見開發任務)

---

## 🚀 技術棧概覽

### 前端框架
- **Next.js 15.3.1** (App Router)
- **React 18.3.1** (Client Components)
- **TypeScript 5.6.3**
- **Tailwind CSS 4.1.11**

### UI 組件庫
- **HeroUI 2.8.4** (主要 UI 框架)
- **Framer Motion** (動畫效果)
- **react-markdown** (Markdown 渲染)

### 後端服務
- **Supabase** (BaaS)
  - PostgreSQL 資料庫
  - Supabase Auth (使用者認證)
  - Supabase Storage (檔案管理)
  - Row Level Security (RLS)

### 國際化
- **i18next** + **react-i18next**
- 支援語言: 繁體中文 (預設) / English

---

## 📂 專案結構

```
relieffundpj/heroui/
├── app/
│   ├── page.tsx                    # 首頁 (登入頁面)
│   ├── register/page.tsx           # 註冊頁面 ⚠️ 硬編碼密碼問題
│   ├── dashboard/page.tsx          # 主控台 (申請清單 + 下載功能)
│   ├── application/
│   │   ├── new/page.tsx            # 🔴 核心：新申請表單 (943行巨型組件)
│   │   └── [id]/page.tsx           # 申請詳情檢視
│   ├── layout.tsx                  # 根佈局 (國際化設定)
│   └── providers.tsx               # HeroUI Provider
├── components/
│   ├── CameraCapture.tsx           # 相機拍照元件
│   ├── SignatureCanvas.tsx         # 簽名畫布元件
│   ├── BankSelector.tsx            # 銀行選擇器
│   └── navbar.tsx                  # 導航列
├── lib/
│   └── supabase.ts                 # ⚠️ Supabase 配置 (包含 anon key)
├── sql/
│   └── setup_simple.sql            # 資料庫 Schema 定義
├── public/
│   └── locales/                    # i18n 翻譯檔案
│       ├── en/translation.json
│       └── zh-TW/translation.json
└── config/
    └── fonts.ts                    # 字型設定
```

---

## 🔄 核心業務流程

### 申請流程 (3 大步驟 + 4 子步驟)

```
步驟 1: comfort-letter (慰問信)
   └─> 閱讀並同意慰問信內容

步驟 2: consent-form (授權同意書)
   └─> 閱讀並同意授權條款

步驟 3: application-form (申請表單) - 4 個子步驟
   ├─> 子步驟 1: 基本資料輸入
   │   ├─ 受災者姓名 (victim_name)
   │   ├─ 身分證字號 (id_number) - 驗證: ^[A-Z][0-9]{9}$
   │   ├─ 聯絡電話 (phone_number) - 驗證: ^[0-9\-]{8,12}$
   │   ├─ 聯絡地址 (address)
   │   ├─ 銀行代碼 (bank_code) - 3位數字
   │   └─ 銀行帳號 (bank_account) - 驗證: ^[0-9]{5,20}$
   │
   ├─> 子步驟 2: 身分證照片
   │   ├─ 身分證正面照 (front_id_photo)
   │   └─ 身分證背面照 (back_id_photo)
   │
   ├─> 子步驟 3: 銀行存摺照片
   │   └─ 存摺封面照 (bank_photo)
   │
   └─> 子步驟 4: 簽名確認
       └─ 申請人簽名 (signature)

步驟 4: completed (完成)
   └─> 顯示申請成功訊息 + 申請編號
```

### 檔案上傳機制

```javascript
// 檔案儲存結構
supabase.storage.from('media')
  ├─ id-cards-front/   # 身分證正面
  ├─ id-cards-back/    # 身分證背面
  ├─ bank-photos/      # 銀行存摺
  └─ signatures/       # 簽名檔案

// 檔案命名規則: {folder}/{uuid}.{jpg|png}
// 例: id-cards-front/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
```

---

## 🔑 關鍵檔案位置

### 必讀檔案

| 檔案路徑 | 重要性 | 說明 |
|---------|--------|------|
| `lib/supabase.ts` | 🔴 極高 | Supabase 配置，包含 API 金鑰 (安全風險) |
| `app/application/new/page.tsx` | 🔴 極高 | 核心業務邏輯 (943行巨型組件) |
| `app/register/page.tsx` | 🟠 高 | 註冊邏輯 (硬編碼密碼: 94800552) |
| `sql/setup_simple.sql` | 🟡 中 | 資料庫 Schema 定義 |
| `components/CameraCapture.tsx` | 🟡 中 | 相機拍照功能實作 |
| `components/SignatureCanvas.tsx` | 🟡 中 | 簽名畫布實作 |

### 資料庫 Schema

#### `disaster_applications` 表 (主表)

```typescript
interface DisasterApplication {
  id: string                    // UUID (主鍵)
  user_id: string               // 使用者 ID (外鍵到 auth.users)
  victim_name: string           // 受災者姓名 (max 50)
  id_number: string             // 身分證字號 (固定 10)
  phone_number: string          // 聯絡電話 (8-12 位)
  address: string               // 聯絡地址 (TEXT)
  bank_code: string             // 銀行代碼 (3 位)
  bank_account: string          // 銀行帳號 (5-20 位)
  front_id_photo?: string       // 身分證正面照 URL
  back_id_photo?: string        // 身分證背面照 URL
  bank_photo?: string           // 銀行存摺照 URL
  signature?: string            // 簽名檔案 URL
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string            // 建立時間
  updated_at: string            // 更新時間
}
```

#### `bank_codes` 表 (參考表)

```typescript
interface BankCode {
  id: number                    // 自動遞增主鍵
  code: string                  // 銀行代碼 (3位)
  name: string                  // 銀行名稱 (max 100)
  type: string                  // 銀行類型 (max 20)
  created_at: string            // 建立時間
}
```

---

## ⚠️ 開發注意事項

### 🔴 關鍵安全問題 (必須優先處理)

1. **共享密碼漏洞 (Critical)**
   - **位置**: `app/register/page.tsx`
   - **問題**: 所有使用者共用硬編碼密碼 `94800552`
   - **風險**: 任何人知道此密碼即可登入任意帳號
   - **建議**: 實作 OTP 或 Magic Link 無密碼登入

2. **敏感資訊暴露 (High)**
   - **位置**: `lib/supabase.ts`
   - **問題**: Supabase Anon Key 直接寫在程式碼中
   - **風險**: 金鑰洩露風險
   - **建議**: 移至環境變數 `.env.local`

3. **檔案上傳驗證缺失 (Medium)**
   - **位置**: `app/application/new/page.tsx`
   - **問題**: 未驗證檔案類型、大小、內容
   - **風險**: 惡意檔案上傳、儲存空間濫用
   - **建議**: 加入檔案類型白名單、大小限制、病毒掃描

### 🟠 架構問題

1. **巨型組件 (應優先重構)**
   - **位置**: `app/application/new/page.tsx` (943 行)
   - **問題**: 違反單一職責原則，難以維護和測試
   - **建議重構方案**:
     ```
     app/application/new/
     ├── page.tsx (主容器 ~100 行)
     ├── components/
     │   ├── ComfortLetter.tsx
     │   ├── ConsentForm.tsx
     │   ├── ApplicationForm/
     │   │   ├── index.tsx
     │   │   ├── BasicInfoStep.tsx
     │   │   ├── IdPhotoStep.tsx
     │   │   ├── BankPhotoStep.tsx
     │   │   └── SignatureStep.tsx
     │   └── CompletedMessage.tsx
     ├── hooks/
     │   ├── useApplicationForm.ts
     │   ├── useFileUpload.ts
     │   └── useFormValidation.ts
     └── types.ts
     ```

2. **測試覆蓋率為零**
   - **現狀**: 無任何測試檔案
   - **風險**: 重構或新增功能時容易引入 Bug
   - **建議**: 優先為核心業務邏輯 (`application/new/page.tsx`) 撰寫測試

### 🟡 效能考量

1. **大型相依套件**
   - `@mui/material` 和 `@mui/icons-material` 未充分使用
   - **建議**: 評估是否可用 HeroUI 內建圖示替代，減少 bundle size

2. **圖片最佳化**
   - 使用者上傳的照片未進行壓縮
   - **建議**: 客戶端壓縮 + Supabase Transform API

---

## 🛠️ 常見開發任務

### 新增表單欄位

1. 更新 TypeScript 型別 (`lib/supabase.ts`)
2. 修改資料庫 Schema (`sql/setup_simple.sql`)
3. 在 `application/new/page.tsx` 的 `formData` state 中加入欄位
4. 在對應的子步驟 UI 中加入表單控制項
5. 更新 `validateBasicInfo()` 驗證邏輯
6. 更新翻譯檔案 (`public/locales/*/translation.json`)

### 修改申請狀態流程

申請狀態定義在 `disaster_applications.status`:
- `submitted` → `reviewed` → `approved` | `rejected`

如需修改:
1. 更新資料庫 CHECK constraint (`sql/setup_simple.sql`)
2. 更新 TypeScript 型別定義 (`lib/supabase.ts`)
3. 修改狀態顯示邏輯 (`app/dashboard/page.tsx`)

### 新增國際化語言

1. 複製現有翻譯檔案:
   ```bash
   cp -r public/locales/zh-TW public/locales/ja
   ```
2. 翻譯 `public/locales/ja/translation.json`
3. 更新 `app/layout.tsx` 的語言切換選項

---

## 🐛 已知問題與限制

### 安全性
- [ ] 共享密碼漏洞 (Critical)
- [ ] Supabase 金鑰硬編碼 (High)
- [ ] 缺少檔案上傳驗證 (Medium)
- [ ] 下載功能使用同一密碼 (Medium)
- [ ] 未實作 RLS 政策驗證 (需確認)

### 架構
- [ ] 巨型組件需重構 (943 行)
- [ ] 無測試覆蓋率
- [ ] 缺少錯誤邊界處理
- [ ] 未使用 Next.js 15 的 Parallel Routes

### 功能
- [ ] 無申請編輯功能 (只能新增)
- [ ] 無申請刪除功能
- [ ] 缺少檔案預覽功能
- [ ] 未實作進度自動儲存

### 效能
- [ ] 圖片未壓縮
- [ ] 大型相依套件未最佳化
- [ ] 無 SSR/ISR 快取策略

---

## 📚 參考資料

### 詳細技術文件
完整架構分析請參閱: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

### 官方文檔
- [Next.js 15 文檔](https://nextjs.org/docs)
- [Supabase 文檔](https://supabase.com/docs)
- [HeroUI 文檔](https://www.heroui.com)
- [i18next 文檔](https://www.i18next.com)

### 專案相關
- **GitHub 儲存庫**: https://github.com/KaelLim/ragasa-collector
- **Supabase 專案**: https://sberelieffundpj.tzuchi-org.tw

---

## 🚀 開發環境設定

### 前置需求
- Node.js >= 18.17
- npm >= 9.6.7

### 快速開始

```bash
# 安裝相依套件
cd heroui
npm install

# 設定環境變數 (建議)
cp .env.example .env.local
# 編輯 .env.local，設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY

# 啟動開發伺服器
npm run dev

# 開啟瀏覽器
open http://localhost:5173
```

### 資料庫設定

```bash
# 在 Supabase Dashboard 執行
psql -h sberelieffundpj.tzuchi-org.tw -U postgres -f sql/setup_simple.sql
```

---

## 🎯 建議優先處理事項

### 短期 (1-2 週)
1. ✅ 建立技術文件 (已完成)
2. 🔴 修復共享密碼安全漏洞
3. 🔴 將 Supabase 金鑰移至環境變數
4. 🟠 加入檔案上傳驗證

### 中期 (1-2 月)
1. 重構巨型組件 (`application/new/page.tsx`)
2. 建立測試套件 (Jest + React Testing Library)
3. 實作申請編輯功能
4. 優化圖片上傳與儲存

### 長期 (3-6 月)
1. 實作管理後台 (審核功能)
2. 加入申請狀態通知 (Email/SMS)
3. 效能最佳化 (SSR、快取)
4. 建立 CI/CD 流程

---

## 📞 聯絡資訊

如有技術問題或需要協助，請聯絡:
- **專案負責人**: [待補充]
- **技術支援**: [待補充]

---

**最後更新**: 2025-09-28
**文件維護者**: Claude AI (Anthropic)
**專案版本**: v0.0.1

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
