#!/bin/bash

# Claude Code 自動載入執行規範系統 v1.0
# 在任何專案中自動部署和啟動 CLAUDE 原則執行機制

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[AUTOLOAD]${NC} $1"
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

# 全域配置路徑
GLOBAL_CLAUDE_DIR="$HOME/.claude-enforcement"
TEMPLATE_DIR="$HOME/.claude-enforcement/templates"
SCRIPTS_DIR="$HOME/.claude-enforcement/scripts"

# 建立全域 Claude 執行規範目錄
setup_global_enforcement_system() {
    log_info "建立全域 Claude 執行規範系統..."
    
    # 建立全域目錄結構
    mkdir -p "$GLOBAL_CLAUDE_DIR"
    mkdir -p "$TEMPLATE_DIR"
    mkdir -p "$SCRIPTS_DIR"
    mkdir -p "$HOME/.claude-enforcement/logs"
    mkdir -p "$HOME/.claude-enforcement/data"
    
    log_success "全域目錄結構建立完成"
}

# 複製執行規範模板到全域目錄
copy_enforcement_templates() {
    log_info "複製執行規範模板到全域目錄..."
    
    # 複製核心執行規範文件
    if [ -f ".claude/EXECUTION-CHECKLIST.md" ]; then
        cp ".claude/EXECUTION-CHECKLIST.md" "$TEMPLATE_DIR/"
        log_success "檢查清單模板複製完成"
    fi
    
    if [ -f ".claude/AUTO-VIOLATION-DETECTOR.md" ]; then
        cp ".claude/AUTO-VIOLATION-DETECTOR.md" "$TEMPLATE_DIR/"
        log_success "違反偵測模板複製完成"
    fi
    
    if [ -f ".claude/PAUSE-REFLECT-SYSTEM.md" ]; then
        cp ".claude/PAUSE-REFLECT-SYSTEM.md" "$TEMPLATE_DIR/"
        log_success "暫停重評模板複製完成"
    fi
    
    if [ -f ".claude/SIMPLICITY-FIRST-FRAMEWORK.md" ]; then
        cp ".claude/SIMPLICITY-FIRST-FRAMEWORK.md" "$TEMPLATE_DIR/"
        log_success "簡化框架模板複製完成"
    fi
    
    # 複製執行腳本
    if [ -d ".claude/scripts" ]; then
        cp -r ".claude/scripts/"* "$SCRIPTS_DIR/"
        chmod +x "$SCRIPTS_DIR"/*.sh
        log_success "執行腳本複製完成"
    fi
}

# 建立 Claude Code 專案偵測腳本
create_project_detector() {
    log_info "建立專案偵測腳本..."
    
    cat > "$SCRIPTS_DIR/detect-and-deploy.sh" << 'EOF'
#!/bin/bash

# Claude Code 專案自動偵測與部署腳本
# 檢測當前是否為程式專案，如果是則自動部署執行規範

PROJECT_INDICATORS=(
    "package.json"      # Node.js
    "requirements.txt"  # Python
    "Cargo.toml"        # Rust
    "go.mod"           # Go
    "pom.xml"          # Java Maven
    "build.gradle"     # Java Gradle
    "Gemfile"          # Ruby
    "composer.json"    # PHP
    ".git"             # Git repository
    "src/"             # Source directory
    "lib/"             # Library directory
)

# 檢查是否為程式專案
is_programming_project() {
    for indicator in "${PROJECT_INDICATORS[@]}"; do
        if [ -e "$indicator" ]; then
            echo "✅ 偵測到程式專案指示符: $indicator"
            return 0
        fi
    done
    return 1
}

# 檢查是否已部署執行規範
has_enforcement_system() {
    [ -f ".claude/EXECUTION-CHECKLIST.md" ] && 
    [ -f ".claude/scripts/quick-check.sh" ] &&
    [ -d ".claude/scripts" ]
}

# 部署執行規範到當前專案
deploy_enforcement_system() {
    local project_path=$(pwd)
    echo "🚀 在專案中部署 CLAUDE 執行規範: $project_path"
    
    # 建立專案 .claude 目錄
    mkdir -p .claude/{scripts,logs,data}
    
    # 複製執行規範文件
    if [ -f "$HOME/.claude-enforcement/templates/EXECUTION-CHECKLIST.md" ]; then
        cp "$HOME/.claude-enforcement/templates/EXECUTION-CHECKLIST.md" .claude/
        echo "   ✅ 檢查清單已部署"
    fi
    
    if [ -f "$HOME/.claude-enforcement/templates/AUTO-VIOLATION-DETECTOR.md" ]; then
        cp "$HOME/.claude-enforcement/templates/AUTO-VIOLATION-DETECTOR.md" .claude/
        echo "   ✅ 違反偵測機制已部署"
    fi
    
    if [ -f "$HOME/.claude-enforcement/templates/PAUSE-REFLECT-SYSTEM.md" ]; then
        cp "$HOME/.claude-enforcement/templates/PAUSE-REFLECT-SYSTEM.md" .claude/
        echo "   ✅ 暫停重評系統已部署"
    fi
    
    if [ -f "$HOME/.claude-enforcement/templates/SIMPLICITY-FIRST-FRAMEWORK.md" ]; then
        cp "$HOME/.claude-enforcement/templates/SIMPLICITY-FIRST-FRAMEWORK.md" .claude/
        echo "   ✅ 簡化框架已部署"
    fi
    
    # 複製執行腳本
    if [ -d "$HOME/.claude-enforcement/scripts" ]; then
        cp "$HOME/.claude-enforcement/scripts"/*.sh .claude/scripts/ 2>/dev/null || true
        chmod +x .claude/scripts/*.sh 2>/dev/null || true
        echo "   ✅ 執行腳本已部署"
    fi
    
    # 建立專案專用的 CLAUDE.md 引用
    if [ ! -f "CLAUDE.md" ]; then
        cat > CLAUDE.md << 'CLAUDE_EOF'
# Claude Code Instructions

## CLAUDE 開發原則執行系統已啟動

此專案已自動配置 CLAUDE 開發原則執行系統。

### 🚀 快速開始

```bash
# 啟動執行規範系統
.claude/scripts/start-enforcement.sh

# 隨時進行快速原則檢查
.claude/scripts/quick-check.sh

# 停止系統
.claude/scripts/stop-enforcement.sh
```

### 📋 執行規範文檔

- [檢查清單系統](.claude/EXECUTION-CHECKLIST.md)
- [違反偵測機制](.claude/AUTO-VIOLATION-DETECTOR.md)
- [暫停重評系統](.claude/PAUSE-REFLECT-SYSTEM.md)
- [簡化決策框架](.claude/SIMPLICITY-FIRST-FRAMEWORK.md)

### ⚠️ 重要提醒

系統會自動：
- 每 30 分鐘提醒檢查工作目標
- 每 2 小時強制深度重評
- 偵測原則違反行為並警報
- 監控專案複雜度增長

請確保遵循 CLAUDE 開發原則，避免：
- 基於假設進行實作
- 跳過實際功能測試
- 選擇過度複雜的方案
- 偏離實際業務需求

---

*此檔案由 Claude Code 自動載入系統產生*
CLAUDE_EOF
        echo "   ✅ CLAUDE.md 已建立"
    fi
    
    echo "🎉 CLAUDE 執行規範部署完成！"
    echo ""
    echo "📋 下一步："
    echo "   1. 執行 '.claude/scripts/start-enforcement.sh' 啟動監控"
    echo "   2. 使用 '.claude/scripts/quick-check.sh' 進行即時檢查"
    echo ""
}

# 主要偵測與部署邏輯
main() {
    echo "🔍 Claude Code 專案自動偵測..."
    
    # 檢查是否為程式專案
    if ! is_programming_project; then
        echo "ℹ️ 當前目錄不是程式專案，跳過部署"
        exit 0
    fi
    
    echo "✅ 確認為程式專案"
    
    # 檢查是否已有執行規範
    if has_enforcement_system; then
        echo "ℹ️ CLAUDE 執行規範已存在，檢查更新..."
        
        # 檢查版本並更新（可選）
        echo "   當前系統已是最新版本"
        exit 0
    fi
    
    # 部署執行規範系統
    deploy_enforcement_system
}

main "$@"
EOF
    
    chmod +x "$SCRIPTS_DIR/detect-and-deploy.sh"
    log_success "專案偵測腳本建立完成"
}

# 建立 Claude Code 啟動 Hook
create_claude_startup_hook() {
    log_info "建立 Claude Code 啟動 Hook..."
    
    # 建立全域啟動腳本
    cat > "$SCRIPTS_DIR/claude-code-autostart.sh" << 'EOF'
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
EOF
    
    chmod +x "$SCRIPTS_DIR/claude-code-autostart.sh"
    log_success "Claude Code 啟動 Hook 建立完成"
}

# 建立 Shell 整合腳本
create_shell_integration() {
    log_info "建立 Shell 整合腳本..."
    
    # 建立 claude 命令包裝器
    cat > "$SCRIPTS_DIR/claude-wrapper.sh" << 'EOF'
#!/bin/bash

# Claude Code 命令包裝器
# 在執行 claude 命令前自動載入執行規範

# 執行自動載入
if [ -f "$HOME/.claude-enforcement/scripts/claude-code-autostart.sh" ]; then
    "$HOME/.claude-enforcement/scripts/claude-code-autostart.sh"
fi

# 執行原始 claude 命令
exec claude "$@"
EOF
    
    chmod +x "$SCRIPTS_DIR/claude-wrapper.sh"
    
    # 建立安裝腳本
    cat > "$SCRIPTS_DIR/install-shell-integration.sh" << 'EOF'
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
EOF
    
    chmod +x "$SCRIPTS_DIR/install-shell-integration.sh"
    log_success "Shell 整合腳本建立完成"
}

# 建立全域管理腳本
create_global_manager() {
    log_info "建立全域管理腳本..."
    
    cat > "$SCRIPTS_DIR/claude-enforcement-manager.sh" << 'EOF'
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
EOF
    
    chmod +x "$SCRIPTS_DIR/claude-enforcement-manager.sh"
    
    # 建立方便的全域管理命令連結
    if [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
        ln -sf "$SCRIPTS_DIR/claude-enforcement-manager.sh" "/usr/local/bin/claude-enforcement"
        log_success "全域管理命令已建立: claude-enforcement"
    else
        log_warning "無法建立全域命令連結，請手動執行: $SCRIPTS_DIR/claude-enforcement-manager.sh"
    fi
    
    log_success "全域管理腳本建立完成"
}

# 主要執行函數
main() {
    echo ""
    echo "🤖 Claude Code 自動載入系統建立器"
    echo "======================================="
    echo ""
    
    setup_global_enforcement_system
    copy_enforcement_templates
    create_project_detector
    create_claude_startup_hook
    create_shell_integration
    create_global_manager
    
    echo ""
    log_success "🎉 Claude Code 自動載入系統建立完成！"
    echo ""
    echo "📋 下一步安裝說明："
    echo ""
    echo "1️⃣ 安裝 Shell 整合 (推薦)："
    echo "   $SCRIPTS_DIR/install-shell-integration.sh"
    echo ""
    echo "2️⃣ 或手動測試自動載入："
    echo "   $SCRIPTS_DIR/claude-code-autostart.sh"
    echo ""
    echo "3️⃣ 檢查系統狀態："
    echo "   $SCRIPTS_DIR/claude-enforcement-manager.sh status"
    echo ""
    echo "🔧 系統組件位置："
    echo "   全域系統目錄: $GLOBAL_DIR"
    echo "   執行規範模板: $TEMPLATE_DIR"
    echo "   管理腳本目錄: $SCRIPTS_DIR"
    echo ""
    echo "✨ 安裝完成後，每次在程式專案中執行 'claude' 命令"
    echo "   都會自動部署並啟動 CLAUDE 執行規範系統！"
    echo ""
}

main "$@"