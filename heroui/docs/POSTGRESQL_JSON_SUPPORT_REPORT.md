# PostgreSQL JSON 支援驗證報告

## 執行摘要

✅ **Supabase PostgreSQL 完整支援 JSON 資料類型**

## 一、Supabase 技術背景

### 1.1 Supabase 架構
```
Supabase = PostgreSQL + PostgREST + GoTrue + Realtime
```

- **資料庫核心**: PostgreSQL 15.x (Community Edition)
- **專案實例**: sberelieffundpj.tzuchi-org.tw
- **版本支援**: PostgreSQL 9.2+ 原生支援 JSON

### 1.2 JSON vs JSONB 比較

| 特性 | JSON | JSONB |
|------|------|-------|
| 儲存格式 | 純文字 | 二進位分解 |
| 處理速度 | 慢（每次解析） | 快（預處理） |
| 儲存大小 | 較小 | 較大（+壓縮） |
| 索引支援 | 無 | ✅ GIN/GiST |
| 重複鍵 | 保留 | 僅保留最後 |
| 排序保證 | ✅ | ❌ |
| 建議使用 | 日誌、稽核 | **一般應用** |

**推薦**：生產環境優先使用 `JSONB`

## 二、支援功能驗證

### 2.1 基本資料類型測試

```sql
-- ✅ 建立包含 JSON 欄位的表
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  form_data JSON,           -- 支援
  metadata JSONB,           -- 支援（推薦）
  created_at TIMESTAMPTZ
);
```

### 2.2 操作符支援

```sql
-- 取得 JSON 物件欄位
SELECT metadata->>'name' FROM applications;

-- 取得巢狀路徑
SELECT metadata->'address'->>'city' FROM applications;

-- 取得陣列元素
SELECT metadata->'photos'->0 FROM applications;

-- JSONB 包含查詢（需索引）
SELECT * FROM applications 
WHERE metadata @> '{"status": "submitted"}';

-- 陣列長度
SELECT jsonb_array_length(metadata->'items') FROM applications;
```

### 2.3 索引支援（僅 JSONB）

```sql
-- GIN 索引（通用反轉索引）
CREATE INDEX idx_metadata ON applications USING GIN (metadata);

-- GIN 索引（jsonb_path_ops）- 更快但僅支援 @> 操作符
CREATE INDEX idx_metadata_path ON applications 
USING GIN (metadata jsonb_path_ops);

-- 特定路徑索引
CREATE INDEX idx_status ON applications 
((metadata->>'status'));
```

## 三、災害申請系統應用建議

### 3.1 現有 Schema 擴充方案

#### 方案 A：新增 JSONB 欄位（最小影響）

```sql
ALTER TABLE disaster_applications 
ADD COLUMN extended_data JSONB DEFAULT '{}'::JSONB;

-- 建立索引
CREATE INDEX idx_extended_data ON disaster_applications 
USING GIN (extended_data);

-- 範例資料結構
{
  "additional_contacts": [
    {"name": "聯絡人1", "phone": "0912345678", "relation": "家人"}
  ],
  "damage_details": {
    "property_loss": 500000,
    "injury_count": 0,
    "photos": ["url1", "url2"]
  },
  "assistance_history": [
    {"date": "2025-01-15", "amount": 10000, "type": "emergency"}
  ],
  "audit_log": [
    {"timestamp": "2025-01-20T10:00:00Z", "action": "status_change", "from": "submitted", "to": "reviewed"}
  ]
}
```

#### 方案 B：獨立 JSON 表（關聯式設計）

```sql
CREATE TABLE application_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES disaster_applications(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'contacts', 'damage', 'audit'
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_app_datatype UNIQUE(application_id, data_type)
);

CREATE INDEX idx_app_metadata ON application_metadata 
USING GIN (data);
```

### 3.2 TypeScript 介面定義

```typescript
// lib/supabase.ts

export interface DisasterApplication {
  // 現有欄位...
  extended_data?: {
    additional_contacts?: Array<{
      name: string
      phone: string
      relation: string
    }>
    damage_details?: {
      property_loss?: number
      injury_count?: number
      photos?: string[]
    }
    assistance_history?: Array<{
      date: string
      amount: number
      type: string
    }>
    audit_log?: Array<{
      timestamp: string
      action: string
      from?: string
      to?: string
    }>
  }
}
```

### 3.3 前端使用範例

