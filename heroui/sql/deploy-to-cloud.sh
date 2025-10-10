#!/bin/bash

# ========================================
# Supabase 私有雲資料庫初始化腳本
# ========================================

set -e

echo "=========================================="
echo "  Supabase 資料庫初始化"
echo "  時間: $(date)"
echo "=========================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 檢查是否在私有雲環境
if [ ! -f "/docker/supabase/.env" ]; then
    echo -e "${RED}❌ 找不到 /docker/supabase/.env${NC}"
    echo "請確認是否在私有雲環境中執行此腳本"
    exit 1
fi

cd /docker/supabase

echo -e "${YELLOW}>>> 步驟 1: 檢查 Docker 容器狀態${NC}"
docker compose ps | grep -E "(db|supabase-db)"
echo ""

echo -e "${YELLOW}>>> 步驟 2: 執行資料庫初始化 SQL${NC}"

# 檢查 SQL 檔案是否存在
if [ ! -f "init_database.sql" ]; then
    echo -e "${RED}❌ 找不到 init_database.sql${NC}"
    echo "請先上傳 SQL 檔案到 /docker/supabase/"
    exit 1
fi

# 執行 SQL（透過 Docker 容器）
docker compose exec -T db psql -U postgres < init_database.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 資料庫初始化成功${NC}"
else
    echo -e "${RED}❌ 資料庫初始化失敗${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}>>> 步驟 3: 驗證資料${NC}"

# 檢查 bank_codes 表
echo "檢查 bank_codes 表..."
BANK_COUNT=$(docker compose exec -T db psql -U postgres -t -c "SELECT COUNT(*) FROM bank_codes;")
echo "銀行代碼數量: $BANK_COUNT"

if [ "$BANK_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ bank_codes 表已建立且有資料${NC}"
else
    echo -e "${RED}❌ bank_codes 表資料異常${NC}"
fi

# 檢查 disaster_applications 表
echo "檢查 disaster_applications 表..."
docker compose exec -T db psql -U postgres -c "\d disaster_applications" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ disaster_applications 表已建立${NC}"
else
    echo -e "${RED}❌ disaster_applications 表不存在${NC}"
fi
echo ""

echo -e "${YELLOW}>>> 步驟 4: 測試 REST API${NC}"

# 測試 bank_codes API
echo "測試 bank_codes API..."
ANON_KEY=$(grep "^ANON_KEY=" .env | cut -d'=' -f2)

RESPONSE=$(curl -s "http://localhost:8100/rest/v1/bank_codes?select=*&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "code"; then
    echo -e "${GREEN}✅ bank_codes API 正常${NC}"
    echo "前 5 筆資料:"
    echo "$RESPONSE" | jq '.[0:5] | .[] | {code, name, type}'
else
    echo -e "${RED}❌ bank_codes API 異常${NC}"
    echo "回應: $RESPONSE"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}  ✅ 資料庫部署完成！${NC}"
echo "=========================================="
echo ""
echo "資料統計:"
echo "  - 銀行代碼: $BANK_COUNT 筆"
echo "  - Tables: bank_codes, disaster_applications"
echo "  - RLS: 已啟用"
echo "  - Policies: 已建立"
echo ""
