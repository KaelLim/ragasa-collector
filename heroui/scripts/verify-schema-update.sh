#!/bin/bash
# Schema 修改驗證腳本

echo "🔍 驗證 Schema 修改完成狀態..."
echo ""

# 檢查檔案是否已修改
check_file() {
    local file=$1
    local pattern=$2
    if grep -q "$pattern" "$file"; then
        echo "✅ $file - 包含 '$pattern'"
    else
        echo "❌ $file - 缺少 '$pattern'"
    fi
}

echo "📁 檢查 SQL Schema 檔案..."
check_file "sql/setup_simple.sql" "bank_name VARCHAR(100)"
check_file "sql/setup_simple.sql" "bank_branch VARCHAR(100)"
check_file "sql/setup_simple.sql" "account_name VARCHAR(50)"
check_file "sql/setup_production.sql" "bank_name"

echo ""
echo "📝 檢查 TypeScript 型別定義..."
check_file "lib/supabase.ts" "bank_name?: string"
check_file "lib/supabase.ts" "bank_branch?: string"
check_file "lib/supabase.ts" "account_name?: string"

echo ""
echo "🔧 檢查前端提交邏輯..."
check_file "app/application/new/page.tsx" "bank_name: formData.bank_name"
check_file "app/application/new/page.tsx" "bank_branch: formData.bank_branch"
check_file "app/application/new/page.tsx" "account_name: formData.account_name"

echo ""
echo "📚 檢查文件..."
if [ -f "sql/migration_add_bank_fields.sql" ]; then
    echo "✅ sql/migration_add_bank_fields.sql 已建立"
else
    echo "❌ sql/migration_add_bank_fields.sql 不存在"
fi

if [ -f "docs/SCHEMA_ANALYSIS.md" ]; then
    echo "✅ docs/SCHEMA_ANALYSIS.md 已建立"
else
    echo "❌ docs/SCHEMA_ANALYSIS.md 不存在"
fi

if [ -f "docs/SCHEMA_UPDATE_COMPLETED.md" ]; then
    echo "✅ docs/SCHEMA_UPDATE_COMPLETED.md 已建立"
else
    echo "❌ docs/SCHEMA_UPDATE_COMPLETED.md 不存在"
fi

if [ -f "EXECUTE_MIGRATION.md" ]; then
    echo "✅ EXECUTE_MIGRATION.md 已建立"
else
    echo "❌ EXECUTE_MIGRATION.md 不存在"
fi

echo ""
echo "🎯 下一步："
echo "1. 在 Supabase Dashboard 執行 sql/migration_add_bank_fields.sql"
echo "2. 或參考 EXECUTE_MIGRATION.md 快速執行指南"
echo "3. 測試前端表單提交功能"
echo "4. 提交 Git 變更"
