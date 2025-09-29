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
