#!/bin/bash

# 全域 CLAUDE 執行規範檢查器 v1.0
# 在任何專案中快速執行 CLAUDE 原則檢查，無需本地部署

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 全域配置
GLOBAL_DIR="$HOME/.claude-enforcement"
CHECK_LOG="$GLOBAL_DIR/logs/global-check.log"

# 日誌函數
log_info() {
    echo -e "${BLUE}[GLOBAL-CHECK]${NC} $1"
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

log_check() {
    echo -e "${CYAN}[CHECK]${NC} $1"
}

# 確保全域目錄存在
ensure_global_directory() {
    if [ ! -d "$GLOBAL_DIR" ]; then
        log_warning "全域執行規範系統未安裝，建立基本結構..."
        mkdir -p "$GLOBAL_DIR/logs"
        mkdir -p "$GLOBAL_DIR/data"
    fi
}

# 全域快速原則檢查
global_quick_check() {
    local project_path=$(pwd)
    local project_name=$(basename "$project_path")
    
    log_info "執行全域 CLAUDE 原則檢查 - 專案: $project_name"
    echo "$(date): 全域檢查 - $project_path" >> "$CHECK_LOG"
    
    echo -e "\n${PURPLE}🔍 CLAUDE 全域原則檢查${NC}"
    echo "========================"
    echo "📁 專案: $project_name"
    echo "📍 路徑: $project_path"
    echo ""
    
    # 1. 目標一致性檢查
    echo -e "${CYAN}🎯 1. 目標一致性檢查${NC}"
    echo "你當前在做的事情直接服務於原始目標嗎？"
    echo "   (y) 是的，直接相關"
    echo "   (n) 可能偏離了"
    echo "   (u) 不確定"
    read -p "請選擇 [y/n/u]: " target_check
    
    # 2. 文檔基礎檢查
    echo ""
    echo -e "${CYAN}📚 2. 文檔基礎檢查${NC}"
    echo "過去 30 分鐘的工作基於確定的文檔/需求嗎？"
    echo "   (y) 是的，有官方文檔支撐"
    echo "   (n) 基於假設或經驗"
    echo "   (u) 不確定"
    read -p "請選擇 [y/n/u]: " doc_check
    
    # 3. 簡單性檢查
    echo ""
    echo -e "${CYAN}🎯 3. 簡單性檢查${NC}"
    echo "當前方向是最簡單有效的解決方案嗎？"
    echo "   (y) 是最簡單的方案"
    echo "   (n) 可能過度複雜"
    echo "   (u) 不確定"
    read -p "請選擇 [y/n/u]: " simplicity_check
    
    # 4. 測試驗證檢查
    echo ""
    echo -e "${CYAN}🧪 4. 測試驗證檢查${NC}"
    echo "最近完成的功能是否經過實際測試驗證？"
    echo "   (y) 已進行端到端測試"
    echo "   (n) 未進行實際測試"
    echo "   (u) 無新功能或不確定"
    read -p "請選擇 [y/n/u]: " test_check
    
    # 5. 必要性檢查
    echo ""
    echo -e "${CYAN}❓ 5. 必要性檢查${NC}"
    echo "你能在 10 秒內解釋為什麼當前工作是必要的嗎？"
    echo "   (y) 可以清楚解釋"
    echo "   (n) 難以解釋必要性"
    echo "   (u) 不確定"
    read -p "請選擇 [y/n/u]: " necessity_check
    
    # 評估結果
    local total_score=0
    local red_flags=0
    
    if [ "$target_check" = "y" ]; then total_score=$((total_score + 1)); fi
    if [ "$doc_check" = "y" ]; then total_score=$((total_score + 1)); fi
    if [ "$simplicity_check" = "y" ]; then total_score=$((total_score + 1)); fi
    if [ "$test_check" = "y" ]; then total_score=$((total_score + 1)); fi
    if [ "$necessity_check" = "y" ]; then total_score=$((total_score + 1)); fi
    
    # 計算紅旗數量
    if [ "$target_check" = "n" ]; then red_flags=$((red_flags + 1)); fi
    if [ "$doc_check" = "n" ]; then red_flags=$((red_flags + 1)); fi
    if [ "$simplicity_check" = "n" ]; then red_flags=$((red_flags + 1)); fi
    if [ "$test_check" = "n" ]; then red_flags=$((red_flags + 1)); fi
    if [ "$necessity_check" = "n" ]; then red_flags=$((red_flags + 1)); fi
    
    echo ""
    echo -e "${PURPLE}📊 檢查結果：${NC}"
    echo "========================"
    echo "遵循度評分: $total_score/5"
    echo "紅旗警報數: $red_flags"
    
    # 結果評估與建議
    if [ $red_flags -eq 0 ] && [ $total_score -ge 4 ]; then
        echo -e "${GREEN}✅ 優秀！完全遵循 CLAUDE 原則${NC}"
        log_success "專案 $project_name: 完全遵循原則 ($total_score/5)"
    elif [ $red_flags -le 1 ] && [ $total_score -ge 3 ]; then
        echo -e "${YELLOW}✅ 良好！大部分遵循原則，注意改進${NC}"
        log_warning "專案 $project_name: 良好遵循 ($total_score/5, $red_flags 個紅旗)"
    elif [ $red_flags -le 2 ] && [ $total_score -ge 2 ]; then
        echo -e "${YELLOW}⚠️ 注意！建議暫停並調整方向${NC}"
        log_warning "專案 $project_name: 需要注意 ($total_score/5, $red_flags 個紅旗)"
    else
        echo -e "${RED}🚨 警告！強烈建議執行深度重評${NC}"
        log_error "專案 $project_name: 嚴重違反原則 ($total_score/5, $red_flags 個紅旗)"
        
        # 發送系統通知
        if command -v osascript &> /dev/null; then
            osascript -e "display notification \"CLAUDE 原則遵循度低 ($total_score/5)\" with title \"原則警報 - $project_name\""
        fi
    fi
    
    # 記錄詳細結果
    echo "$(date): $project_name - 評分: $total_score/5, 紅旗: $red_flags" >> "$CHECK_LOG"
    
    # 提供具體建議
    echo ""
    echo -e "${PURPLE}💡 具體建議：${NC}"
    
    if [ "$target_check" = "n" ]; then
        echo "🎯 目標偏離: 重新確認原始需求，停止無關工作"
    fi
    
    if [ "$doc_check" = "n" ]; then
        echo "📚 文檔缺失: 立即查找官方文檔，停止基於假設的開發"
    fi
    
    if [ "$simplicity_check" = "n" ]; then
        echo "🎯 過度複雜: 評估是否有更簡單的替代方案"
    fi
    
    if [ "$test_check" = "n" ]; then
        echo "🧪 缺少測試: 進行端到端功能驗證，確保實際可用"
    fi
    
    if [ "$necessity_check" = "n" ]; then
        echo "❓ 必要性不明: 重新思考工作價值，考慮停止或簡化"
    fi
    
    if [ $red_flags -eq 0 ] && [ $total_score -ge 4 ]; then
        echo "✨ 保持當前良好狀態，繼續遵循 CLAUDE 原則"
    fi
    
    echo ""
    echo "🔄 建議檢查頻率：每 30 分鐘"
    echo "📋 完整檢查清單位置：$GLOBAL_DIR/templates/EXECUTION-CHECKLIST.md"
}

# 專案複雜度快速評估
quick_complexity_check() {
    local project_path=$(pwd)
    local project_name=$(basename "$project_path")
    
    log_check "執行專案複雜度快速評估..."
    
    # 計算基本複雜度指標
    local file_count=0
    local line_count=0
    local deps_count=0
    
    # 計算程式檔案數量和行數
    if [ -d "src" ] || [ -f "package.json" ] || [ -f "requirements.txt" ] || [ -f "*.py" ] || [ -f "*.js" ]; then
        file_count=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.java" -o -name "*.rs" -o -name "*.rb" -o -name "*.php" \) 2>/dev/null | grep -v node_modules | grep -v __pycache__ | grep -v .git | wc -l)
        
        line_count=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.java" -o -name "*.rs" -o -name "*.rb" -o -name "*.php" \) -exec wc -l {} \; 2>/dev/null | grep -v node_modules | grep -v __pycache__ | grep -v .git | awk '{sum+=$1} END {print sum}')
    fi
    
    # 計算依賴數量
    if [ -f "package.json" ]; then
        deps_count=$(jq '.dependencies | length' package.json 2>/dev/null || echo 0)
    elif [ -f "requirements.txt" ]; then
        deps_count=$(wc -l < requirements.txt 2>/dev/null || echo 0)
    elif [ -f "Cargo.toml" ]; then
        deps_count=$(grep -c "^\[dependencies\]" -A 100 Cargo.toml 2>/dev/null | grep "=" | wc -l || echo 0)
    fi
    
    # 複雜度評分邏輯
    local complexity_score=0
    if [ $file_count -gt 20 ]; then complexity_score=$((complexity_score + 3)); fi
    if [ $file_count -gt 10 ]; then complexity_score=$((complexity_score + 2)); fi
    if [ ${line_count:-0} -gt 5000 ]; then complexity_score=$((complexity_score + 3)); fi
    if [ ${line_count:-0} -gt 1000 ]; then complexity_score=$((complexity_score + 2)); fi
    if [ $deps_count -gt 10 ]; then complexity_score=$((complexity_score + 2)); fi
    if [ $deps_count -gt 5 ]; then complexity_score=$((complexity_score + 1)); fi
    
    echo ""
    echo -e "${CYAN}📊 專案複雜度分析:${NC}"
    echo "   檔案數量: ${file_count:-0}"
    echo "   總行數: ${line_count:-0}"  
    echo "   依賴數量: $deps_count"
    echo "   複雜度評分: $complexity_score/10"
    
    if [ $complexity_score -gt 7 ]; then
        echo -e "${RED}⚠️ 警告: 專案複雜度過高，強烈建議簡化${NC}"
        log_error "專案 $project_name: 複雜度過高 ($complexity_score/10)"
    elif [ $complexity_score -gt 4 ]; then
        echo -e "${YELLOW}ℹ️ 注意: 專案複雜度適中，注意控制增長${NC}"
        log_warning "專案 $project_name: 複雜度適中 ($complexity_score/10)"
    else
        echo -e "${GREEN}✅ 專案複雜度良好${NC}"
        log_success "專案 $project_name: 複雜度良好 ($complexity_score/10)"
    fi
    
    # 記錄複雜度數據
    echo "$(date): $project_name - 複雜度: $complexity_score/10 (檔案:$file_count, 行數:$line_count, 依賴:$deps_count)" >> "$CHECK_LOG"
}

# 環境與配置檢查
environment_check() {
    log_check "執行開發環境檢查..."
    
    local issues=0
    
    echo ""
    echo -e "${CYAN}🔧 開發環境檢查:${NC}"
    
    # 檢查 Git 狀態
    if [ -d ".git" ]; then
        local uncommitted_changes=$(git status --porcelain 2>/dev/null | wc -l)
        echo "   Git 狀態: ✅ (未提交變更: $uncommitted_changes)"
        
        if [ $uncommitted_changes -gt 10 ]; then
            echo -e "${YELLOW}      ⚠️ 過多未提交變更，建議整理${NC}"
            issues=$((issues + 1))
        fi
    else
        echo "   Git 狀態: ❌ 非 Git 專案"
    fi
    
    # 檢查是否有測試檔案
    local test_files=$(find . -name "*test*" -o -name "*spec*" 2>/dev/null | grep -v node_modules | wc -l)
    if [ $test_files -gt 0 ]; then
        echo "   測試檔案: ✅ (發現 $test_files 個)"
    else
        echo -e "${YELLOW}   測試檔案: ⚠️ 未發現測試檔案${NC}"
        issues=$((issues + 1))
    fi
    
    # 檢查配置檔案
    local config_files=0
    for config in "package.json" "requirements.txt" "Cargo.toml" "go.mod" "Gemfile"; do
        if [ -f "$config" ]; then
            config_files=$((config_files + 1))
        fi
    done
    
    if [ $config_files -gt 0 ]; then
        echo "   配置檔案: ✅"
    else
        echo "   配置檔案: ❌ 未識別的專案類型"
    fi
    
    # 檢查 CLAUDE 執行規範
    if [ -d ".claude" ] && [ -f ".claude/scripts/quick-check.sh" ]; then
        echo "   CLAUDE 規範: ✅ 已配置"
        
        if [ -f ".claude/data/pause-reminder.pid" ]; then
            echo "   執行規範系統: 🟢 運行中"
        else
            echo -e "${YELLOW}   執行規範系統: 🔴 未啟動${NC}"
            issues=$((issues + 1))
        fi
    else
        echo -e "${YELLOW}   CLAUDE 規範: ⚠️ 未配置${NC}"
        echo "      建議執行: claude 或自動部署執行規範"
    fi
    
    echo ""
    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}✅ 開發環境檢查通過${NC}"
    else
        echo -e "${YELLOW}⚠️ 發現 $issues 個環境問題${NC}"
    fi
}

