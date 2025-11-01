#!/bin/bash

# 原則違反自動偵測腳本
LOG_FILE=".claude/logs/violation-check.log"
VIOLATION_LOG=".claude/logs/violations.log"

# 檢查對話歷史中的違反模式
check_violation_patterns() {
    local conversation_log="$1"
    local violations=0
    
    echo "$(date): 執行違反模式檢查" >> "$LOG_FILE"
    
    # 檢查「無文件，不實作」違反
    if grep -q "我認為.*應該\|基於經驗\|看起來像是\|從維基百科" "$conversation_log" 2>/dev/null; then
        echo "🚨 CRITICAL: 檢測到基於假設的實作行為" | tee -a "$VIOLATION_LOG"
        violations=$((violations + 1))
    fi
    
    # 檢查「實際測試優於文件」違反
    if grep -q "功能已完成\|應該可以工作\|理論上沒問題" "$conversation_log" 2>/dev/null && ! grep -q "測試.*通過\|實際.*驗證\|端到端.*測試" "$conversation_log" 2>/dev/null; then
        echo "🚨 CRITICAL: 檢測到未經測試的完成聲明" | tee -a "$VIOLATION_LOG"
        violations=$((violations + 1))
    fi
    
    # 檢查「架構思維」違反
    if grep -q "這樣比較簡單\|我們可以先用.*方案\|避免複雜的配置" "$conversation_log" 2>/dev/null; then
        echo "🚨 CRITICAL: 檢測到架構妥協行為" | tee -a "$VIOLATION_LOG"
        violations=$((violations + 1))
    fi
    
    return $violations
}

# 檢查時間間隔違反
check_time_violations() {
    local violations=0
    
    # 檢查最後文檔檢查時間
    if [ -f ".claude/data/last_doc_check" ]; then
        local last_doc_check=$(cat .claude/data/last_doc_check)
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_doc_check))
        
        if [ $time_diff -gt 1800 ]; then  # 30 分鐘
            echo "⚠️ WARNING: 超過 30 分鐘未進行文檔檢查" | tee -a "$VIOLATION_LOG"
            violations=$((violations + 1))
        fi
    fi
    
    return $violations
}

# 檢查測試覆蓋
check_testing_coverage() {
    local violations=0
    
    # 檢查是否有新功能但無測試
    local recent_commits=$(git log --since="1 hour ago" --oneline 2>/dev/null | wc -l)
    local test_files=$(find . -name "*test*" -o -name "*spec*" | wc -l)
    
    if [ $recent_commits -gt 0 ] && [ $test_files -eq 0 ]; then
        echo "🚨 CRITICAL: 有新提交但無測試檔案" | tee -a "$VIOLATION_LOG"
        violations=$((violations + 1))
    fi
    
    return $violations
}

# 主要偵測函數
main() {
    echo "🤖 執行自動原則違反偵測..." | tee -a "$LOG_FILE"
    
    local total_violations=0
    
    # 尋找可能的對話日誌
    local conversation_logs=()
    if [ -f "/tmp/claude_conversation.log" ]; then
        conversation_logs+=("/tmp/claude_conversation.log")
    fi
    
    # 檢查所有日誌
    for log_file in "${conversation_logs[@]}"; do
        check_violation_patterns "$log_file"
        total_violations=$((total_violations + $?))
    done
    
    check_time_violations
    total_violations=$((total_violations + $?))
    
    check_testing_coverage
    total_violations=$((total_violations + $?))
    
    if [ $total_violations -gt 0 ]; then
        echo "🛑 偵測到 $total_violations 個原則違反，請檢查違反日誌"
        osascript -e "display notification \"偵測到 $total_violations 個原則違反\" with title \"CLAUDE 違反警報\""
        exit 1
    else
        echo "✅ 原則遵循檢查通過"
    fi
}

main "$@"
