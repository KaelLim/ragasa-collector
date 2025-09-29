#!/bin/bash

# Claude 執行規範全域管理器

GLOBAL_DIR="$HOME/.claude-enforcement"

show_status() {
    echo "🔍 Claude 執行規範系統狀態"
    echo "=================================="
    echo ""
    
    # 檢查全域系統
    if [ -d "$GLOBAL_DIR" ]; then
        echo "✅ 全域系統: 已安裝"
        echo "   路徑: $GLOBAL_DIR"
        echo "   模板數量: $(find "$GLOBAL_DIR/templates" -name "*.md" 2>/dev/null | wc -l)"
        echo "   腳本數量: $(find "$GLOBAL_DIR/scripts" -name "*.sh" 2>/dev/null | wc -l)"
    else
        echo "❌ 全域系統: 未安裝"
    fi
    
    echo ""
    
    # 檢查 Shell 整合
    local shell_rc=""
    case "$(basename "$SHELL")" in
        "bash") shell_rc="$HOME/.bash_profile" ;;
        "zsh") shell_rc="$HOME/.zshrc" ;;
        "fish") shell_rc="$HOME/.config/fish/config.fish" ;;
    esac
    
    if [ -n "$shell_rc" ] && grep -q "claude-wrapper.sh" "$shell_rc" 2>/dev/null; then
        echo "✅ Shell 整合: 已安裝 ($shell_rc)"
    else
        echo "❌ Shell 整合: 未安裝"
    fi
    
    echo ""
    
    # 檢查當前專案狀態
    if [ -d ".claude" ]; then
        echo "✅ 當前專案: 已配置執行規範"
        if [ -f ".claude/data/pause-reminder.pid" ]; then
            echo "   執行規範系統: 🟢 運行中"
        else
            echo "   執行規範系統: 🔴 未啟動"
        fi
    else
        echo "ℹ️ 當前專案: 未配置執行規範"
    fi
    
    echo ""
    
    # 檢查日誌
    if [ -f "$GLOBAL_DIR/logs/autoload.log" ]; then
        local last_load=$(tail -n 1 "$GLOBAL_DIR/logs/autoload.log" 2>/dev/null)
        echo "📄 最後自動載入: ${last_load:-無記錄}"
    fi
}

update_system() {
    echo "🔄 更新 Claude 執行規範系統..."
    
    # 這裡可以實作從 Git repository 或其他來源更新的邏輯
    echo "ℹ️ 更新功能開發中..."
    echo "目前請重新執行安裝腳本來更新系統"
}

uninstall_system() {
    echo "🗑️ 解除安裝 Claude 執行規範系統..."
    
    read -p "確定要完全移除系統嗎？(y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "取消解除安裝"
        exit 0
    fi
    
    # 移除全域目錄
    if [ -d "$GLOBAL_DIR" ]; then
        rm -rf "$GLOBAL_DIR"
        echo "✅ 已移除全域系統目錄"
    fi
    
    # 移除 Shell 整合
    local shell_rc=""
    case "$(basename "$SHELL")" in
        "bash") shell_rc="$HOME/.bash_profile" ;;
        "zsh") shell_rc="$HOME/.zshrc" ;;
        "fish") shell_rc="$HOME/.config/fish/config.fish" ;;
    esac
    
    if [ -n "$shell_rc" ] && [ -f "$shell_rc" ]; then
        # 移除相關行
        sed -i.bak '/# Claude Code 自動載入整合/,/^$/d' "$shell_rc" 2>/dev/null || true
        echo "✅ 已移除 Shell 整合"
    fi
    
    echo "🎉 解除安裝完成"
}

show_help() {
    echo "Claude 執行規範全域管理器"
    echo ""
    echo "使用方法: $0 [command]"
    echo ""
    echo "指令："
    echo "  status     - 顯示系統狀態"
    echo "  update     - 更新系統"
    echo "  uninstall  - 解除安裝系統"
    echo "  help       - 顯示此說明"
    echo ""
}

case "$1" in
    "status")
        show_status
        ;;
    "update")
        update_system
        ;;
    "uninstall")
        uninstall_system
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        show_status
        ;;
esac
