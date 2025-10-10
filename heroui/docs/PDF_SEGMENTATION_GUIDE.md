# PDF 分割上傳功能使用指南

## 功能概述

本系統提供 PDF 頁面自動分割功能，將每頁 A4 直式 PDF 水平切割成 **5 個片段**，以便 Vision LLM 逐一辨識處理，提高 OCR 準確度。

## 核心功能

### 1. 多頁逐一上傳
- 使用者透過 **+ 按鈕** 逐頁新增 PDF 頁面
- 支援從多頁 PDF 中選擇特定頁面處理
- 每次處理一頁，避免一次性處理過多資料

### 2. 自動頁面分割
- 每一頁自動切割成 **5 個等高的水平片段**
- 分割比例：每片段佔頁面高度的 1/5
- 保留原始圖片品質（JPEG 品質 92%）

### 3. Vision LLM 整合
- 每個片段獨立處理，避免單次辨識內容過多
- 片段按順序編號（1-5），便於追蹤處理進度
- 返回標準 Blob 格式，可直接傳送給 Vision API

## 檔案結構

```
heroui/
├── utils/
│   └── pdfSegmentation.ts           # 核心分割邏輯
├── hooks/
│   └── usePDFSegmentation.ts        # React Hook 狀態管理
├── components/
│   └── PDFSegmenter.tsx             # UI 組件
├── app/
│   └── test-pdf-segmenter/
│       └── page.tsx                 # 測試頁面
└── lib/i18n/locales/
    ├── zh-TW.json                   # 繁體中文翻譯
    └── en.json                      # 英文翻譯
```

## 核心 API

### `processPDFPage(file: File, pageNumber: number)`

處理單一 PDF 頁面，返回 5 個片段。

**參數:**
- `file`: PDF 檔案物件
- `pageNumber`: 頁碼（從 1 開始）

**返回:**
```typescript
interface PDFPageInfo {
  pageNumber: number      // 當前頁碼
  totalPages: number      // PDF 總頁數
  segments: PDFSegment[]  // 5 個片段陣列
}
```

**使用範例:**
```typescript
import { processPDFPage } from '@/utils/pdfSegmentation'

const pageInfo = await processPDFPage(pdfFile, 1)
console.log(`處理完成，共 ${pageInfo.segments.length} 個片段`)
```

---

### `getPDFPageCount(file: File)`

取得 PDF 總頁數，不進行分割處理。

**參數:**
- `file`: PDF 檔案物件

**返回:**
- `number`: 總頁數

**使用範例:**
```typescript
import { getPDFPageCount } from '@/utils/pdfSegmentation'

const totalPages = await getPDFPageCount(pdfFile)
console.log(`這份 PDF 共有 ${totalPages} 頁`)
```

---

### `isPDFFile(file: File)`

驗證檔案是否為有效的 PDF 格式。

**參數:**
- `file`: 檔案物件

**返回:**
- `boolean`: 是否為 PDF 檔案

**使用範例:**
```typescript
import { isPDFFile } from '@/utils/pdfSegmentation'

if (isPDFFile(uploadedFile)) {
  console.log('有效的 PDF 檔案')
} else {
  alert('請上傳 PDF 格式檔案')
}
```

---

## React Hook 使用

### `usePDFSegmentation()`

完整的 PDF 分割狀態管理 Hook。

**返回值:**
```typescript
interface UsePDFSegmentationReturn {
  pages: PDFPageData[]              // 已處理的頁面
  currentPage: number               // 當前頁碼
  totalPages: number | null         // PDF 總頁數
  isProcessing: boolean             // 是否處理中
  error: string | null              // 錯誤訊息

  // 操作方法
  selectPDFFile: (file: File) => Promise<void>      // 選擇 PDF
  processPage: (pageNumber: number) => Promise<void> // 處理指定頁
  addNextPage: () => Promise<void>                   // 新增下一頁
  removePage: (pageNumber: number) => void           // 移除頁面
  reset: () => void                                  // 重置狀態
}
```

