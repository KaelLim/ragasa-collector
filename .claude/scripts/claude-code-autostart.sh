#!/bin/bash

# Claude Code 自動啟動腳本
# 在任何目錄執行 claude 命令時自動載入執行規範

AUTOLOAD_LOG="$HOME/.claude-enforcement/logs/autoload.log"

echo "$(date): Claude Code 啟動，執行自動載入檢查" >> "$AUTOLOAD_LOG"

# 偵測並部署執行規範
if [ -f "$HOME/.claude-enforcement/scripts/detect-and-deploy.sh" ]; then
    echo "🤖 Claude Code: 自動載入執行規範..."
    "$HOME/.claude-enforcement/scripts/detect-and-deploy.sh"
    
    # 如果部署成功且系統尚未啟動，自動啟動
    if [ -f ".claude/scripts/start-enforcement.sh" ] && [ ! -f ".claude/data/pause-reminder.pid" ]; then
        echo "🚀 自動啟動 CLAUDE 執行規範系統..."
        .claude/scripts/start-enforcement.sh > /dev/null 2>&1 &
        echo "✅ 執行規範系統已在背景啟動"
    fi
else
    echo "⚠️ 未找到自動載入腳本"
fi

echo "$(date): 自動載入完成" >> "$AUTOLOAD_LOG"