# 顯示檢查歷史
show_check_history() {
    log_info "顯示檢查歷史記錄..."
    
    if [ ! -f "$CHECK_LOG" ]; then
        log_warning "尚無檢查記錄"
        return
    fi
    
    echo ""
    echo -e "${PURPLE}📈 檢查歷史記錄 (最近 10 次):${NC}"
    echo "=================================="
    tail -n 10 "$CHECK_LOG" | while read -r line; do
        echo "   $line"
    done
    echo ""
}

# 全域統計
global_stats() {
    log_info "顯示全域統計資訊..."
    
    if [ ! -f "$CHECK_LOG" ]; then
        log_warning "尚無統計資料"
        return
    fi
    
    local total_checks=$(wc -l < "$CHECK_LOG" 2>/dev/null || echo 0)
    local today_checks=$(grep "$(date '+%Y-%m-%d')" "$CHECK_LOG" 2>/dev/null | wc -l || echo 0)
    local recent_violations=$(grep -i "嚴重違反\|警告\|需要注意" "$CHECK_LOG" 2>/dev/null | tail -n 5 | wc -l || echo 0)
    
    echo ""
    echo -e "${PURPLE}📊 全域統計資訊:${NC}"
    echo "==================="
    echo "   總檢查次數: $total_checks"
    echo "   今日檢查: $today_checks"
    echo "   近期違反: $recent_violations"
    echo "   檢查日誌: $CHECK_LOG"
    echo ""
    
    if [ $recent_violations -gt 2 ]; then
        echo -e "${YELLOW}⚠️ 注意：最近有較多原則違反情況${NC}"
    fi
}

# 顯示幫助資訊
show_help() {
    echo -e "${PURPLE}Claude 全域執行規範檢查器${NC}"
    echo ""
    echo "使用方法: $0 [command]"
    echo ""
    echo "指令："
    echo "  check      - 執行完整原則檢查 (預設)"
    echo "  complexity - 專案複雜度評估"
    echo "  env        - 開發環境檢查"
    echo "  history    - 顯示檢查歷史"
    echo "  stats      - 顯示全域統計"
    echo "  help       - 顯示此說明"
    echo ""
    echo "快速檢查："
    echo "  claude-check          # 完整檢查"
    echo "  claude-check quick    # 僅原則檢查"
    echo ""
}

# 主要執行函數
main() {
    ensure_global_directory
    
    case "$1" in
        "complexity")
            quick_complexity_check
            ;;
        "env"|"environment")
            environment_check
            ;;
        "history")
            show_check_history
            ;;
        "stats"|"statistics")
            global_stats
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "check"|""|"quick")
            global_quick_check
            if [ "$1" != "quick" ]; then
                quick_complexity_check
                environment_check
            fi
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"