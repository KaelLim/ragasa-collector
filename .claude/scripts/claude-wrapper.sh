#!/bin/bash

# Claude Code 命令包裝器
# 在執行 claude 命令前自動載入執行規範

# 執行自動載入
if [ -f "$HOME/.claude-enforcement/scripts/claude-code-autostart.sh" ]; then
    "$HOME/.claude-enforcement/scripts/claude-code-autostart.sh"
fi

# 執行原始 claude 命令
exec claude "$@"
