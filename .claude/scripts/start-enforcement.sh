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
