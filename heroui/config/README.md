# 戶口名簿配置說明

## 📁 配置檔案概覽

### ocr-config.json - OCR 系統總配置
控制整個 OCR 系統的行為，包括佈局分析模式、切割品質、重試設定等。

### household-layout.json - 戶口名簿標準切割配置

### 📋 配置說明

此配置定義了台灣戶口名簿文件的標準切割比例，用於圖片預處理和 OCR 辨識。

### 🎯 切割區域定義

| 區域 | 類型 | 垂直位置 | 佔比 | 說明 |
|------|------|----------|------|------|
| 0 | header | 0% - 15% | 15% | 表頭區域（戶號、戶長統號、戶別、戶籍地址） |
| 1 | household-head | 15% - 25% | 10% | 戶長資料列 |
| 2 | member | 25% - 35% | 10% | 成員1資料列 |
| 3 | member | 35% - 45% | 10% | 成員2資料列 |
| 4 | member | 45% - 55% | 10% | 成員3資料列 |
| 5 | member | 55% - 65% | 10% | 成員4資料列 |
| 6 | footer | 65% - 100% | 35% | 頁腳資訊（不進行 OCR） |

### 📝 版本歷史

#### v1.0 (2025-10-09)
- **來源**: Vision LLM 自動佈局分析結果
- **驗證**: 基於實際戶口名簿圖片測試驗證
- **優化**: 經過人工確認和調整的標準比例
- **特點**:
  - 表頭區域精確涵蓋戶號、地址等關鍵資訊
  - 每位成員資料列切割均勻（各佔 10%）
  - 預留頁腳區域避免無效 OCR

### 🔧 使用方式

#### 1. 圖片切割工具 (`utils/imageSegmentation.ts`)

```typescript
import { segmentHouseholdImage } from '@/utils/imageSegmentation'

// 自動使用標準配置進行切割
const segments = await segmentHouseholdImage(imageFile)
// 返回 6 個切片：[表頭, 戶長, 成員1-4]
```

#### 2. 佈局預覽組件 (`components/LayoutPreview.tsx`)

```typescript
import layoutConfig from '@/config/household-layout.json'

// 載入標準配置用於預覽
<LayoutPreview
  imageUrl={imagePreview}
  regions={layoutConfig.regions}
  onConfirm={handleLayoutConfirm}
/>
```

### ⚡ 效能優勢

相較於每次進行 Vision LLM 佈局分析：
- **速度提升**: 節省 20 秒佈局分析時間
- **成本降低**: 無需每次調用 Vision API
- **一致性**: 統一的切割標準確保 OCR 品質穩定

### 🎨 自訂配置

如需調整切割比例：

1. 編輯 `config/household-layout.json`
2. 修改 `regions` 陣列中的 `yStart` 和 `yEnd` 值（範圍 0-1）
3. 確保所有區域連續且無重疊
4. 更新版本號和說明

### ⚠️ 注意事項

1. **比例值範圍**: `yStart` 和 `yEnd` 必須在 0-1 之間
2. **區域連續性**: 下一區域的 `yStart` 應等於上一區域的 `yEnd`
3. **索引順序**: `index` 必須從 0 開始連續遞增
4. **類型限制**: `type` 只能是 `header`、`household-head`、`member` 或 `footer`

---

## 🔧 佈局分析子系統

### 系統架構

佈局分析已模組化為獨立子系統，可透過配置靈活控制：

```
config/ocr-config.json (配置)
         ↓
lib/layout-analyzer.ts (分析器)
         ↓
components/HouseholdOCRIntegration.tsx (整合)
```

### 三種運作模式

#### 1. Standard 模式（預設，推薦）
```json
{
  "layoutAnalysis": {
    "enabled": false,
    "mode": "standard"
  }
}
```

**特點**：
- ✅ 直接使用 `household-layout.json` 標準配置
- ✅ 最快速：無需等待分析
- ✅ 零成本：不調用 Vision LLM API
- ✅ 最穩定：經過驗證的切割比例

**適用場景**：標準格式戶口名簿（99% 的情況）

#### 2. Dynamic 模式
```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "dynamic"
  }
}
```

**特點**：
- 🔄 每次上傳都進行 Vision LLM 分析
- 🎯 自動適應不同格式的戶口名簿
- ⏱️ 分析時間：約 20 秒
- 💰 API 費用：每次約 $0.01

**適用場景**：
- 舊版戶口名簿格式不同
- 特殊排版的戶口名簿
- 需要最高準確度的場景

#### 3. Preview 模式
```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "preview"
  }
}
```

**特點**：
- 🔍 Vision LLM 分析 + 使用者確認
- 🖱️ 可拖動紅線調整邊界
- 👁️ 視覺化驗證切割位置
- ⏱️ 總時間：20 秒（分析）+ 使用者確認時間

**適用場景**：
- 首次處理新格式戶口名簿
- 需要精確控制切割邊界
- 偵錯和優化切割設定

### 使用範例

#### 切換到 Dynamic 模式

編輯 `config/ocr-config.json`：
```json
{
  "layoutAnalysis": {
    "enabled": true,
    "mode": "dynamic"
  }
}
```

重新啟動應用程式即可生效。

#### 程式化調用

```typescript
import { getLayoutAnalyzer } from '@/lib/layout-analyzer'

const analyzer = getLayoutAnalyzer()

// 檢查是否啟用
if (analyzer.isEnabled()) {
  // 執行分析
  const result = await analyzer.analyze(imageFile)
  console.log('佈局來源:', result.source)
  console.log('區域數:', result.regions.length)
}
```

### 效能比較

| 模式 | 速度 | 成本 | 準確度 | 靈活性 |
|------|------|------|--------|--------|
| Standard | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Dynamic | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Preview | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 📚 相關檔案

- `config/ocr-config.json` - OCR 系統總配置
- `config/household-layout.json` - 標準佈局配置
- `lib/layout-analyzer.ts` - 佈局分析子系統
- `utils/imageSegmentation.ts` - 圖片切割工具
- `components/LayoutPreview.tsx` - 佈局預覽組件
- `components/HouseholdOCRIntegration.tsx` - OCR 整合組件

---

**最後更新**: 2025-10-09
**維護者**: Claude AI
**版本**: 2.0
