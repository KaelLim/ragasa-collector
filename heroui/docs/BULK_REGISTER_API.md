# 大量註冊 API 使用說明

## API 端點

```
POST /api/bulk-register
```

## 功能說明

批量創建用戶並自動確認 email，所有用戶使用相同的預設密碼 `94800552`。

## 請求格式

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "users": [
    {
      "email": "user1@example.com",
      "name": "張三"
    },
    {
      "email": "user2@example.com",
      "name": "李四"
    }
  ]
}
```

## 回應格式

### 成功回應
```json
{
  "success": true,
  "total": 2,
  "success_count": 2,
  "error_count": 0,
  "results": [
    {
      "index": 0,
      "email": "user1@example.com",
      "name": "張三",
      "success": true,
      "message": "User created and confirmed successfully",
      "user_id": "uuid-here"
    },
    {
      "index": 1,
      "email": "user2@example.com",
      "name": "李四",
      "success": true,
      "message": "User created and confirmed successfully",
      "user_id": "uuid-here"
    }
  ],
  "summary": {
    "total_processed": 2,
    "successfully_created": 2,
    "errors": 0,
    "default_password": "94800552"
  }
}
```

### 部分成功回應（有些用戶已存在）
```json
{
  "success": true,
  "total": 2,
  "success_count": 1,
  "error_count": 1,
  "results": [
    {
      "index": 0,
      "email": "existing@example.com",
      "name": "已存在用戶",
      "success": false,
      "message": "User already exists",
      "user_id": null
    },
    {
      "index": 1,
      "email": "new@example.com",
      "name": "新用戶",
      "success": true,
      "message": "User created and confirmed successfully",
      "user_id": "uuid-here"
    }
  ],
  "summary": {
    "total_processed": 2,
    "successfully_created": 1,
    "errors": 1,
    "default_password": "94800552"
  }
}
```

## 使用範例

### cURL
```bash
curl -X POST http://localhost:3000/api/bulk-register \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {"email": "test1@example.com", "name": "測試用戶1"},
      {"email": "test2@example.com", "name": "測試用戶2"}
    ]
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/bulk-register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    users: [
      { email: 'test1@example.com', name: '測試用戶1' },
      { email: 'test2@example.com', name: '測試用戶2' }
    ]
  })
})

const result = await response.json()
console.log(`成功: ${result.success_count}, 失敗: ${result.error_count}`)
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:3000/api/bulk-register',
    json={
        'users': [
            {'email': 'test1@example.com', 'name': '測試用戶1'},
            {'email': 'test2@example.com', 'name': '測試用戶2'}
        ]
    }
)

result = response.json()
print(f"成功: {result['success_count']}, 失敗: {result['error_count']}")
```

## 錯誤處理

### 400 Bad Request
```json
{
  "error": "Users array is required"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "詳細錯誤訊息"
}
```

## 注意事項

1. **預設密碼**：所有用戶使用相同密碼 `94800552`
2. **自動確認**：使用 Service Role Key，用戶創建後自動確認，無需點擊確認信
3. **重複處理**：如果用戶已存在，會標記為失敗但不會中斷批量處理
4. **用戶資料**：`name` 會儲存在 `user_metadata.full_name` 中
5. **安全性**：Service Role Key 只能在伺服器端使用，不可暴露給客戶端

## 環境變數要求

確保 `.env.local` 包含以下變數：

```env
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 測試建議

1. **小批量測試**：先用 2-3 個用戶測試
2. **檢查結果**：確認 `results` 陣列中每個用戶的狀態
3. **驗證登入**：使用創建的 email 和預設密碼 `94800552` 測試登入
4. **清理測試用戶**：測試完成後在 Supabase Dashboard 刪除測試用戶

## 遷移說明

### 從 PHP 遷移到 Next.js API
- ✅ 功能完全相同
- ✅ 使用 Supabase Admin API（`createUser` 方法）
- ✅ 自動確認功能（`email_confirm: true`）
- ✅ 錯誤處理和回應格式一致
- ✅ 無需額外的 PHP 環境

### 移除舊的 PHP 檔案
可以安全刪除：
- `api/bulk-register.php`
- `api/confirm-user.php`（如果不再使用）
