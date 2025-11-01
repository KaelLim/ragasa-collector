#!/bin/bash
# Supabase 資料庫備份腳本
# 使用日期: $(date +%Y-%m-%d)

set -e

# 配置
SUPABASE_URL="https://sberelieffundpj.tzuchi-org.tw"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "🔄 開始備份 Supabase 資料庫..."
echo "📁 備份目錄: $BACKUP_DIR"

# 備份 Schema
echo "📋 備份 Schema 檔案..."
cp -r sql "$BACKUP_DIR/"

# 備份 bank_codes 表
echo "💳 備份 bank_codes 資料..."
curl -s "$SUPABASE_URL/rest/v1/bank_codes?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  > "$BACKUP_DIR/bank_codes.json"

# 備份 disaster_applications 表
echo "📝 備份 disaster_applications 資料..."
curl -s "$SUPABASE_URL/rest/v1/disaster_applications?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  > "$BACKUP_DIR/disaster_applications.json"

# 建立備份資訊檔
cat > "$BACKUP_DIR/backup_info.txt" <<EOF
===========================================
Supabase 資料庫備份資訊
===========================================
備份時間: $(date '+%Y-%m-%d %H:%M:%S')
專案名稱: 慈濟救災系統
資料庫 URL: $SUPABASE_URL
備份目錄: $BACKUP_DIR

備份內容:
- Schema 檔案 (sql/)
- bank_codes 資料
- disaster_applications 資料

檔案清單:
$(ls -lh "$BACKUP_DIR")
===========================================
EOF

echo "✅ 備份完成！"
echo "📁 備份位置: $BACKUP_DIR"
echo ""
echo "備份檔案清單:"
ls -lh "$BACKUP_DIR"