**使用範例:**
```typescript
import { usePDFSegmentation } from '@/hooks/usePDFSegmentation'

function MyComponent() {
  const {
    pages,
    isProcessing,
    selectPDFFile,
    addNextPage,
  } = usePDFSegmentation()

  const handleFileSelect = async (file: File) => {
    await selectPDFFile(file)
  }

  const handleAddPage = async () => {
    await addNextPage()
  }

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      <button onClick={handleAddPage} disabled={isProcessing}>
        新增下一頁
      </button>
      <p>已處理 {pages.length} 頁</p>
    </div>
  )
}
```

---

## UI 組件使用

### `<PDFSegmenter />`

完整的 PDF 分割上傳 UI 組件。

**Props:**
```typescript
interface PDFSegmenterProps {
  onSegmentsChange?: (segments: PDFSegment[][]) => void  // 片段更新回調
  maxPages?: number                                      // 最大頁數限制（預設 10）
}
```

**使用範例:**
```typescript
import PDFSegmenter from '@/components/PDFSegmenter'

function ApplicationForm() {
  const handleSegmentsChange = (segments: PDFSegment[][]) => {
    console.log('所有片段:', segments)
    // 可在此處將片段傳送給 Vision LLM
  }

  return (
    <PDFSegmenter
      onSegmentsChange={handleSegmentsChange}
      maxPages={5}
    />
  )
}
```

---

## 整合 Vision LLM

### 基本整合流程

```typescript
import { PDFSegmenter } from '@/components/PDFSegmenter'
import type { PDFSegment } from '@/utils/pdfSegmentation'

function HouseholdOCRPage() {
  const handleSegmentsChange = async (segments: PDFSegment[][]) => {
    // 逐頁、逐片段處理
    for (const pageSegments of segments) {
      for (const segment of pageSegments) {
        // 將片段傳送給 Vision LLM
        const ocrResult = await sendToVisionAPI(segment.blob)
        console.log(`頁 ${segment.pageNumber} 片段 ${segment.segmentIndex}:`, ocrResult)
      }
    }
  }

  return <PDFSegmenter onSegmentsChange={handleSegmentsChange} />
}

async function sendToVisionAPI(blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('image', blob)

  const response = await fetch('/api/vision-ocr', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  return result.text
}
```

---

### 進階整合：批次處理 + 錯誤重試

```typescript
import { PDFSegmenter } from '@/components/PDFSegmenter'
import type { PDFSegment } from '@/utils/pdfSegmentation'

interface OCRResult {
  pageNumber: number
  segmentIndex: number
  text: string
  confidence: number
}

function AdvancedOCRPage() {
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSegmentsChange = async (segments: PDFSegment[][]) => {
    setIsProcessing(true)
    const results: OCRResult[] = []

    try {
      // 批次處理所有片段
      for (const pageSegments of segments) {
        const pageResults = await Promise.all(
          pageSegments.map(async (segment) => {
            try {
              const text = await sendToVisionAPIWithRetry(segment.blob)
              return {
                pageNumber: segment.pageNumber,
                segmentIndex: segment.segmentIndex,
                text,
                confidence: 0.95, // 假設值
              }
            } catch (error) {
              console.error(`片段 ${segment.pageNumber}-${segment.segmentIndex} 處理失敗`, error)
              return null
            }
          })
        )

        results.push(...pageResults.filter(r => r !== null))
      }

      setOcrResults(results)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div>
      <PDFSegmenter onSegmentsChange={handleSegmentsChange} />
      {isProcessing && <p>處理中...</p>}
      {ocrResults.map(result => (
        <div key={`${result.pageNumber}-${result.segmentIndex}`}>
          <h3>頁 {result.pageNumber} 片段 {result.segmentIndex}</h3>
          <p>{result.text}</p>
        </div>
      ))}
    </div>
  )
}

async function sendToVisionAPIWithRetry(
  blob: Blob,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const formData = new FormData()
      formData.append('image', blob)

      const response = await fetch('/api/vision-ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('API 請求失敗')

      const result = await response.json()
      return result.text
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }

  throw new Error('重試次數已達上限')
}
```

