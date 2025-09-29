#!/bin/bash

# Shell 整合安裝腳本

SHELL_RC_FILE=""
SHELL_NAME=$(basename "$SHELL")

# 確定 shell 配置檔案
case "$SHELL_NAME" in
    "bash")
        if [[ "$OSTYPE" == "darwin"* ]]; then
            SHELL_RC_FILE="$HOME/.bash_profile"
        else
            SHELL_RC_FILE="$HOME/.bashrc"
        fi
        ;;
    "zsh")
        SHELL_RC_FILE="$HOME/.zshrc"
        ;;
    "fish")
        SHELL_RC_FILE="$HOME/.config/fish/config.fish"
        ;;
    *)
        echo "⚠️ 不支援的 Shell: $SHELL_NAME"
        echo "請手動將以下內容加入您的 Shell 配置檔案："
        echo "alias claude='$HOME/.claude-enforcement/scripts/claude-wrapper.sh'"
        exit 1
        ;;
esac

echo "🔧 為 $SHELL_NAME 安裝 Claude Code 自動載入整合..."

# 檢查是否已安裝
if grep -q "claude-wrapper.sh" "$SHELL_RC_FILE" 2>/dev/null; then
    echo "ℹ️ Claude Code 整合已安裝"
    exit 0
fi

# 備份原始檔案
if [ -f "$SHELL_RC_FILE" ]; then
    cp "$SHELL_RC_FILE" "$SHELL_RC_FILE.backup.$(date +%Y%m%d-%H%M%S)"
fi

# 添加整合配置
cat >> "$SHELL_RC_FILE" << 'SHELL_EOF'

# Claude Code 自動載入整合 (自動產生)
alias claude='$HOME/.claude-enforcement/scripts/claude-wrapper.sh'

# Claude Code 快速檢查別名
alias claude-check='$HOME/.claude-enforcement/scripts/quick-check.sh'
alias claude-start='if [ -f ".claude/scripts/start-enforcement.sh" ]; then .claude/scripts/start-enforcement.sh; else echo "⚠️ 請先在程式專案中執行 claude 命令"; fi'
alias claude-stop='if [ -f ".claude/scripts/stop-enforcement.sh" ]; then .claude/scripts/stop-enforcement.sh; else echo "⚠️ 請先在程式專案中執行 claude 命令"; fi'

SHELL_EOF

echo "✅ Claude Code 整合已安裝到 $SHELL_RC_FILE"
echo ""
echo "📋 新增的命令："
echo "   claude       - 啟動 Claude Code 並自動載入執行規範"
echo "   claude-check - 隨時進行快速原則檢查"
echo "   claude-start - 啟動當前專案的執行規範系統"
echo "   claude-stop  - 停止當前專案的執行規範系統"
echo ""
echo "🔄 請執行以下命令使設定生效："
echo "   source $SHELL_RC_FILE"
echo ""
echo "或重新啟動終端機。"
