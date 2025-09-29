#!/bin/bash

# CLAUDE 原則執行系統初始化腳本 v1.0
# 整合所有原則執行機制並啟動監控

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查依賴
check_dependencies() {
    log_info "檢查系統依賴..."
    
    # 檢查 macOS 通知支援
    if ! command -v osascript &> /dev/null; then
        log_error "需要 macOS 環境支援 osascript"
        exit 1
    fi
    
    # 檢查 Node.js (用於 Slack 提醒)
    if ! command -v node &> /dev/null; then
        log_warning "未檢測到 Node.js，Slack 整合功能將不可用"
    fi
    
    log_success "依賴檢查完成"
}

# 建立必要目錄
setup_directories() {
    log_info "建立執行系統目錄結構..."
    
    mkdir -p .claude/scripts
    mkdir -p .claude/logs
    mkdir -p .claude/data
    
    log_success "目錄結構建立完成"
}

# 建立暫停提醒腳本
create_pause_reminder_script() {
    log_info "建立暫停提醒腳本..."
    
    cat > .claude/scripts/pause-reminder.sh << 'EOF'
#!/bin/bash

# 暫停提醒腳本
LOG_FILE=".claude/logs/pause-reminder.log"
PID_FILE=".claude/data/pause-reminder.pid"

# 30 分鐘提醒
schedule_30min_reminder() {
    while true; do
        sleep 1800  # 30 分鐘
        echo "$(date): 30分鐘提醒觸發" >> "$LOG_FILE"
        osascript -e 'display notification "🛑 暫停重評：過去 30 分鐘工作是否偏離目標？" with title "CLAUDE 原則檢查"'
        
        # 檢查是否在 Claude Code 會話中
        if pgrep -f "claude" > /dev/null; then
            osascript -e 'display dialog "🛑 請執行 30 分鐘暫停重評檢查點\n\n檢查項目：\n• 當前工作是否服務於原始目標？\n• 是否基於確定的文檔/需求？\n• 是否為最簡單有效的方案？\n• 能否在 10 秒內解釋必要性？" buttons {"已完成檢查", "需要深度重評"} default button 1'
        fi
    done
}

# 2 小時深度提醒
schedule_2hr_reminder() {
    while true; do
        sleep 7200  # 2 小時
        echo "$(date): 2小時深度提醒觸發" >> "$LOG_FILE"
        osascript -e 'display notification "🔍 深度重評：請執行 2 小時暫停重評檢查" with title "CLAUDE 深度檢查"'
        
        # 強制暫停所有開發活動
        osascript -e 'display dialog "🛑 強制暫停：請立即執行 2 小時深度重評\n\n檢查項目：\n• 目標一致性檢查\n• 原則遵循檢查\n• 複雜度評估\n• 進度與價值評估" buttons {"開始重評"} default button 1'
    done
}

# 日終提醒
schedule_daily_reminder() {
    while true; do
        current_hour=$(date +"%H")
        if [ "$current_hour" -eq 18 ]; then
            echo "$(date): 日終提醒觸發" >> "$LOG_FILE"
            osascript -e 'display notification "📅 日終重評：請執行今日工作總結與明日規劃" with title "CLAUDE 日終檢查"'
            sleep 3600  # 等待一小時避免重複提醒
        fi
        sleep 600  # 每 10 分鐘檢查一次
    done
}

# 啟動提醒系統
start_reminders() {
    echo $$ > "$PID_FILE"
    echo "$(date): 啟動暫停提醒系統" >> "$LOG_FILE"
    
    schedule_30min_reminder &
    schedule_2hr_reminder &
    schedule_daily_reminder &
    
    echo "✅ 暫停重評提醒系統已啟動 (PID: $$)"
    wait
}

# 停止提醒系統
stop_reminders() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill -TERM "$PID" 2>/dev/null || true
        rm -f "$PID_FILE"
        echo "🛑 暫停提醒系統已停止"
    else
        echo "⚠️ 未找到運行中的提醒系統"
    fi
}

case "$1" in
    start)
        start_reminders
        ;;
    stop)
        stop_reminders
        ;;
    *)
        echo "使用方法: $0 {start|stop}"
        exit 1
        ;;