---

## 技術細節

### PDF 渲染設定

- **渲染比例**: 2.0x（確保清晰度）
- **圖片格式**: JPEG
- **壓縮品質**: 92%（平衡品質與檔案大小）

### 記憶體管理

- 每次只處理一頁，避免記憶體溢位
- Canvas 物件使用後自動回收
- Blob 物件由瀏覽器自動管理

### 瀏覽器相容性

- **PDF.js**: 支援所有現代瀏覽器
- **Canvas API**: IE11+ 全面支援
- **Blob API**: 現代瀏覽器標準

---

## 測試方式

### 1. 訪問測試頁面

```bash
npm run dev
```

開啟瀏覽器訪問：`http://localhost:5173/test-pdf-segmenter`

### 2. 測試流程

1. 點擊「選擇 PDF 檔案」上傳測試文件
2. 點擊「新增第 1 頁」處理第一頁
3. 檢查是否顯示 5 個片段預覽圖
4. 繼續新增其他頁面
5. 檢查控制台輸出的片段資訊

### 3. 驗證重點

- ✅ 每頁是否正確切成 5 個片段
- ✅ 片段編號是否為 1-5
- ✅ 圖片品質是否清晰
- ✅ 檔案大小是否合理（每片段約 50-200 KB）
- ✅ 多頁處理是否穩定

---

## 常見問題

### Q1: 為什麼是 5 個片段而不是其他數量？
**A:** 根據實際需求，戶籍謄本 A4 直式每頁通常包含 5-10 筆資料，切成 5 個片段可確保每個片段只包含 1-2 筆資料，符合 Vision LLM 單筆辨識的需求。

### Q2: 如何調整片段數量？
**A:** 修改 `utils/pdfSegmentation.ts` 中的 `segmentCanvas` 函數：
```typescript
const totalSegments = 5  // 改為所需的片段數量
```

### Q3: 是否支援橫式 PDF？
**A:** 目前針對直式 A4 最佳化，橫式 PDF 可能需要調整分割邏輯。

### Q4: 如何處理掃描品質較差的 PDF？
**A:** 可調整 PDF 渲染比例（`scale` 參數）來提升清晰度：
```typescript
const canvas = await renderPDFPageToCanvas(page, 3.0)  // 提升至 3.0x
```

### Q5: 片段處理失敗怎麼辦？
**A:** 使用錯誤重試機制（見上方進階整合範例），確保穩定性。

---

## 進階配置

### 自訂分割比例

如需不等高切割（例如頭部較大、其他較小），可修改 `segmentCanvas` 函數：

```typescript
function segmentCanvas(
  canvas: HTMLCanvasElement,
  pageNumber: number
): PDFSegment[] {
  const segments: PDFSegment[] = []

  // 自訂每個片段的高度比例
  const heightRatios = [0.25, 0.2, 0.2, 0.2, 0.15]  // 總和必須為 1.0
  let currentY = 0

  for (let i = 0; i < heightRatios.length; i++) {
    const segmentHeight = Math.floor(canvas.height * heightRatios[i])

    const segmentCanvas = document.createElement('canvas')
    const segmentContext = segmentCanvas.getContext('2d')

    if (!segmentContext) continue

    segmentCanvas.width = canvas.width
    segmentCanvas.height = segmentHeight

    segmentContext.drawImage(
      canvas,
      0, currentY,
      canvas.width, segmentHeight,
      0, 0,
      canvas.width, segmentHeight
    )

    currentY += segmentHeight

    // ... (Blob 轉換邏輯同原版)
  }

  return segments
}
```

---

## 授權與貢獻

本功能為慈濟救災系統專案的一部分，遵循專案整體授權協議。

---

**文件版本**: v1.0
**最後更新**: 2025-10-03
**維護者**: Claude AI
