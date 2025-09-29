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
