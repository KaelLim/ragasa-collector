#!/bin/bash

echo "=== 驗證資料庫 Schema ==="
echo ""

# 檢查表是否存在並顯示結構
echo "1. 檢查 disaster_applications 表結構..."
curl -s "https://sberelieffundpj.tzuchi-org.tw/rest/v1/disaster_applications?limit=0" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg" \
  | jq '.' 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ disaster_applications 表可存取"
else
    echo "❌ disaster_applications 表存取失敗"
fi

echo ""
echo "2. 檢查 bank_codes 表結構..."
curl -s "https://sberelieffundpj.tzuchi-org.tw/rest/v1/bank_codes?limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg" \
  | jq '.' 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ bank_codes 表可存取"
else
    echo "❌ bank_codes 表存取失敗"
fi

echo ""
echo "3. 測試新增資料（驗證新欄位）..."
# 注意：這個測試需要有效的 user_id，如果失敗是正常的（因為 RLS）
TEST_RESULT=$(curl -s -X POST "https://sberelieffundpj.tzuchi-org.tw/rest/v1/disaster_applications" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000000",
    "victim_name": "測試",
    "id_number": "A123456789",
    "phone_number": "0912345678",
    "address": "測試地址",
    "bank_code": "004",
    "bank_name": "台灣銀行",
    "bank_branch": "總行",
    "bank_account": "1234567890",
    "account_name": "測試戶名"
  }')

echo "$TEST_RESULT" | jq '.'

if echo "$TEST_RESULT" | grep -q "bank_name"; then
    echo "✅ 新欄位 (bank_name, bank_branch, account_name) 可正常使用"
elif echo "$TEST_RESULT" | grep -q "column.*does not exist"; then
    echo "❌ 新欄位不存在"
elif echo "$TEST_RESULT" | grep -q "violates row-level security"; then
    echo "⚠️  RLS 政策正常運作（需要有效的認證用戶才能新增）"
    echo "✅ Schema 結構正確"
else
    echo "⚠️  無法確定（可能是 RLS 或其他限制）"
fi

echo ""
echo "=== 驗證完成 ==="
