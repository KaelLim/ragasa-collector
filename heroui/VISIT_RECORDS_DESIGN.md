# 訪視紀錄模組設計文檔

> **建立日期**: 2025-10-11
> **版本**: V1.1.0
> **參考來源**: [Ragic 華加沙臨時表單](https://ap11.ragic.com/TCTCharity/kava-kasha-temporary-form/15)

---

## 📋 目錄

1. [功能概述](#功能概述)
2. [資料庫設計](#資料庫設計)
3. [訪視編號規範](#訪視編號規範)
4. [步驟流程設計](#步驟流程設計)
5. [技術架構](#技術架構)
6. [API 設計](#api-設計)
7. [UI/UX 設計](#uiux-設計)
8. [開發進度](#開發進度)

---

## 功能概述

### 業務目標
建立訪視紀錄系統，記錄慈濟志工對災民的訪視過程，包含：
- 家戶基本資料
- 特殊註記與後續需求
- 福利身分
- 訪視互動記錄
- 證件與現場照片

### 核心特性
- ✅ 每個申請案件僅能建立一次訪視紀錄
- ✅ 訪視編號自動生成（UUID7 + 村代碼 + 流水號）
- ✅ 步驟式表單設計（避免長頁面滾動）
- ✅ 照片上傳至獨立 Storage Bucket (`visit-media`)
- ✅ JSONB 格式儲存彈性資料結構
- ✅ 雙語支援（繁中/英文）

---

## 資料庫設計

### 主表: `visit_records`

```sql
CREATE TABLE visit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  application_id UUID REFERENCES disaster_applications(id) NOT NULL UNIQUE,
  visit_code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  visit_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### JSONB 資料結構: `visit_data`

```json
{
  "basic": {
    "kavaKashaCode": "華加沙編碼",
    "village": "大安村",
    "visitDate": "2025-10-11",
    "victimName": "受災鄉親姓名",
    "contactAddress": "聯絡地址"
  },
  "household": {
    "specialNotes": ["獨老或兩老相依", "有身障人口"],
    "followUpNeeds": ["經濟需求", "居家修繕"],
    "welfareStatus": "低收入戶"
  },
  "status": {
    "isReceived": true,
    "isDonatedBack": false,
    "isReported": false
  },
  "documents": {
    "idFrontPhoto": "https://...",
    "idBackPhoto": "https://...",
    "householdTranscript": "https://..."
  },
  "visit": {
    "notes": "訪視互動情形紀錄...",
    "interactionPhotos": ["https://...", "https://..."],
    "receiptPhoto": "https://...",
    "otherPhotos": ["https://..."]
  }
}
```

### 索引設計

```sql
-- 快速查詢相關申請
CREATE INDEX idx_visit_records_application_id ON visit_records(application_id);

-- 快速查詢訪視編號
CREATE INDEX idx_visit_records_visit_code ON visit_records(visit_code);

-- 快速查詢建立者
CREATE INDEX idx_visit_records_user_id ON visit_records(user_id);

-- 快速篩選村名
CREATE INDEX idx_visit_records_village ON visit_records((visit_data->'basic'->>'village'));

-- 快速排序訪視日期
CREATE INDEX idx_visit_records_visit_date ON visit_records((visit_data->'basic'->>'visitDate'));
```

### RLS 政策

- **查看**：所有認證用戶可查看所有訪視記錄
- **新增**：所有認證用戶可新增訪視記錄
- **更新**：僅能更新自己建立的記錄
- **刪除**：僅能刪除自己建立的記錄

---

## 訪視編號規範

### 格式定義

```
{主檔UUID7}-{村代碼}{流水號}
```

### 範例

```
01234567-89ab-cdef-0123-456789abcdef-A0001
└────────────────┬───────────────┘│││││
              主檔UUID7          │││││
                                 │└┴┴┴─ 村代碼 + 流水號
                                 └─ 連字符分隔
```

**範例解析**:
- 主檔UUID7: `01234567-89ab-cdef-0123-456789abcdef`
- 連字符: `-`
- 村代碼: `A` (大安村)
- 流水號: `0001` (該村第 1 個訪視紀錄)

### 村代碼對照表

| 村名 | 代碼 |
|------|------|
| 大安村 | A |
| 大馬村 | M |
| 大平村 | P |
| 大華村 | H |
| 大同村 | T |
| 東富村 | F |
| 其他 | O |

### 流水號規則

- **範圍**: 0001 ~ 9999
- **同村獨立計數**: 每個村子各自維護流水號
- **自動遞增**: 系統自動計算下一個可用編號
- **永不重複**: 編號建立後不可更改

### 編號生成邏輯

```typescript
// 1. 獲取同村所有訪視編號
const existingCodes = await getExistingVisitCodes(village)

// 2. 解析流水號
const numbers = existingCodes
  .map(parseVisitCode)
  .filter(parsed => parsed.villageCode === villageCode)
  .map(parsed => parsed.sequenceNumber)

// 3. 計算下一個流水號
const nextNumber = numbers.length === 0 ? 1 : Math.max(...numbers) + 1

// 4. 生成完整編號
const visitCode = `${applicationId}B${villageCode}${nextNumber.toString().padStart(4, '0')}`
```

---

## 步驟流程設計

### 步驟 0: 待訪視列表 ✅ (已完成)

**目的**: 顯示尚未建立訪視紀錄的申請案件

**功能**:
- 從 `disaster_applications` 表查詢所有申請
- LEFT JOIN `visit_records`，篩選出 `visit_records.id IS NULL` 的記錄
- 顯示三欄：申請人姓名、申請編號（UUID前8碼）、地址
- 響應式設計：桌面版表格 / 手機版卡片
- 點擊「開始訪視」進入訪視表單

**路由**: `/visit-records`

---

### 步驟 1: 基本資訊確認 ⏳ (待開發)

**自動生成欄位**:
- **華加沙編碼** = 訪視編號（系統自動生成，不可編輯）
  - 格式: `{UUID7}B{村代碼}{流水號}`
  - 範例: `01234567-89ab-cdef-0123-456789abcdefBA0001`
- **紀錄日期**（從訪視編號的 UUID7 時間戳記自動提取）
  - 使用 `extractDateFromUUID7()` 函數
  - 顯示格式: YYYY/MM/DD

**自動帶入欄位（從個資主檔）**:
- **受災鄉親姓名**（`application_data.victim.name`）
- **聯絡地址**（`application_data.victim.address`）
- **村名**（從地址自動判讀）
  - 使用 `detectVillageFromAddress()` 函數
  - 可手動修正（下拉選單）
- **受訪視者**（預設帶入戶長）
  - 姓名: `application_data.household.householdHead.name`
  - 關係: 戶長

**受訪視者管理**:
- 顯示受訪視者列表（卡片式）
- 每位受訪視者包含：
  - 姓名（必填）
  - 關係（下拉選單：戶長/配偶/子女/父母/其他親屬/鄰居/村里長/其他）
- 提供「+ 新增受訪視者」按鈕
- 提供刪除按鈕（至少保留一位）

**UI 設計**:
```
┌─────────────────────────────────────┐
│ 訪視基本資訊                         │
├─────────────────────────────────────┤
│ 華加沙編碼: UUID7B村代碼流水號 🔒    │
│ 紀錄日期: 2025/10/11 🔒              │
│ 受災鄉親: 王小明 🔒                  │
│ 聯絡地址: 花蓮縣壽豐鄉大安村... 🔒   │
│ 村名: [大安村 ▼] ✏️                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 受訪視者                             │
├─────────────────────────────────────┤
│ ┌─ 受訪者 1 ────────────────────┐  │
│ │ 姓名: 王小明                    │  │
│ │ 關係: [戶長 ▼]                 │  │
│ │                          [刪除] │  │
│ └────────────────────────────────┘  │
│ ┌─ 受訪者 2 ────────────────────┐  │
│ │ 姓名: 李小華                    │  │
│ │ 關係: [配偶 ▼]                 │  │
│ │                          [刪除] │  │
│ └────────────────────────────────┘  │
│                                      │
│ [+ 新增受訪視者]                    │
└─────────────────────────────────────┘
```

**路由**: `/visit-records/new?applicationId=xxx&step=1`

---

### 步驟 2: 家戶資料與需求 ⏳ (待開發)

**家戶特殊註記（多選）**:
- 獨老或兩老相依
- 有身障人口
- 有失能人口
- 原民
- 新住民
- 法親

**後續需求項目（多選）**:
- 經濟需求
- 就學子女關懷
- 居家修繕
- 居住安置
- 醫療資源
- 長照資源
- 輔具資源
- 心靈陪伴
- 水電維護
- 鐵捲門維護

**福利身分（下拉選單）**:
- 無
- 低收入戶
- 中低收入戶

**路由**: `/visit-records/new?applicationId=xxx&step=2`

---

### 步驟 3: 狀態標記 ⏳ (待開發)

**核取方塊**:
- 是否完成領取（預設勾選）
- 是否回捐
- 是否轉提報

**路由**: `/visit-records/new?applicationId=xxx&step=3`

---

### 步驟 4: 訪視記錄 ⏳ (待開發)

**訪視互動情形紀錄**:
- 多行文字輸入框
- 建議字數：200-500 字

**照片上傳**:
- 互動照片（多張上傳，最多 10 張）
- 其他佐證照片（多張上傳，選填）

**儲存位置**:
- `visit-media/interactions`
- `visit-media/others`

**路由**: `/visit-records/new?applicationId=xxx&step=4`

---

### 步驟 5: 電子簽收單 ⏳ (待開發)

**簽收單據範本內容**:
```
慈濟基金會發放訪視簽收單

受災戶姓名：{從個資主檔帶入}
身分證字號：{從個資主檔帶入}
聯絡地址：{從個資主檔帶入}

發放金額：NT$ {可編輯，預設值}
簽領日期：{日期選擇器，預設今天}

受領人簽名：{電子簽名畫布}
```

**欄位說明**:
- **發放金額**（可編輯）：預設值可由管理員設定（如 NT$ 10,000）
- **簽領日期**（日期選擇器）：預設為今天，可修改
- **電子簽名**（簽名畫布）：使用 SignatureCanvas 組件
  - 支援觸控螢幕
  - 提供「清除重簽」按鈕
  - 簽名完成後轉換為 Data URL 儲存

**儲存格式**:
```json
{
  "receipt": {
    "amount": 10000,
    "receiptDate": "2025-10-11",
    "signature": "data:image/png;base64,iVBORw0KG..."
  }
}
```

**路由**: `/visit-records/new?applicationId=xxx&step=5`

---

### 步驟 6: 確認送出 ⏳ (待開發)

**資料預覽區塊**:

1. **基本資訊**
   - 華加沙編碼
   - 村名
   - 紀錄日期
   - 受災鄉親姓名
   - 聯絡地址

2. **家戶資料**
   - 特殊註記標籤
   - 後續需求項目標籤
   - 福利身分

3. **狀態標記**
   - 完成領取狀態
   - 回捐狀態
   - 轉提報狀態

4. **訪視記錄**
   - 互動情形文字
   - 互動照片縮圖
   - 其他佐證照片縮圖

5. **電子簽收單預覽**
   - 發放金額
   - 簽領日期
   - 電子簽名預覽

6. **證件照片（從個資主檔帶入）**
   - 身分證正面
   - 身分證背面
   - 戶籍謄本（如有）

**功能按鈕**:
- 返回修改（返回任意步驟）
- 提交訪視記錄

**提交成功後**:
- 顯示成功訊息
- 顯示訪視編號
- 提供選項：查看記錄 / 返回列表 / 下載簽收單 PDF

**路由**: `/visit-records/new?applicationId=xxx&step=6`

---

## 技術架構

### 前端技術棧

```
Next.js 15.3.1 (App Router)
├── React 18.3.1 (Client Components)
├── TypeScript 5.6.3
├── HeroUI 2.x (UI 組件庫)
├── Tailwind CSS 4.x (樣式)
├── react-i18next (國際化)
└── Framer Motion (動畫)
```

### 後端服務

```
Supabase
├── PostgreSQL (資料庫)
│   └── JSONB 格式儲存
├── Supabase Auth (使用者認證)
├── Supabase Storage (檔案管理)
│   └── visit-media bucket
└── Row Level Security (RLS)
```

### 核心檔案結構

```
heroui/
├── sql/
│   └── create_visit_records.sql          # 資料庫 Schema
├── lib/
│   └── visit-record-types.ts             # TypeScript 類型定義
├── hooks/
│   └── useVisitRecord.ts                 # 訪視紀錄 Hook
├── app/
│   └── visit-records/
│       ├── page.tsx                      # 步驟 0: 待訪視列表
│       ├── new/page.tsx                  # 步驟 1-6: 訪視表單 (待建立)
│       └── completed/page.tsx            # 已完成列表 (待建立)
└── components/
    └── VisitRecordForm/                  # 訪視表單組件 (待建立)
        ├── BasicInfoStep.tsx
        ├── HouseholdNeedsStep.tsx
        ├── StatusMarksStep.tsx
        ├── DocumentsStep.tsx
        ├── VisitNotesStep.tsx
        └── ConfirmationStep.tsx
```

---

## API 設計

### Hook: `useVisitRecord()`

#### 查詢 API

```typescript
// 獲取待訪視案件列表
const { data, loading, error } = await fetchPendingVisitCases()
// Returns: PendingVisitCase[]

// 獲取所有訪視記錄
const records = await fetchVisitRecords()
// Returns: VisitRecord[]

// 根據 ID 獲取訪視記錄
const record = await fetchVisitRecordById(id)
// Returns: VisitRecord

// 根據申請 ID 獲取訪視記錄
const record = await fetchVisitRecordByApplicationId(applicationId)
// Returns: VisitRecord | null
```

#### 上傳 API

```typescript
// 上傳單張照片
const url = await uploadPhoto(file, 'id-front')
// Returns: string (public URL)

// 上傳多張照片
const urls = await uploadMultiplePhotos(files, 'interactions')
// Returns: string[]
```

#### 寫入 API

```typescript
// 新增訪視記錄
const record = await createVisitRecord(applicationId, visitData)
// Returns: VisitRecord (含自動生成的 visit_code)

// 更新訪視記錄
const record = await updateVisitRecord(id, partialData)
// Returns: VisitRecord

// 刪除訪視記錄
await deleteVisitRecord(id)
// Returns: void
```

---

## UI/UX 設計

### 設計原則

1. **步驟式表單**：避免長頁面滾動，每個步驟專注於特定資料
2. **響應式設計**：桌面版與手機版提供最佳體驗
3. **視覺引導**：使用圖示、色彩、進度條引導使用者
4. **即時驗證**：表單欄位即時驗證，減少錯誤
5. **友善錯誤訊息**：清晰的錯誤提示和解決建議

### 色彩系統

- **主色**: warning (橘黃色) - 訪視紀錄主題色
- **成功**: success (綠色) - 完成狀態
- **危險**: danger (紅色) - 錯誤訊息
- **資訊**: primary (藍色) - 資訊提示

### 步驟進度條

```
[ 0 ] → [ 1 ] → [ 2 ] → [ 3 ] → [ 4 ] → [ 5 ] → [ 6 ]
列表    基本    家戶    狀態    證件    訪視    確認
        資訊    資料    標記    照片    記錄    送出
```

### 手機版優化

- **卡片式佈局**：觸控友善的大面積按鈕
- **單欄顯示**：避免橫向滾動
- **底部固定按鈕**：「上一步」、「下一步」固定在底部
- **照片上傳**：支援相機直接拍照

---

## 開發進度

### ✅ 已完成 (2025-10-11)

- [x] 資料庫 Schema 設計 (`create_visit_records.sql`)
- [x] TypeScript 類型定義 (`visit-record-types.ts`)
- [x] 訪視編號生成邏輯
- [x] Hook 實作 (`useVisitRecord.ts`)
- [x] 步驟 0: 待訪視列表頁面 (`/visit-records`)
- [x] Git commit: `c154cad`

### ⏳ 待開發

#### 高優先級 (Week 2)
- [ ] 建立 Supabase Storage bucket: `visit-media`
- [ ] 執行 SQL Schema (`create_visit_records.sql`)
- [ ] 步驟 1-6: 訪視表單頁面 (`/visit-records/new`)
- [ ] 表單狀態管理（步驟切換邏輯）
- [ ] 照片上傳組件（拍照/選擇檔案）
- [ ] 表單驗證邏輯

#### 中優先級 (Week 3)
- [ ] 已完成訪視記錄列表 (`/visit-records/completed`)
- [ ] 訪視記錄詳情頁面
- [ ] 訪視記錄編輯功能
- [ ] 照片預覽功能

#### 低優先級 (未來)
- [ ] 訪視記錄匯出功能（Excel/CSV）
- [ ] 訪視記錄統計報表
- [ ] 批次照片壓縮優化
- [ ] 訪視記錄搜尋功能

---

## 技術債務記錄

### 已知問題

1. **UUID 前8碼作為申請編號**
   - 現況：使用 `applicationId.substring(0, 8)` 作為顯示編號
   - 問題：可能存在碰撞風險
   - 改進：未來考慮建立獨立的申請編號欄位

2. **照片壓縮邏輯尚未實作**
   - 現況：直接上傳原始檔案
   - 問題：可能造成 Storage 空間浪費
   - 改進：加入客戶端壓縮邏輯

3. **表單狀態未持久化**
   - 現況：重新整理頁面會遺失填寫資料
   - 問題：使用者體驗不佳
   - 改進：使用 LocalStorage 或 SessionStorage 暫存

---

## 參考資料

- **Ragic 原始表單**: https://ap11.ragic.com/TCTCharity/kava-kasha-temporary-form/15
- **Supabase 文檔**: https://supabase.com/docs
- **HeroUI 文檔**: https://www.heroui.com
- **Next.js 15 文檔**: https://nextjs.org/docs

---

**文件維護者**: Claude AI (Anthropic)
**最後更新**: 2025-10-11
**專案版本**: V1.1.0
