# OCR 業務流程重構說明

## 🔄 重構概要

**重構日期**: 2025-10-09
**重構原因**: 業務邏輯錯誤，應先完成全部切割並保存為 Base64，需要時再調用

---

## 📋 舊流程 vs 新流程

### ❌ 舊流程（已廢棄）

```
上傳圖片
  ↓
切割圖片 → 創建 Blob
  ↓
立即 OCR 表頭 (使用 Blob)
  ↓
用戶確認表頭
  ↓
立即 OCR 戶長 (使用 Blob)
  ↓
釋放 Blob (revoke Object URL)
```

**問題**:
- ❌ 切割與 OCR 耦合，無法重複使用切片
- ❌ Blob 需要手動釋放記憶體
- ❌ 無法預先保存所有切片
- ❌ 重新 OCR 需要重新切割

---

### ✅ 新流程（當前）

```
上傳圖片
  ↓
完整切割圖片 → 保存所有 6 個區域為 Base64
  ↓
暫存於記憶體 (imageSegments state)
  ↓
需要時從 Base64 轉回 Blob → OCR 表頭
  ↓
用戶確認表頭
  ↓
需要時從 Base64 轉回 Blob → OCR 戶長
  ↓
需要時從 Base64 轉回 Blob → OCR 成員
  ↓
自動垃圾回收（無需手動釋放）
```

**優勢**:
- ✅ 切割一次，重複使用
- ✅ Base64 無需手動釋放記憶體
- ✅ 可隨時重新 OCR 任何區域
- ✅ 切片可持久化（localStorage/sessionStorage）
- ✅ 業務邏輯清晰分離

---

## 🏗️ 架構變更

### 1. 資料結構更新

#### ImageSegment 介面

```typescript
// 舊介面
export interface ImageSegment {
  index: number
  type: 'header' | 'householdHead' | 'member'
  blob: Blob            // ❌ Blob 物件
  dataUrl: string       // Object URL
  width: number
  height: number
}

// 新介面
export interface ImageSegment {
  index: number
  type: 'header' | 'householdHead' | 'member'
  base64: string        // ✅ Base64 編碼（暫存用）
  dataUrl: string       // Base64 Data URL（與 base64 相同）
  label: string         // 區域標籤
  width: number
  height: number
  yStart: number        // 垂直起始位置
  yEnd: number          // 垂直結束位置
}
```

### 2. 新增工具函數

#### `utils/imageSegmentation.ts`

```typescript
// Base64 轉 Blob（用於 OCR API 請求）
export function base64ToBlob(base64: string): Blob

// 便捷函數：根據索引取得切片 Blob
export function getSegmentBlob(segments: ImageSegment[], index: number): Blob | null
```

### 3. 業務邏輯函數重構

#### `components/HouseholdOCRIntegration.tsx`

**變更前**:
```typescript
const handleStartOCRWithFile = async (file: File) => {
  // 佈局分析
  // 切割圖片
  // 立即 OCR
}
```

**變更後**:
```typescript
// 步驟 1: 上傳並完整切割
const handleStartOCRWithFile = async (file: File) => {
  const segments = await segmentHouseholdImage(file) // 返回 Base64
  setImageSegments(segments) // 暫存
  await startHeaderOCR(segments) // 按需調用
}

// 步驟 2: 表頭 OCR（從暫存調用）
const startHeaderOCR = async (segments: ImageSegment[]) => {
  const headerBlob = getSegmentBlob(segments, 0) // Base64 → Blob
  // 發送 OCR 請求
}

// 步驟 3: 戶長 OCR（從暫存調用）
const handleConfirmHeaderAndScanHouseholdHead = async () => {
  const headBlob = getSegmentBlob(imageSegments, 1) // Base64 → Blob
  // 發送 OCR 請求
}
```

---

## 📊 效能影響分析

### 記憶體使用

**Base64 儲存大小** (單張戶口名簿):
- 表頭區域: ~80 KB
- 戶長資料: ~50 KB
- 成員1-4: 每個 ~50 KB
- **總計**: ~300 KB

**與舊方案比較**:
- Blob 模式: ~200 KB (二進制)
- Base64 模式: ~300 KB (文字編碼，增加 33%)

**判斷**: 可接受，現代瀏覽器可輕鬆處理

### 處理速度

| 操作 | 舊流程 | 新流程 | 變化 |
|------|--------|--------|------|
| 初始切割 | ~500ms | ~500ms | 無變化 |
| OCR 表頭 | 立即 | 立即 | 無變化 |
| 重新 OCR | 需重新切割 +500ms | 直接調用 0ms | ✅ 提升 |
| 記憶體釋放 | 手動 revoke | 自動回收 | ✅ 簡化 |

---

## 🧪 測試工具

### test-base64-segments.html

**功能**:
1. 上傳戶口名簿圖片
2. 自動切割為 6 個 Base64 區域
3. 視覺化顯示每個切片
4. 下載任意切片查看
5. 複製 Base64 到剪貼簿

**使用方式**:
```bash
open /Users/chih-hungtseng/projects/relieffundpj/heroui/test-base64-segments.html
```

**查看戶長切片**:
1. 上傳戶口名簿
2. 找到「1. 戶長資料」卡片
3. 點擊「下載圖片」查看切片內容
4. 確認切割範圍是否包含完整戶長資料

---

## 🔍 故障排除

### 戶長 OCR 錯誤？

**檢查步驟**:
1. 使用測試工具下載戶長切片（index 1）
2. 查看圖片內容是否完整包含戶長那一列
3. 如果切割位置不對，調整 `config/household-layout.json`:
   ```json
   {
     "type": "household-head",
     "yStart": 0.15,  // ← 調整起始位置
     "yEnd": 0.25     // ← 調整結束位置
   }
   ```

### Base64 過大導致記憶體問題？

**解決方案**:
1. 降低切割品質（`config/ocr-config.json`）:
   ```json
   {
     "segmentation": {
       "quality": 0.85  // 從 0.9 降低到 0.85
     }
   }
   ```

2. 使用完畢後清理 state:
   ```typescript
   setImageSegments(null) // 釋放記憶體
   ```

---

## 📚 相關檔案

### 核心檔案
- `utils/imageSegmentation.ts` - Base64 切割工具
- `components/HouseholdOCRIntegration.tsx` - 新業務流程
- `config/household-layout.json` - 標準切割配置
- `config/ocr-config.json` - OCR 系統配置

### 測試工具
- `test-base64-segments.html` - Base64 切片視覺化測試

### 說明文檔
- `docs/OCR_WORKFLOW_REFACTOR.md` - 本文件
- `config/README.md` - 配置說明

---

## 🎯 未來改進方向

### 1. 持久化暫存
```typescript
// 保存到 sessionStorage（頁面刷新後仍可用）
sessionStorage.setItem('household-segments', JSON.stringify(segments))

// 讀取
const savedSegments = JSON.parse(sessionStorage.getItem('household-segments'))
```

### 2. 動態切割支援
```typescript
// 使用用戶調整的邊界進行動態切割
async function segmentWithCustomRegions(
  imageFile: File,
  customRegions: LayoutRegion[]
): Promise<ImageSegment[]>
```

### 3. 批次 OCR
```typescript
// 一次性 OCR 所有區域
async function batchOCRAllSegments(segments: ImageSegment[])
```

---

**版本**: 2.0
**作者**: Claude AI
**最後更新**: 2025-10-09
