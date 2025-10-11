# Claude Code Instructions

## 📌 系統資訊

**系統名稱**: 慈濟發放訪視系統
**目前版本**: V1.2.0
**版本格式**: V[大升級].[功能更新].[Debug]

---

## 📋 系統更新歷程

### V1.2.0 (2025-10-11)
**重大功能更新：訪視紀錄模組完整實作**

#### 核心功能
- ✅ **步驟 0-4 完整實作**（共 6 個步驟，完成 5 個）
- ✅ **Whisper STT 語音轉文字**（繁體中文輸出）
- ✅ **多段錄音功能**（暫停、繼續、計時器）
- ✅ **麥克風選擇**（多裝置支援）
- ✅ **多張照片上傳**（互動照片 + 其他佐證）

#### 步驟明細

**步驟 0: 待訪視列表**
- 從個資主檔過濾未建立訪視記錄的案件
- 三欄資訊：姓名、編號、地址
- 響應式設計（桌面表格/手機卡片）

**步驟 1: 基本資訊確認**
- 自動生成訪視編號（{UUID7}-{村代碼}{流水號}）
- 從地址自動判讀村名
- 多位受訪視者管理（+ 新增功能）
- 受訪視者關係選擇

**步驟 2: 家戶資料與需求**
- 家戶特殊註記（6 個選項，多選）
- 後續需求項目（10 個選項，多選）
- 福利身分（3 個選項，單選）

**步驟 3: 狀態標記**
- 是否完成領取（預設勾選）
- 是否回捐
- 是否轉提報

**步驟 4: 訪視記錄**
- Whisper 語音轉文字（繁體中文）
- 錄音計時器（mm:ss 格式）
- 暫停/繼續錄音
- 多段錄音管理
- 麥克風選擇（多裝置）
- 互動照片上傳（多張）
- 其他佐證照片（選填、多張）

#### 技術架構

**Whisper STT 整合**:
- 模型: whisper-large-v3-turbo-mlx
- 語言參數: language=zh + initial_prompt
- 處理效能: 40x 實時速度
- 私有雲端點: https://tcm2studio.tzuchi-org.tw/v1
- OpenAI Client SDK 相容模式

**UUID7 全系統遷移**:
- 前端生成 UUID7（包含時間戳記）
- disaster_applications 明確指定 UUID
- visit_records 明確指定 UUID
- 訪視編號格式修正：{UUID7}-{村代碼}{流水號}

**Storage 安全性**:
- Private Bucket 架構設計
- Signed URLs 工具函數
- Storage RLS 政策（media + visitrecords）
- 避免敏感資料外洩

