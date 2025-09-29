# OCR 服務設定與使用指南

## 概述

本專案已整合 Xinference OCR 服務，支援台灣身分證和銀行存摺的文字識別功能。

## 環境設定

### 1. 設定檔配置

所有 OCR 相關配置都在 `.env.ocr` 檔案中：

```bash
# Xinference API 端點
XINFERENCE_API_URL=http://localhost:9997/v1

# 使用的模型 ID (需支援視覺功能)
XINFERENCE_MODEL_ID=qwen2.5-vl-instruct

# OCR 服務模式：xinference | mock
OCR_SERVICE_MODE=xinference
```

### 2. Xinference 服務確認

確認 Xinference 服務正在運行：

```bash
# 檢查服務狀態
curl http://localhost:9997/v1/models

# 應該看到類似以下回應：
{
  "object": "list",
  "data": [{
    "id": "qwen2.5-vl-instruct",
    "model_name": "qwen2.5-vl-instruct",
    "model_ability": ["chat", "vision"]
  }]
}
```

## 系統架構

```
使用者上傳圖片
    ↓
CameraCapture 元件 (支援拍照/上傳)
    ↓
ImageEditor 元件 (圖片編輯)
    ↓
/api/ocr API 端點
    ↓
XinferenceOCRClient
    ↓
Xinference 模型 (qwen2.5-vl-instruct)
    ↓
OCR 結果返回
```

## API 使用方式

### 身分證正面 OCR

```javascript
// POST /api/ocr
const formData = new FormData()
formData.append('image', imageFile)
formData.append('type', 'front')

const response = await fetch('/api/ocr', {
  method: 'POST',
  body: formData
})

// 回應格式
{
  "success": true,
  "data": {
    "name": "姓名",
    "idNumber": "身分證字號",
    "birthDate": "出生日期",
    "gender": "性別"
  }
}
```

### 身分證背面 OCR

```javascript
// POST /api/ocr
formData.append('type', 'back')

// 回應格式
{
  "success": true,
  "data": {
    "address": "戶籍地址",
    "issueDate": "發證日期",
    "issuePlace": "發證地點"
  }
}
```

### 銀行存摺 OCR

```javascript
// POST /api/ocr
formData.append('type', 'bank')

// 回應格式
{
  "success": true,
  "data": {
    "bankName": "銀行名稱",
    "bankCode": "銀行代碼",
    "branchName": "分行名稱",
    "accountNumber": "帳號",
    "accountName": "戶名"
  }
}
```

## 開發模式

### Mock 模式

當 Xinference 服務不可用時，可切換至 Mock 模式：

```bash
# 修改 .env.ocr
OCR_SERVICE_MODE=mock
```

Mock 模式會返回預設的測試資料，方便開發測試。

## 檔案結構

```
heroui/
├── .env.ocr                     # OCR 配置檔
├── lib/
│   └── xinference-client.ts     # OCR 客戶端實作
├── app/
│   └── api/
│       └── ocr/
│           └── route.ts         # OCR API 端點
├── components/
│   ├── CameraCapture.tsx        # 相機/上傳元件
│   └── ImageEditor.tsx          # 圖片編輯元件
└── OCR_SETUP.md                 # 本文件
```

## 測試 OCR 服務

### 健康檢查

```bash
# 檢查 OCR API 狀態
curl http://localhost:5173/api/ocr

# 應返回
{
  "status": "ok",
  "service": "OCR API",
  "mode": "xinference",
  "xinferenceAvailable": true,
  "apiUrl": "http://localhost:9997/v1",
  "modelId": "qwen2.5-vl-instruct"
}
```

## 故障排除

### 問題 1：Xinference 服務無法連接

**症狀**：OCR 功能無法使用，返回錯誤

**解決方案**：
1. 確認 Xinference 服務正在運行
2. 檢查端口 9997 是否可訪問
3. 確認模型已正確載入

### 問題 2：OCR 識別準確度不高

**可能原因**：
- 圖片品質不佳
- 圖片方向不正確
- 光線不足或反光

**解決方案**：
- 使用 ImageEditor 調整圖片
- 確保圖片清晰且正向
- 調整拍攝環境

### 問題 3：回應超時

**解決方案**：
- 增加 `XINFERENCE_REQUEST_TIMEOUT` 值
- 檢查網路連接
- 確認模型性能是否足夠

## 效能優化建議

1. **圖片預處理**：
   - 限制上傳圖片大小（建議 < 2MB）
   - 使用 ImageEditor 壓縮圖片

2. **快取策略**：
   - 快取模型列表
   - 重用 HTTP 連接

3. **並發控制**：
   - 限制同時 OCR 請求數量
   - 實作請求佇列機制

## 安全建議

1. **驗證圖片格式**：只接受 JPEG/PNG
2. **限制檔案大小**：防止大檔案攻擊
3. **Rate Limiting**：限制 API 請求頻率
4. **敏感資料處理**：OCR 結果不應長期儲存

## 相關資源

- [Xinference 官方文檔](https://inference.readthedocs.io/)
- [Qwen-VL 模型說明](https://github.com/QwenLM/Qwen-VL)
- 專案技術記憶：`xinference-integration-guide-2025-01-29`

## 聯絡與支援

如有問題，請參考：
- 專案 README.md
- ARCHITECTURE.md
- 技術記憶檔案

---

最後更新：2025-01-29