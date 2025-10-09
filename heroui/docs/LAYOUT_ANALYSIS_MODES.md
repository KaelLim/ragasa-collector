# 佈局分析模式切換指南

## 🎯 快速切換

### 方法一：修改配置文件（推薦）

編輯 `config/ocr-config.json`：

```json
{
  "layoutAnalysis": {
    "enabled": false,      // ← 改為 true 啟用佈局分析
    "mode": "standard"     // ← 改為 "dynamic" 或 "preview"
  }
}
```

**無需重新編譯**，重新整理頁面即可生效。

### 方法二：環境變數（開發用）

```bash
# 啟用 Dynamic 模式
export LAYOUT_ANALYSIS_ENABLED=true
export LAYOUT_ANALYSIS_MODE=dynamic
npm run dev

# 啟用 Preview 模式
export LAYOUT_ANALYSIS_MODE=preview
npm run dev

# 回到 Standard 模式（預設）
export LAYOUT_ANALYSIS_ENABLED=false
npm run dev
```

---

## 📊 模式選擇決策樹

```
開始
  ↓
是否為標準格式戶口名簿？
  ├─ 是 → 使用 Standard 模式 ✅
  │       （最快、零成本）
  │
  └─ 否 → 是否需要精確控制切割位置？
          ├─ 是 → 使用 Preview 模式 🔍
          │       （可調整、視覺化）
          │
          └─ 否 → 使用 Dynamic 模式 🔄
                  （自動適應、準確度高）
```

---

## 🔄 實際應用場景

### 場景 1：大量處理標準戶口名簿（推薦）

**使用模式**: Standard

**配置**:
```json
{
  "layoutAnalysis": {
    "enabled": false,
    "mode": "standard"
  }
}
```

**優勢**:
- 每份文件節省 20 秒
- 零 API 費用
- 穩定可靠

**效能**: 1000 份文件可節省約 5.5 小時

---

### 場景 2：處理舊版或特殊格式戶口名簿

**使用模式**: Dynamic

**配置**:
```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "dynamic"
  }
}
```

**優勢**:
- 自動適應不同格式
- 無需人工介入
- 準確度最高

**成本**: 約 $0.01/份 × 1000 份 = $10

---

### 場景 3：首次處理新格式或調試

**使用模式**: Preview

**配置**:
```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "preview"
  }
}
```

**優勢**:
- 視覺化驗證切割位置
- 可手動調整邊界
- 確保切割準確

**適用**:
- 新格式首次測試（處理 10-20 份後可切換回 Dynamic 或 Standard）
- 切割問題偵錯
- 優化標準配置

---

## 🧪 測試與驗證

### 驗證 Standard 模式是否生效

```bash
# 上傳戶口名簿後，檢查 Console 輸出
# 應該看到：
📐 使用標準佈局配置
📐 佈局來源: standard
📋 識別區域數: 6

# 而不是：
📐 開始動態佈局分析...  # ← Dynamic 模式
```

### 驗證 Dynamic 模式是否生效

```bash
# 應該看到：
📐 開始動態佈局分析...
🚀 Trying Python SDK (MLX native, 37+ tokens/s)...
✅ Python SDK success!
⏱️  佈局分析處理時間: 20.5 秒
📐 佈局來源: dynamic
```

### 驗證 Preview 模式是否生效

```bash
# 應該看到：
📐 開始動態佈局分析...
✅ Python SDK success!
# 然後顯示佈局預覽 UI，可拖動紅線調整
```

---

## ⚙️ 進階配置

### 調整 OCR 切割品質

編輯 `config/ocr-config.json`：

```json
{
  "segmentation": {
    "quality": 0.9,   // ← 0.1-1.0，越高品質越好但檔案越大
    "description": "切割圖片的 JPEG 品質"
  }
}
```

**建議值**:
- `0.9`: 預設，品質與大小平衡
- `0.95`: 高品質（適合精細文字）
- `0.85`: 低品質（適合大量處理，節省儲存空間）

### 調整 OCR 重試設定

```json
{
  "ocr": {
    "maxRetries": 3,      // ← 失敗重試次數
    "timeout": 120000     // ← 超時時間（毫秒）
  }
}
```

---

## 🐛 常見問題

### Q1: 修改配置後沒有生效？

**解決方案**:
1. 確認 JSON 格式正確（使用 JSON 驗證器）
2. 清除瀏覽器快取並重新整理頁面
3. 重新啟動開發伺服器 `npm run dev`

### Q2: Preview 模式沒有顯示紅線？

**可能原因**:
1. 佈局分析失敗，已回退到 Standard 模式
2. 檢查 Console 是否有錯誤訊息
3. 確認 `enabled: true` 且 `mode: "preview"`

### Q3: Dynamic 模式太慢？

**解決方案**:
1. 若格式一致，收集 10-20 份樣本測試後切換回 Standard
2. 使用測試樣本優化 `household-layout.json` 標準配置
3. 考慮使用 Dynamic 模式建立多個標準配置（如：新版、舊版）

---

## 📈 效能監控

### 監控佈局分析耗時

在瀏覽器 Console 查看：

```
⏱️  佈局分析處理時間: 20.5 秒
⏱️  表頭 OCR 處理時間: 4.1 秒
⏱️  戶長 OCR 處理時間: 5.2 秒
```

### 計算總成本

假設 Vision LLM API 費用為 $0.01/次：

- Standard 模式：$0
- Dynamic 模式：$0.01 × 上傳次數
- Preview 模式：$0.01 × 上傳次數（與 Dynamic 相同）

**範例**:
- 1000 份文件 × Standard 模式 = $0
- 1000 份文件 × Dynamic 模式 = $10

---

## 🎓 最佳實踐建議

### 1. 生產環境部署

```json
{
  "layoutAnalysis": {
    "enabled": false,
    "mode": "standard"
  }
}
```

**理由**: 最快速、最穩定、零額外成本

### 2. 開發與測試環境

```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "preview"
  }
}
```

**理由**: 可驗證切割準確度、偵錯問題

### 3. 處理混合格式文件

```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "dynamic"
  }
}
```

**理由**: 自動適應不同格式，無需人工介入

---

**最後更新**: 2025-10-09
**維護者**: Claude AI
**版本**: 1.0
