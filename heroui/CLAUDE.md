# Claude Code Instructions

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

## 🔄 當前開發狀態

**OpenMemory 當前狀態記憶**: `87ab21e3-f35b-4833-af43-d27f36824d54`

### ⚠️ 待修復問題
- **JSX 語法錯誤**: `app/application/new/page.tsx` 第 643 行
- **原因**: 行首 `{` 表達式缺少縮排
- **影響**: 申請表單頁面無法載入

### ✅ 已創建待整合
- `components/ContactPhoneInput.tsx` - 雙手機號輸入組件

### 📋 下次會話優先工作
1. 系統性修復 JSX 語法錯誤
2. 整合 ContactPhoneInput 組件
3. 完整測試雙手機號流程
4. 考慮重構 page.tsx（2238 行過大）

---

*最後更新: 2025-10-10 下午*
*此檔案由 Claude Code 自動載入系統產生*
