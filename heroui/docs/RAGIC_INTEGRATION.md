# Ragic 整合文件

## Ragic 表單資訊

- **表單路徑**: `https://ap11.ragic.com/TCTCharity/4-20252/36`
- **表單名稱**: 光復發放社工給號與證件照上傳
- **API Key**: (儲存在 `.env.local`)

## 欄位對照表

| Ragic 欄位名稱 | EID | 資料類型 | 對應到我們系統的欄位 |
|---------------|-----|---------|---------------------|
| 樺加沙編號 | 1028878 | 文字 (Enum) | **自動生成**（村名 + 流水號） |
| 身分證正面 | 1028852 | 圖片上傳 | `documents.front_id_photo` |
| 身分證背面 | 1028853 | 圖片上傳 | `documents.back_id_photo` |
| 戶籍謄本 | 1028854 | 圖片上傳 | `documents.addons_docs[type="戶籍謄本"]` |
| 其他佐證照片 | 1028855 | 圖片上傳 | `documents.addons_docs[其他類型]` |
| 縣市行政區 | 1028836 | 文字 | "976花蓮縣光復鄉" (固定值) |
| 村/里 | 1028837 | 文字 | ❓ 未使用（可從編號推算） |
| 地址 | 1028839 | 文字 | `data.address` |
| 縣市行政區2 | 1028875 | 文字 | ❓ 通訊地址？ |
| 村/里2 | 1028876 | 文字 | ❓ 通訊地址？ |
| 地址2 | 1028877 | 文字 | ❓ 通訊地址？ |
| 姓名 | 1028840 | 文字 | `data.victim_name` |
| 身分證號 | 1028871 | 文字 | `data.id_number` |
| 權限1 | 1028872 | 文字 | ❌ 忽略 |
| 權限2 | 1028873 | 文字 | ❌ 忽略 |
| 更新發放紀錄執行時間 | 1028882 | 日期時間 | ❌ 系統自動 |

## 樺加沙編號規則

### 格式
```
{村名}{流水號}
```

### 流水號範圍
| 村名 | 流水號範圍 | 格式範例 |
|------|-----------|---------|
| 大安 | 001 - 500 | 大安001, 大安002, ..., 大安500 |
| 大華 | 001 - 700 | 大華001, 大華002, ..., 大華700 |
| 大同 | 001 - 300 | 大同001, 大同002, ..., 大同300 |
| 其他 | 001 - 300 | 其他001, 其他002, ..., 其他300 |

### 實作邏輯
```javascript
// 查詢該村目前最大的流水號
const maxNumber = await getMaxNumberForVillage(village)
const nextNumber = maxNumber + 1
const ragicId = `${village}${String(nextNumber).padStart(3, '0')}`
// 例：大安 + 8 = 大安008
```

## 📷 圖片欄位格式

Ragic 的圖片格式：`{hash}@{檔名}`
- 範例：`0OPdBZb35m@身分證正面範本.jfif`

**我們需要**：
1. 從 Supabase Storage 下載圖片
2. 上傳到 Ragic（使用 Ragic 的上傳 API）
3. 取得 Ragic 返回的圖片 hash
4. 組合成 `{hash}@{檔名}` 格式

## 🔄 資料同步對應

### 從我們系統 → Ragic

```javascript
// village_applications 資料
{
  "uuid": "xxx",
  "village": "大安",
  "data": {
    "victim_name": "王小明",
    "id_number": "A123456789",
    "address": "花蓮縣光復鄉..."
  },
  "documents": {
    "front_id_photo": "front_id/uuid_front.jpg",
    "back_id_photo": "back_id/uuid_back.jpg",
    "addons_docs": [
      { "type": "戶籍謄本", "filePath": "..." }
    ]
  }
}

// 轉換為 Ragic 格式
{
  "1028878": "大安008",  // 自動生成
  "1028840": "王小明",
  "1028871": "A123456789",
  "1028836": "976花蓮縣光復鄉",
  "1028839": "花蓮縣光復鄉...",
  "1028852": "{hash}@front.jpg",  // 需上傳圖片
  "1028853": "{hash}@back.jpg",
  "1028854": "{hash}@household.jpg"
}
```

## ✅ 相同之處

1. **村別分類**：我們的 `village` = Ragic 的樺加沙編號前綴
2. **身分證照片**：我們都有正面和背面
3. **基本資料**：姓名、身分證號、地址
4. **附加文件**：戶籍謄本等

## ❓ 需要確認

1. **地址1 vs 地址2**：是否需要區分戶籍地址和通訊地址？
2. **其他佐證照片**：是否包含我們的所有 addons_docs？
3. **圖片上傳 API**：Ragic 的圖片上傳端點是什麼？

## 📡 Ragic API 使用方法

### 1. 更新記錄（文字 + 圖片）

**端點**：`POST https://ap11.ragic.com/TCTCharity/4-20252/36/{ragicId}`