esac
EOF
    
    chmod +x .claude/scripts/pause-reminder.sh
    log_success "暫停提醒腳本建立完成"
}

# 建立違反偵測腳本
create_violation_detector_script() {
    log_info "建立違反偵測腳本..."
    
    cat > .claude/scripts/check-violations.sh << 'EOF'
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
EOF
    
    chmod +x .claude/scripts/check-violations.sh
    log_success "違反偵測腳本建立完成"
}

# 建立簡化檢查腳本
create_simplicity_checker() {
    log_info "建立簡化檢查腳本..."
    
    cat > .claude/scripts/check-simplicity.sh << 'EOF'
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
EOF
    
    chmod +x .claude/scripts/check-simplicity.sh
    log_success "簡化檢查腳本建立完成"
}

# 建立統一啟動腳本
create_unified_startup() {
    log_info "建立統一啟動腳本..."
    
    cat > .claude/scripts/start-enforcement.sh << 'EOF'
#!/bin/bash

# CLAUDE 原則執行系統統一啟動腳本

echo "🚀 啟動 CLAUDE 原則執行系統..."

# 檢查並停止現有系統
if [ -f ".claude/data/pause-reminder.pid" ]; then
    echo "🛑 停止現有提醒系統..."
    .claude/scripts/pause-reminder.sh stop
fi

# 建立必要的資料檔案
mkdir -p .claude/data .claude/logs
touch .claude/data/last_doc_check
date +%s > .claude/data/last_doc_check

# 啟動暫停提醒系統
echo "⏰ 啟動暫停提醒系統..."
.claude/scripts/pause-reminder.sh start &

# 執行初始檢查
echo "🔍 執行初始違反檢查..."
.claude/scripts/check-violations.sh

echo "🎯 執行初始簡單性檢查..."
.claude/scripts/check-simplicity.sh

# 設定定時檢查
echo "⚙️ 設定定時檢查..."
(crontab -l 2>/dev/null; echo "*/30 * * * * cd $(pwd) && .claude/scripts/check-violations.sh") | crontab -
(crontab -l 2>/dev/null; echo "0 */2 * * * cd $(pwd) && .claude/scripts/check-simplicity.sh") | crontab -

echo ""
echo "✅ CLAUDE 原則執行系統已完全啟動"
echo ""
echo "📋 系統組件："
echo "   • 30分鐘間隔暫停提醒"
echo "   • 2小時深度重評提醒"
echo "   • 日終總結提醒"
echo "   • 自動違反偵測"
echo "   • 複雜度監控"
echo ""
echo "📁 相關檔案："
echo "   • 檢查清單: .claude/EXECUTION-CHECKLIST.md"
echo "   • 偵測機制: .claude/AUTO-VIOLATION-DETECTOR.md"
echo "   • 暫停系統: .claude/PAUSE-REFLECT-SYSTEM.md"
echo "   • 簡化框架: .claude/SIMPLICITY-FIRST-FRAMEWORK.md"
echo ""
echo "📊 監控日誌："
echo "   • 提醒日誌: .claude/logs/pause-reminder.log"
echo "   • 違反日誌: .claude/logs/violations.log"
echo "   • 簡化日誌: .claude/logs/simplicity-check.log"
echo ""
echo "🛑 停止系統: .claude/scripts/stop-enforcement.sh"
EOF
    
    chmod +x .claude/scripts/start-enforcement.sh
    
    # 建立停止腳本
    cat > .claude/scripts/stop-enforcement.sh << 'EOF'
#!/bin/bash

echo "🛑 停止 CLAUDE 原則執行系統..."

# 停止提醒系統
.claude/scripts/pause-reminder.sh stop

# 移除定時任務
crontab -l | grep -v "check-violations.sh\|check-simplicity.sh" | crontab -

echo "✅ CLAUDE 原則執行系統已停止"
EOF
    
    chmod +x .claude/scripts/stop-enforcement.sh
    log_success "統一啟動腳本建立完成"
}