**架構重構**:
- 步驟組件化（避免巨型組件）
- page.tsx 精簡 47%（524行 → 275行）
- 獨立步驟組件檔案（steps/*.tsx）

**Dark Mode 規範**:
- 嚴禁使用 bg-white 固定色
- 使用 bg-default-X 自適應
- 文字高反差配色（dark: 變體）

#### 新增檔案

**步驟組件**:
- app/visit-records/new/steps/BasicInfoStep.tsx
- app/visit-records/new/steps/HouseholdNeedsStep.tsx
- app/visit-records/new/steps/StatusMarksStep.tsx
- app/visit-records/new/steps/VisitNotesStep.tsx

**API 端點**:
- app/api/whisper/route.ts（Whisper STT）

**資料庫 Schema**:
- sql/create_visit_records_v2.sql
- sql/recreate_applications_uuid7.sql
- sql/create_storage_policies.sql
- sql/create_media_storage_policies.sql

**類型與工具**:
- lib/visit-record-types.ts
- lib/storage-utils.ts
- hooks/useVisitRecord.ts

**配置檔案**:
- .env.stt（Whisper 配置）
- .env.stt.example

**技術文檔**:
- VISIT_RECORDS_DESIGN.md
- VISIT_RECORDS_DEPLOYMENT.md
- UUID7_DEPLOYMENT_GUIDE.md
- STORAGE_SECURITY_MIGRATION.md

#### 技術變更
- 📦 版本號：V1.1.0 → V1.2.0
- 🎤 整合 Whisper STT（繁體中文）
- 🔐 Storage 安全性升級
- 🏗️ 組件架構重構
- 🎨 Dark Mode 嚴格規範

#### Bug 修復（超過 20 個）
- 變數名稱拼寫錯誤
- 按鈕嵌套錯誤
- 日期顯示錯誤
- Storage URL 路徑問題
- 戶口名簿 OCR 整合
- 錄音資料收集
- Dark mode 配色
- 等等...

#### 相關 Commits（本次會話）
`68c62a7` - feat: 新增訪視紀錄模組 V1.1.0（Dashboard 卡片）
...共 30+ commits...
`08183b4` - fix: 重構 Whisper API 代碼結構

---

### V1.1.0 (2025-10-11)
**功能更新：新增訪視紀錄模組**

#### 新增功能
- ✨ **訪視紀錄入口**：Dashboard 新增第四張卡片「訪視紀錄」
- 🎨 **視覺設計**：使用 warning 色系（橘黃色），剪貼板檢查圖示
- 🌐 **雙語支援**：繁中「訪視紀錄」/ 英文「Visit Records」

#### 頁面結構
1. **Dashboard 調整** (`app/dashboard/page.tsx`)
   - Grid 佈局：3欄 → 4欄 (md:2欄, lg:4欄)
   - 容器寬度：max-w-5xl → max-w-7xl
   - 新增訪視紀錄 Card，連結至 `/visit-records`

2. **訪視紀錄頁面** (`app/visit-records/page.tsx`)
   - 基礎頁面架構：Header + 功能說明
   - 開發中狀態顯示
   - 預留功能規劃說明區域

#### 功能規劃
- 📋 訪視記錄建立與編輯
- 📸 訪視照片上傳
- ✅ 訪視結果記錄
- 🔗 與申請案件關聯
- 🔍 訪視歷史查詢

#### 技術變更
- 📦 版本號：V1.0.1 → V1.1.0
- 🎨 UI：Dashboard 四卡片佈局
- 🆕 路由：新增 `/visit-records` 頁面

#### 相關 Commit
- `待提交` - feat: 新增訪視紀錄模組 V1.1.0

---

### V1.0.1 (2025-10-11)
**Debug 修復：申請列表資料顯示**

#### 問題修復
- 🐛 **申請列表卡片空白問題**：列表頁面無法顯示 ID、電話、地址資料
- 🔍 **根本原因**：資料庫架構從平面結構轉換為 JSONB 格式，列表頁未同步更新

#### 修復內容
1. **卡片視圖** (`app/applications/page.tsx`)
   - 更新姓名欄位：`application.victim_name` → `application_data.victim.name`
   - 更新身分證欄位：`application.id_number` → `application_data.victim.idNumber`
   - 更新電話欄位：`application.phone_number` → `application_data.victim.phone`
   - 更新地址欄位：`application.address` → `application_data.victim.address`

2. **表格視圖** (同檔案)
   - 同步更新所有欄位的存取路徑

#### 技術變更
- 🐛 列表頁面 JSONB 欄位路徑修正
- ✅ 列表與詳情頁資料顯示一致性恢復

#### 相關 Commit
- `d67e587` - fix: 修復申請列表頁面欄位顯示問題
- `6556349` - docs: 更新開發記錄

---

### V1.0.0 (2025-10-11)
**重大更新：系統定位轉型**

#### 系統名稱變更
- ❌ 舊名稱：慈濟救災系統
- ✅ 新名稱：慈濟發放訪視系統
- 📝 說明：從災害救助轉型為發放訪視業務

#### 更新內容
1. **系統配置**
   - 更新 `config/site.ts` 系統名稱和描述
   - 網頁標題：「慈濟發放訪視系統 V1.0.0」
   - 頁面描述：「慈濟發放訪視個人資料收集系統」

2. **UI 組件**
   - 更新 `components/logo.tsx` 顯示名稱
   - 繁中：慈濟發放訪視系統 V1.0.0
   - 英文：TC Distribution Survey System V1.0.0

3. **申請頁面**
   - 更新 `app/application/new/page.tsx` 所有標題
   - 標題文字：「發放訪視個資收集申請」

4. **版本管理**
   - 設定 `package.json` 版本為 1.0.0
   - 建立版本號規範：V[大升級].[功能更新].[Debug]

#### 技術變更
- 📦 版本號：0.0.1 → 1.0.0
- 🎨 UI：全面更新系統名稱顯示
- 📝 文檔：建立系統更新歷程機制

#### 相關 Commit
- `待提交` - feat: 系統名稱變更為慈濟發放訪視系統 V1.0.0

---

## CLAUDE 開發原則執行系統已啟動

此專案已自動配置 CLAUDE 開發原則執行系統。

### 🚀 快速開始

```bash
# 啟動執行規範系統
.claude/scripts/start-enforcement.sh

# 隨時進行快速原則檢查
.claude/scripts/quick-check.sh

# 停止系統
.claude/scripts/stop-enforcement.sh
```

### 📋 執行規範文檔

- [檢查清單系統](.claude/EXECUTION-CHECKLIST.md)
- [違反偵測機制](.claude/AUTO-VIOLATION-DETECTOR.md)
- [暫停重評系統](.claude/PAUSE-REFLECT-SYSTEM.md)
- [簡化決策框架](.claude/SIMPLICITY-FIRST-FRAMEWORK.md)

### ⚠️ 重要提醒

系統會自動：
- 每 30 分鐘提醒檢查工作目標
- 每 2 小時強制深度重評
- 偵測原則違反行為並警報
- 監控專案複雜度增長

請確保遵循 CLAUDE 開發原則，避免：
- 基於假設進行實作
- 跳過實際功能測試
- 選擇過度複雜的方案
- 偏離實際業務需求

---

## 📚 專案開發記錄索引

### 戶口名簿 OCR 多頁整合系統

**OpenMemory 記憶 ID**: `c374c296-4096-4fdf-a747-09bcca67a3cf`

#### 核心功能
- ✅ 多頁戶口名簿掃描（1-N 頁）
- ✅ 動態成員數量支援
- ✅ JSONB 資料庫架構
- ✅ Supabase Storage 原檔儲存
- ✅ OCR 相似字辨識優化（瑩/螢、燕/艷）

#### 關鍵檔案索引

**核心組件**:
- `components/HouseholdOCRIntegration.tsx` - 多頁 OCR 整合
- `components/ApplicationDetailView.tsx` - 申請詳情顯示
- `app/application/new/page.tsx` - 申請表單主頁面

**工具與配置**:
- `lib/storage-helpers.ts` - Storage 檔案管理
- `lib/layout-analyzer.ts` - 佈局分析子系統
- `config/household-layout.json` - 標準切割配置 v3.0
- `hooks/useApplicationDetail.ts` - 申請查詢 Hook

**資料庫**:
- `sql/recreate_jsonb.sql` - JSONB 資料表創建
- `sql/create_storage_buckets.sql` - Storage buckets 設定

#### 技術重點

**UUID 雙層機制**:
- 申請 ID: PostgreSQL UUID4（資料庫生成）
- 檔案命名: JavaScript UUID7（前端生成）

**OCR 流程**:
1. 快速 OCR（11秒）：基本資料 + 戶長
2. 背景 OCR（30-60秒）：所有成員
3. 使用原檔（Supabase Storage）確保準確度

**檔案命名規範**:
```
temp/UUID7_household-page1.jpg
temp/UUID7_id-head-front.jpg
temp/UUID7_id-proxy-front.jpg (可選)
temp/UUID7_bank-book.jpg
temp/UUID7_signature.png (可選)
```

#### 驗證成功
- **OCR 準確度**: 100% 正確辨識（含相似字「瑩」）
- **提交成功**: ID d5fc6592-6321-497b-9770-b441578c931e
- **完整資料**: 戶長 + 3位成員完整儲存

---

## 🔄 當前開發狀態（2025-10-11 更新）

**OpenMemory 狀態記憶**: `87ab21e3-f35b-4833-af43-d27f36824d54`

### ✅ 本次會話已完成

#### 1. JSX 語法錯誤修復 ✅
- **問題**: page.tsx 第 642 行 "Unexpected token div"
- **根因**: application-form 的 return 缺少 Fragment 包裹
- **修復**:
  - 加上 `<>...</>` Fragment
  - 刪除 126 行永遠不執行的舊代碼（行 1700-1825）
  - 移除重複的變數定義
- **結果**: ✅ HTTP 200 OK，頁面正常載入
- **Commit**: `27d8e0f`, `56bbb32`

#### 2. UI 改進 ✅
- **切割預覽隱藏**: 使用者反饋界面過於複雜
  - Commit: `45fd0b9`
- **戶口名簿多頁界面優化**: 獨立的「新增頁面」Card
  - Commit: `9981de3`, `f06eff9`

#### 3. 身分證 OCR 驗證機制 🚧
- **已實現**:
  - OCR 結果自動比對戶口名簿戶長資料
  - 不一致時設置 showOCRConfirmModal = true
  - 調試日誌完整輸出
- **問題**: ⚠️ Modal 無法彈出（邏輯已觸發但 UI 未顯示）
- **日誌確認**: Console 顯示「⚠️ 資料不一致，彈出確認對話框」
- **Commit**: `6738d96`, `3c0a7d6`

#### 4. Serena MCP 配置修復 ✅
- **問題**: 程編一直使用 `/Users/chih-hungtseng/projects/MCP-Server-DEV` 作為根目錄
- **修復**:
  - 建立 `.serena/project.yml`（專案配置）
  - 建立專案專用 `serena-wrapper.sh`
  - 重新註冊到 Claude Code
- **狀態**: ⚠️ 需要重啟 Claude Code 生效
- **Commit**: `cfd987a`

#### 5. 申請列表頁面欄位顯示修復 ✅
- **問題**: 列表卡片顯示空資料（ID、電話、地址欄位空白），但詳情頁正常
- **根因**: 資料庫從平面結構轉為 JSONB 格式，列表頁未同步更新欄位路徑
- **修復**:
  - 卡片視圖：更新所有受影響欄位（行 292, 306, 314, 324）
  - 表格視圖：同步更新欄位路徑（行 382, 391, 396）
  - `application.victim_name` → `application_data.victim.name`
  - `application.id_number` → `application_data.victim.idNumber`
  - `application.phone_number` → `application_data.victim.phone`
  - `application.address` → `application_data.victim.address`
- **結果**: ✅ 列表與詳情頁資料顯示一致
- **Commit**: `d67e587`

### 🚨 待修復問題（優先級排序）

#### P0 - 緊急
1. **Modal 無法彈出問題** 🔴
   - **檔案**: `app/application/new/page.tsx`
   - **現象**:
     - Console 顯示「⚠️ 資料不一致，彈出確認對話框」
     - `showOCRConfirmModal` state 設為 true
     - 但 Modal UI 沒有顯示
   - **位置**:
     - setState: 行 776
     - Modal 定義: 原本在行 2210-2334（已被錯誤修復破壞）
   - **可能原因**:
     - Modal 渲染邏輯位置錯誤
     - 需要在 application-form 的 return 內部渲染
   - **調試資訊**: 已加入完整的 console.log

#### P1 - 高優先
2. **Serena 程編配置** 🟡
   - **狀態**: 配置已完成，需重啟 Claude Code
   - **文件**: `.serena/project.yml`, `serena-wrapper.sh`

### 📊 系統狀態

#### Git 資訊
- **Branch**: `feature/week1-component-split`
- **Latest Commit**: `cfd987a` - Serena 配置
- **檔案狀態**:
  - page.tsx: 2334 行
  - 所有 OCR 功能正常運作
  - HTTP 200 OK

#### 開發伺服器
- **URL**: http://localhost:3000
- **狀態**: 運行中（Shell ID: c5e30e）
- **編譯**: 成功

#### 測試狀態
- ✅ 戶口名簿 OCR（表頭 + 成員）
- ✅ 身分證 OCR（正反面）
- ✅ 代理人身分證 OCR
- ✅ 銀行存摺 OCR
- ✅ 資料提交（除 signatureUrl 已修復）

### 📋 重啟後立即工作

#### 第一優先
1. **修復 Modal 彈出問題**（使用標準修復流程）
   - 程編：定位 Modal 渲染位置
   - 分析師：分析 React 渲染邏輯
   - 工具人：驗證修復方案
   - 總協：執行修復

#### 後續工作
2. 測試 Modal 完整流程（是/否 兩個選項）
3. 驗證身分證 OCR 校正功能
4. 完整端到端測試

### 🔧 技術債務記錄
- Week 1 重構計劃（已暫停，優先修復功能）
- TypeScript 嚴格模式（已放寬，Week 2 恢復）
- page.tsx 仍是 2334 行巨型組件

---

## 📝 重要 Commits 記錄（本次會話）

```
d67e587 - fix: 修復申請列表頁面欄位顯示問題
cfd987a - feat: 新增 Serena MCP 專案配置
3c0a7d6 - debug: 新增身分證 OCR 驗證調試日誌
6738d96 - feat: 新增身分證 OCR 資料驗證機制
f06eff9 - fix: 修正新增頁面 Card 顯示條件
9981de3 - feat: 改進戶口名簿多頁掃描界面
45fd0b9 - fix: 隱藏切割預覽功能
56bbb32 - fix: 修復 signatureUrl 變數名稱錯誤
27d8e0f - fix: 修復 page.tsx JSX 語法錯誤（行 642 & 1701）
```

---

*最後更新: 2025-10-11 上午*
*會話 Token 使用: ~560K/1M*
*下次重啟: 請先修復 Modal 彈出問題*