**範例**：更新 ragicId=5（大安002）
```bash
curl -X POST "https://ap11.ragic.com/TCTCharity/4-20252/36/5" \
  -H "Authorization: Basic {API_KEY}" \
  -F "1028840=王小明" \
  -F "1028871=A123456789" \
  -F "1028839=花蓮縣光復鄉大同村3鄰中正路123號" \
  -F "1028836=976花蓮縣光復鄉" \
  -F "1028852=@/path/to/front_id.jpg" \
  -F "1028853=@/path/to/back_id.jpg" \
  -F "api=" \
  -F "v=3"
```

**成功回應**：
```json
{
  "status": "SUCCESS",
  "ragicId": 5,
  "data": {
    "1028852": "8Taf93515i@front.txt",  // Ragic 自動產生的 hash
    "1028840": "王小明",
    "1028871": "A123456789"
  }
}
```

### 2. 圖片格式

**單一圖片**：
```json
"1028852": "8Taf93515i@front.jpg"
```

**多個圖片**（同一欄位）：
```json
"1028855": [
   "",
   "l2ohtH1KW0@file1.jpg",
   "rgDjw6mu6d@file2.jpg"
]
```

**上傳方式**：
- 單一圖片：`-F "1028852=@/path/to/file.jpg"`
- 多個圖片：重複使用相同 EID
  ```bash
  -F "1028855=@/path/to/file1.jpg" \
  -F "1028855=@/path/to/file2.jpg" \
  -F "1028855=@/path/to/file3.jpg"
  ```

**格式說明**：
- hash 由 Ragic 自動產生（例：`9rajW4J7E7`）
- 檔名保留原始名稱
- 陣列第一個元素是空字串 `""`

### 3. 同時更新多個欄位

✅ **可以同時更新**：
- 多個文字欄位
- 多個圖片欄位
- 文字 + 圖片混合

只需在同一個 POST 請求中包含所有 `-F` 參數。

### 4. 必要參數

- `api=` - 必須包含（空值）
- `v=3` - API 版本

## 🔄 整合流程設計

### 從我們系統同步到 Ragic

```
使用者完成申請 (village_applications)
  ↓
1. 從 Supabase Storage 下載圖片
  ↓
2. 查詢 Ragic 該村目前最大編號
  ↓
3. 產生新的樺加沙編號（例：大安009）
  ↓
4. 建立 FormData（文字 + 圖片）
  ↓
5. POST 到 Ragic 建立新記錄
  ↓
6. 將 Ragic ID 儲存回 village_applications
```

## 💡 實作範例

### 完整同步範例

```javascript
// 從 village_applications 同步到 Ragic
async function syncToRagic(application) {
  const formData = new FormData()

  // 1. 基本資料
  formData.append('1028840', application.data.victim_name)      // 姓名
  formData.append('1028871', application.data.id_number)        // 身分證號
  formData.append('1028836', '976花蓮縣光復鄉')                  // 縣市行政區
  formData.append('1028839', application.data.address)          // 地址
  formData.append('1028878', `${application.village}XXX`)       // 樺加沙編號（需先產生流水號）

  // 2. 下載並上傳圖片
  if (application.documents.front_id_photo) {
    const blob = await downloadFromSupabase(application.documents.front_id_photo)
    formData.append('1028852', blob, 'front_id.jpg')
  }

  if (application.documents.back_id_photo) {
    const blob = await downloadFromSupabase(application.documents.back_id_photo)
    formData.append('1028853', blob, 'back_id.jpg')
  }

  // 3. 附加文件（多個圖片上傳到同一欄位）
  for (const doc of application.documents.addons_docs || []) {
    if (doc.type === '戶籍謄本') {
      const blob = await downloadFromSupabase(doc.filePath)
      formData.append('1028854', blob, 'household.jpg')
    } else {
      // 其他類型都放到「其他佐證照片」欄位
      const blob = await downloadFromSupabase(doc.filePath)
      const filename = `${doc.customType || doc.type}.jpg`
      formData.append('1028855', blob, filename)
    }
  }

  // 4. 必要參數
  formData.append('api', '')
  formData.append('v', '3')

  // 5. POST 到 Ragic
  const response = await fetch(
    'https://ap11.ragic.com/TCTCharity/4-20252/36',
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${RAGIC_API_KEY}`
      },
      body: formData
    }
  )

  const result = await response.json()
  return result.ragicId
}
```

## ✅ 測試結果確認

### 多圖片上傳測試（其他佐證照片 EID: 1028855）
```bash
# 上傳兩張圖片
-F "1028855=@letter_page-0001.jpg" \
-F "1028855=@letter_page-0002.jpg"

# Ragic 返回格式（陣列）
"1028855": [
   "",
   "l2ohtH1KW0@letter_page-0001.jpg",
   "rgDjw6mu6d@letter_page-0002.jpg"
]
```

✅ **結論**：Ragic 完全支援多圖片上傳！與我們的 addons_docs 功能完美對應。

## 下一步

您希望實作什麼功能？
1. 從我們系統同步到 Ragic（單向）
2. 雙向同步
3. 從 Ragic 讀取編號避免重複

請告訴我您的需求！