# 建立快速檢查腳本
create_quick_check() {
    log_info "建立快速檢查腳本..."
    
    cat > .claude/scripts/quick-check.sh << 'EOF'
#!/bin/bash

# CLAUDE 原則快速檢查腳本 (適用於開發過程中)

echo "🔍 CLAUDE 原則快速檢查"
echo "========================"

# 1. 目標一致性檢查
echo ""
echo "🎯 1. 目標一致性檢查"
echo "你當前在做的事情直接服務於原始目標嗎？"
echo "   (y) 是的，直接相關"
echo "   (n) 可能偏離了"
echo "   (u) 不確定"
read -p "請選擇 [y/n/u]: " target_check

# 2. 文檔基礎檢查
echo ""
echo "📚 2. 文檔基礎檢查"
echo "過去 30 分鐘的工作基於確定的文檔/需求嗎？"
read -p "請選擇 [y/n/u]: " doc_check

# 3. 簡單性檢查
echo ""
echo "🎯 3. 簡單性檢查"
echo "當前方向是最簡單有效的解決方案嗎？"
read -p "請選擇 [y/n/u]: " simplicity_check

# 4. 必要性檢查
echo ""
echo "❓ 4. 必要性檢查"
echo "你能在 10 秒內解釋為什麼當前工作是必要的嗎？"
read -p "請選擇 [y/n/u]: " necessity_check

# 評估結果
echo ""
echo "📊 檢查結果："
echo "========================"

total_score=0
if [ "$target_check" = "y" ]; then total_score=$((total_score + 1)); fi
if [ "$doc_check" = "y" ]; then total_score=$((total_score + 1)); fi
if [ "$simplicity_check" = "y" ]; then total_score=$((total_score + 1)); fi
if [ "$necessity_check" = "y" ]; then total_score=$((total_score + 1)); fi

echo "遵循度評分: $total_score/4"

if [ $total_score -eq 4 ]; then
    echo "✅ 優秀！完全遵循 CLAUDE 原則"
elif [ $total_score -ge 3 ]; then
    echo "✅ 良好！大部分遵循原則，注意改進"
elif [ $total_score -ge 2 ]; then
    echo "⚠️ 注意！建議暫停並調整方向"
else
    echo "🚨 警告！強烈建議執行深度重評"
    osascript -e 'display notification "CLAUDE 原則遵循度較低，建議深度重評" with title "原則警報"'
fi

# 記錄檢查結果
echo "$(date): 快速檢查評分 $total_score/4" >> .claude/logs/quick-checks.log

# 建議行動
echo ""
echo "💡 建議行動："
if [ $total_score -lt 3 ]; then
    echo "1. 立即暫停當前工作"
    echo "2. 重新確認原始目標"
    echo "3. 查找相關官方文檔"
    echo "4. 考慮更簡單的替代方案"
    echo "5. 執行深度重評流程"
else
    echo "1. 繼續當前工作"
    echo "2. 注意保持目標導向"
    echo "3. 定期檢查文檔更新"
    echo "4. 下次檢查時間: $(date -d '+30 minutes' +'%H:%M')"
fi

echo ""
echo "🔄 下次檢查：30 分鐘後"
EOF
    
    chmod +x .claude/scripts/quick-check.sh
    log_success "快速檢查腳本建立完成"
}

# 主要執行函數
main() {
    echo ""
    echo "🚀 初始化 CLAUDE 原則執行系統"
    echo "=================================="
    echo ""
    
    check_dependencies
    setup_directories
    create_pause_reminder_script
    create_violation_detector_script
    create_simplicity_checker
    create_unified_startup
    create_quick_check
    
    echo ""
    log_success "🎉 CLAUDE 原則執行系統初始化完成！"
    echo ""
    echo "📋 下一步："
    echo "   1. 執行 '.claude/scripts/start-enforcement.sh' 啟動系統"
    echo "   2. 使用 '.claude/scripts/quick-check.sh' 進行快速檢查"
    echo "   3. 查看各個機制文檔了解詳細用法"
    echo ""
    echo "🔧 系統組件已建立："
    echo "   ✅ 可執行檢查清單系統"
    echo "   ✅ 自動違反偵測機制"
    echo "   ✅ 暫停重評習慣機制"
    echo "   ✅ 簡單性優先決策框架"
    echo "   ✅ 整合啟動與監控腳本"
    echo ""
    echo "📖 立即開始使用："
    echo "   .claude/scripts/start-enforcement.sh"
    echo ""
}

main "$@"