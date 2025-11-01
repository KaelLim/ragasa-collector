#!/bin/bash

echo "🛑 停止 CLAUDE 原則執行系統..."

# 停止提醒系統
.claude/scripts/pause-reminder.sh stop

# 移除定時任務
crontab -l | grep -v "check-violations.sh\|check-simplicity.sh" | crontab -

echo "✅ CLAUDE 原則執行系統已停止"
