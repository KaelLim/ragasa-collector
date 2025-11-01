#!/bin/bash

# 簡單性檢查腳本
LOG_FILE=".claude/logs/simplicity-check.log"

# 檢查專案複雜度
check_project_complexity() {
    echo "$(date): 執行專案複雜度檢查" >> "$LOG_FILE"
    
    # 計算檔案數量
    local file_count=$(find src -type f -name "*.js" -o -name "*.ts" -o -name "*.py" 2>/dev/null | wc -l)
    
    # 計算總行數
    local line_count=$(find src -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}')
    
    # 計算依賴數量
    local deps_count=0
    if [ -f "package.json" ]; then
        deps_count=$(jq '.dependencies | length' package.json 2>/dev/null || echo 0)
    fi
    
    echo "📊 專案複雜度分析:"
    echo "   檔案數量: $file_count"
    echo "   總行數: ${line_count:-0}"
    echo "   依賴數量: $deps_count"
    
    # 複雜度評分
    local complexity_score=0
    if [ $file_count -gt 10 ]; then complexity_score=$((complexity_score + 2)); fi
    if [ ${line_count:-0} -gt 1000 ]; then complexity_score=$((complexity_score + 3)); fi
    if [ $deps_count -gt 5 ]; then complexity_score=$((complexity_score + 2)); fi
    
    echo "   複雜度評分: $complexity_score/10"
    
    if [ $complexity_score -gt 7 ]; then
        echo "⚠️ WARNING: 專案複雜度較高，建議考慮簡化"
        osascript -e 'display notification "專案複雜度較高，建議簡化" with title "簡單性警報"'
    elif [ $complexity_score -gt 4 ]; then
        echo "ℹ️ INFO: 專案複雜度適中，注意控制增長"
    else
        echo "✅ 專案複雜度良好"
    fi
    
    # 記錄到檔案
    echo "$complexity_score" > .claude/data/last_complexity_score
}

# 檢查最近的複雜度變化
check_complexity_trend() {
    local current_score=$(cat .claude/data/last_complexity_score 2>/dev/null || echo 0)
    local previous_score=$(cat .claude/data/previous_complexity_score 2>/dev/null || echo 0)
    
    if [ $current_score -gt $((previous_score + 2)) ]; then
        echo "📈 WARNING: 複雜度快速增長 ($previous_score → $current_score)"
        osascript -e 'display notification "複雜度快速增長，請檢查是否過度工程化" with title "複雜度警報"'
    fi
    
    # 更新歷史記錄
    echo "$current_score" > .claude/data/previous_complexity_score
}

main() {
    echo "🎯 執行簡單性檢查..."
    check_project_complexity
    check_complexity_trend
    echo "✅ 簡單性檢查完成"
}

main "$@"
