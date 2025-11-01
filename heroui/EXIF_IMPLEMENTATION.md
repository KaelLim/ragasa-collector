# EXIF 圖片方向自動修正功能實作說明

## 概述

本專案已整合 EXIF 圖片方向自動修正功能，能夠自動偵測並修正上傳圖片的方向，確保身分證和銀行存摺等文件能以正確的方向顯示。

## 功能特點

1. **自動方向偵測**：讀取圖片的 EXIF Orientation 標籤
2. **自動方向修正**：根據 EXIF 方向值自動旋轉/翻轉圖片
3. **EXIF 資訊顯示**：顯示相機廠商、型號、拍攝時間等資訊
4. **保持圖片品質**：修正方向時保持原始圖片品質

## 技術實作

### 1. 安裝相依套件

```bash
npm install exif-js @types/exif-js
```

### 2. ImageEditor 組件改進

**檔案位置**: `components/ImageEditor.tsx`

主要功能：
- 載入圖片時自動讀取 EXIF 資訊
- 根據 Orientation 值應用對應的變換矩陣
- 支援 8 種標準 EXIF 方向值

#### EXIF Orientation 值對應：

| 值 | 描述 | 變換操作 |
|----|------|----------|
| 1 | 正常 | 無需變換 |
| 2 | 水平翻轉 | 水平鏡像 |
| 3 | 旋轉 180° | 旋轉 180 度 |
| 4 | 垂直翻轉 | 垂直鏡像 |
| 5 | 垂直翻轉 + 順時針 90° | 複合變換 |
| 6 | 順時針 90° | 旋轉 90 度 |
| 7 | 水平翻轉 + 順時針 90° | 複合變換 |
| 8 | 逆時針 90° | 旋轉 270 度 |

### 3. CameraCapture 組件增強

**檔案位置**: `components/CameraCapture.tsx`

新增功能：
- 上傳圖片時讀取並顯示 EXIF 資訊
- 顯示相機資訊（廠商、型號）
- 顯示拍攝時間
- 顯示方向值

### 4. 實作細節

```typescript
// 讀取 EXIF 資訊
EXIF.getData(file, function() {
  const orientation = EXIF.getTag(this, 'Orientation')
  const make = EXIF.getTag(this, 'Make')
  const model = EXIF.getTag(this, 'Model')
  const dateTime = EXIF.getTag(this, 'DateTime')

  // 處理方向
  handleExifOrientation(img, orientation || 1)
})

// 應用方向變換
const handleExifOrientation = (img: HTMLImageElement, orientation: number) => {
  const ctx = canvas.getContext('2d')

  // 根據方向調整畫布大小
  if (orientation > 4 && orientation <= 8) {
    canvas.width = height
    canvas.height = width
  }

  // 應用對應的變換矩陣
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break
    case 3: ctx.transform(-1, 0, 0, -1, width, height); break
    case 4: ctx.transform(1, 0, 0, -1, 0, height); break
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
    case 6: ctx.transform(0, 1, -1, 0, height, 0); break
    case 7: ctx.transform(0, -1, -1, 0, height, width); break
    case 8: ctx.transform(0, -1, 1, 0, 0, width); break
  }

  // 繪製修正後的圖片
  ctx.drawImage(img, 0, 0)
}
```

## 使用流程

1. **使用者上傳圖片**
   - 點擊「上傳圖片」按鈕
   - 選擇包含 EXIF 資訊的圖片

2. **自動處理**
   - 系統自動讀取 EXIF Orientation
   - 自動修正圖片方向
   - 顯示 EXIF 資訊（如有）

3. **編輯器功能**
   - 使用者可進一步調整旋轉角度
   - 調整亮度、對比度
   - 縮放圖片

4. **保存結果**
   - 修正後的圖片保存為正確方向
   - 保持高品質（JPEG 品質 0.95）

## 測試建議

### 測試圖片準備

1. 使用手機拍攝不同方向的測試圖片：
   - 正常橫向
   - 正常直向
   - 倒置橫向
   - 倒置直向

2. 確認手機相機設定：
   - 開啟「保存 EXIF 資訊」
   - 開啟「方向標記」

### 測試步驟

1. 上傳各種方向的測試圖片
2. 確認圖片自動轉正
3. 檢查 EXIF 資訊顯示
4. 測試編輯器的額外旋轉功能

## 相容性

- **支援的圖片格式**：JPEG, JPG（包含 EXIF 資訊）
- **部分支援**：PNG（通常無 EXIF 資訊）
- **瀏覽器支援**：所有現代瀏覽器

## 注意事項

1. **EXIF 資訊可能缺失**
   - 某些圖片編輯軟體會移除 EXIF 資訊
   - 螢幕截圖通常沒有 EXIF 資訊
   - 系統會優雅處理無 EXIF 的情況

2. **隱私考量**
   - EXIF 可能包含 GPS 位置資訊
   - 處理後的圖片會移除敏感 EXIF 資訊
   - 僅保留必要的顯示資訊

3. **效能優化**
   - 大圖片會自動縮放至適當尺寸
   - 使用 Canvas API 進行高效處理
   - 避免記憶體洩漏（正確清理 Object URLs）

## 故障排除

### 問題：圖片方向未自動修正

**可能原因**：
- 圖片沒有 EXIF 資訊
- EXIF Orientation 值為 1（正常）
- 瀏覽器不支援 FileReader API

**解決方案**：
- 使用編輯器手動旋轉
- 確認原始圖片包含 EXIF
- 更新瀏覽器版本

### 問題：EXIF 資訊無法顯示

**可能原因**：
- 圖片格式不支援 EXIF
- EXIF 資訊已被清除

**解決方案**：
- 使用原始相機拍攝的 JPEG 檔案
- 避免使用編輯過的圖片

## 未來改進方向

1. **增強 EXIF 支援**
   - 支援更多 EXIF 標籤
   - 顯示 GPS 資訊（需使用者同意）
   - 支援 RAW 格式

2. **效能優化**
   - Web Worker 處理大圖片
   - 漸進式圖片載入
   - 快取處理結果

3. **使用者體驗**
   - 顯示處理進度
   - 批次處理多張圖片
   - 自動偵測證件類型

## 相關檔案

- `/components/ImageEditor.tsx` - 圖片編輯器組件
- `/components/CameraCapture.tsx` - 相機拍照組件
- `/package.json` - 相依套件定義

## 參考資源

- [EXIF.js 官方文檔](https://github.com/exif-js/exif-js)
- [MDN - Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [EXIF Orientation 規範](https://exif.org/Exif2-2.PDF)

---

最後更新：2025-09-29