```typescript
// 讀取 JSON 資料
const { data, error } = await supabase
  .from('disaster_applications')
  .select('id, victim_name, extended_data')
  .eq('id', applicationId)
  .single()

const contacts = data?.extended_data?.additional_contacts || []

// 更新 JSON 資料（部分更新）
const { error } = await supabase
  .from('disaster_applications')
  .update({
    extended_data: {
      ...existingData,
      audit_log: [
        ...existingData.audit_log,
        {
          timestamp: new Date().toISOString(),
          action: 'status_change',
          from: 'submitted',
          to: 'reviewed'
        }
      ]
    }
  })
  .eq('id', applicationId)

// JSONB 查詢（需索引）
const { data, error } = await supabase
  .from('disaster_applications')
  .select('*')
  .contains('extended_data', { damage_details: { injury_count: 0 } })
```

## 四、效能考量

### 4.1 JSONB 索引效能

```sql
-- ✅ 好的索引使用（快）
SELECT * FROM applications 
WHERE metadata @> '{"status": "submitted"}';

-- ❌ 差的查詢（慢，無法使用索引）
SELECT * FROM applications 
WHERE metadata->>'status' LIKE '%sub%';
```

### 4.2 儲存空間

- **純關聯式**：精確控制，但欄位多時表結構複雜
- **JSONB**：彈性高，但大型 JSON 會增加儲存成本
- **建議**：
  - 固定欄位（name, id_number）→ 獨立欄位
  - 變動欄位（擴充資料）→ JSONB

## 五、最佳實踐建議

### 5.1 何時使用 JSONB

✅ **適合場景**：
- 欄位結構經常變動
- 需要儲存巢狀結構
- 需要陣列資料
- 審計日誌、元資料

❌ **不適合場景**：
- 需要外鍵約束
- 需要複雜 JOIN 查詢
- 資料需要嚴格型別驗證

### 5.2 資料驗證策略

```sql
-- 使用 CHECK 約束驗證 JSON Schema
ALTER TABLE disaster_applications
ADD CONSTRAINT check_extended_data_schema
CHECK (
  extended_data IS NULL OR
  jsonb_typeof(extended_data) = 'object'
);
```

### 5.3 遷移策略

```sql
-- 步驟 1：新增欄位（不中斷服務）
ALTER TABLE disaster_applications 
ADD COLUMN extended_data JSONB DEFAULT '{}'::JSONB;

-- 步驟 2：遷移現有資料（如有需要）
UPDATE disaster_applications
SET extended_data = jsonb_build_object(
  'audit_log', jsonb_build_array(
    jsonb_build_object(
      'timestamp', created_at,
      'action', 'created',
      'status', status
    )
  )
);

-- 步驟 3：建立索引
CREATE INDEX CONCURRENTLY idx_extended_data 
ON disaster_applications USING GIN (extended_data);

-- 步驟 4：驗證
SELECT 
  COUNT(*) as total,
  COUNT(extended_data) as with_json,
  COUNT(extended_data) FILTER (WHERE jsonb_typeof(extended_data) = 'object') as valid_json
FROM disaster_applications;
```

## 六、驗證測試腳本

### 6.1 功能測試

```sql
-- 在 Supabase SQL Editor 執行
-- 1. 檢查版本
SELECT version();

-- 2. 建立測試表
CREATE TEMP TABLE test_json (
  id SERIAL PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 插入測試資料
INSERT INTO test_json (data) VALUES 
  ('{"name": "測試受災者", "age": 30, "photos": ["url1", "url2"]}'::JSONB),
  ('{"status": "submitted", "amount": 10000}'::JSONB);

-- 4. 查詢測試
SELECT 
  id,
  data->>'name' as name,
  jsonb_array_length(data->'photos') as photo_count,
  data @> '{"status": "submitted"}' as is_submitted
FROM test_json;

-- 5. 索引測試
CREATE INDEX idx_test ON test_json USING GIN (data);

-- 6. 查看執行計劃
EXPLAIN ANALYZE
SELECT * FROM test_json 
WHERE data @> '{"status": "submitted"}';

-- 預期結果：使用 Bitmap Index Scan on idx_test
```

## 七、結論

### ✅ 確認事項

1. **Supabase PostgreSQL 完整支援 JSON 和 JSONB**
2. **JSONB 支援 GIN 索引，查詢效能優異**
3. **適合用於儲存動態、巢狀資料結構**
4. **與現有 TypeScript 前端完美整合**

### 📋 下一步建議

1. **評估需求**：確定哪些資料適合 JSONB 儲存
2. **Schema 設計**：選擇方案 A（單欄位）或方案 B（獨立表）
3. **建立測試**：在開發環境驗證查詢效能
4. **漸進式遷移**：不影響現有功能的情況下逐步導入

---

**報告產生時間**: 2025-09-30
**技術審查**: Claude AI (Anthropic)
**專案**: 慈濟災害個人資料收集系統
