# 自動原則違反偵測機制 v1.0

## 🤖 **自動偵測觸發詞與模式**

### **📊 「無文件，不實作」違反偵測**

#### **🚨 高風險觸發詞**
```
觸發條件：當對話中出現以下詞彙組合時自動警報

【立即停止級別】
- "我認為這個 API 應該..."
- "基於經驗，通常..."
- "看起來像是..."
- "應該和 X 服務類似..."
- "從維基百科查到..."

【警告級別】
- "我假設..."
- "可能需要..."
- "通常情況下..."
- "根據慣例..."
```

#### **🔍 行為模式偵測**
```
【自動檢查項目】
✓ 是否在 30 分鐘內提及查找官方文檔？
✓ 是否確認了具體的 API 版本號？
✓ 是否提及速率限制或錯誤碼？
✗ 如果以上任一項為否，觸發「文檔缺失警報」
```

### **📊 「實際測試優於文件」違反偵測**

#### **🚨 高風險觸發詞**
```
【立即停止級別】
- "功能已完成"（但未提及測試結果）
- "應該可以工作"
- "理論上沒問題"
- "根據代碼邏輯..."

【警告級別】
- "測試通過"（但無具體測試過程）
- "看起來正常"
- "應該沒問題"
```

#### **🔍 測試驗證偵測**
```
【自動檢查項目】
✓ 宣稱完成前是否進行了端到端測試？
✓ 是否提供了實際的測試執行結果？
✓ 是否從使用者角度驗證了功能？
✗ 如果無法提供具體測試證據，觸發「測試跳過警報」
```

### **📊 「架構思維優於便利主義」違反偵測**

#### **🚨 高風險觸發詞**
```
【立即停止級別】
- "這樣比較簡單"（針對架構決策）
- "我們可以先用本地方案"（當需求明確要求雲端）
- "避免複雜的配置"（當複雜性是必要的）
- "這個工具太複雜，我們換個簡單的"

【警告級別】
- "暫時先這樣"
- "後續再考慮"
- "先湊合著用"
```

#### **🔍 架構決策偵測**
```
【自動檢查項目】
✓ 技術選擇是否符合實際部署環境？
✓ 是否因為技術困難而改變需求定義？
✓ 是否提供了不符合長期架構的臨時方案？
✗ 如果出現架構妥協，觸發「架構偏離警報」
```

## 🔔 **自動警報系統**

### **🚨 立即停止警報 (Critical Alert)**

```markdown
🛑 **CRITICAL: 原則違反偵測**

檢測到高風險違反行為：
▶ 觸發詞：「我認為這個 API 應該...」
▶ 違反原則：無文件，不實作
▶ 風險等級：立即停止

【強制執行動作】
1. 立即停止當前實作
2. 執行文檔查找程序
3. 確認官方規範後方可繼續
4. 更新專案文檔記錄
```

### **⚠️ 警告級警報 (Warning Alert)**

```markdown
⚠️ **WARNING: 潛在原則違反**

檢測到可疑行為模式：
▶ 模式：30 分鐘未提及官方文檔
▶ 風險：可能基於假設進行開發
▶ 建議動作：暫停並查找官方文檔
```

## 🤖 **自動執行腳本框架**

### **偵測腳本模板**

```bash
#!/bin/bash
# 原則違反自動偵測腳本

# 1. 掃描對話歷史中的違反模式
check_violation_patterns() {
    local conversation_log="$1"
    
    # 檢查「無文件，不實作」違反
    if grep -q "我認為.*應該\|基於經驗\|看起來像是" "$conversation_log"; then
        echo "🚨 CRITICAL: 檢測到基於假設的實作行為"
        return 1
    fi
    
    # 檢查「實際測試優於文件」違反
    if grep -q "功能已完成" "$conversation_log" && ! grep -q "測試.*通過\|實際.*驗證"; then
        echo "🚨 CRITICAL: 檢測到未經測試的完成聲明"
        return 1
    fi
    
    # 檢查「架構思維」違反
    if grep -q "這樣比較簡單\|我們可以先用.*方案" "$conversation_log"; then
        echo "🚨 CRITICAL: 檢測到架構妥協行為"
        return 1
    fi
    
    return 0
}

# 2. 檢查時間間隔違反
check_time_violations() {
    local last_doc_check=$(get_last_doc_check_time)
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_doc_check))
    
    if [ $time_diff -gt 1800 ]; then  # 30 分鐘
        echo "⚠️ WARNING: 超過 30 分鐘未進行文檔檢查"
        return 1
    fi
    
    return 0
}

# 3. 檢查測試覆蓋
check_testing_coverage() {
    local feature_count=$(count_completed_features)
    local test_count=$(count_actual_tests)
    
    if [ $feature_count -gt 0 ] && [ $test_count -eq 0 ]; then
        echo "🚨 CRITICAL: 有完成功能但無對應測試"
        return 1
    fi
    
    return 0
}

# 主要偵測函數
main() {
    echo "🤖 執行自動原則違反偵測..."
    
    check_violation_patterns "/tmp/conversation.log"
    check_time_violations
    check_testing_coverage
    
    if [ $? -ne 0 ]; then
        echo "🛑 偵測到原則違反，執行強制停止程序"
        exit 1
    fi
    
    echo "✅ 原則遵循檢查通過"
}

main "$@"
```

## 📋 **IDE 整合偵測機制**

### **VSCode 擴展配置**

```json
// .vscode/tasks.json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "原則違反檢查",
            "type": "shell",
            "command": ".claude/scripts/check-violations.sh",
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            },
            "runOptions": {
                "runOn": "folderOpen"
            }
        }
    ]
}
```

### **Git Hook 整合**

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Git 提交前自動檢查原則違反

echo "🤖 執行提交前原則檢查..."

# 檢查提交訊息是否包含違反模式
if git log -1 --pretty=%B | grep -q "快速修復\|臨時方案\|後續處理"; then
    echo "🚨 CRITICAL: 提交訊息暗示未遵循原則"
    echo "請確認是否完成了完整的開發流程"
    exit 1
fi

# 檢查是否有實際測試檔案
if ! find . -name "*test*" -o -name "*spec*" | grep -q .; then
    echo "⚠️ WARNING: 未發現測試檔案"
    echo "是否確認已進行實際功能測試？(y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ 原則檢查通過，允許提交"
```

## 🔄 **持續監控機制**

### **定時檢查腳本**

```bash
#!/bin/bash
# 每 30 分鐘執行的監控腳本

# 1. 檢查是否長時間未查找文檔
check_documentation_freshness() {
    local last_search=$(find . -name "*.md" -newer .claude/last_doc_check 2>/dev/null | wc -l)
    if [ $last_search -eq 0 ]; then
        notify-send "⚠️ 文檔檢查提醒" "已超過 30 分鐘未查找官方文檔"
    fi
}

# 2. 檢查是否有未測試的新功能
check_untested_features() {
    local new_functions=$(git diff HEAD~1 --name-only | grep -E "\.(js|py|ts)$" | wc -l)
    local test_updates=$(git diff HEAD~1 --name-only | grep -i test | wc -l)
    
    if [ $new_functions -gt 0 ] && [ $test_updates -eq 0 ]; then
        notify-send "🚨 測試缺失警報" "發現新功能但無對應測試更新"
    fi
}

# 3. 檢查複雜度增長
check_complexity_growth() {
    local current_complexity=$(find src -name "*.js" -exec wc -l {} \; | awk '{sum+=$1} END {print sum}')
    local last_complexity=$(cat .claude/last_complexity 2>/dev/null || echo 0)
    
    if [ $current_complexity -gt $((last_complexity + 200)) ]; then
        notify-send "⚠️ 複雜度警報" "程式碼複雜度快速增長，請檢查是否過度工程化"
    fi
    
    echo $current_complexity > .claude/last_complexity
}

# 定時執行
while true; do
    check_documentation_freshness
    check_untested_features
    check_complexity_growth
    sleep 1800  # 30 分鐘
done
```

## 📊 **違反統計與學習機制**

### **違反記錄格式**

```markdown
# 原則違反記錄 (.claude/violation-log.md)

## 2025-01-15 14:30 - 無文檔實作違反
- **觸發詞**：「我認為這個 API 應該支援...」
- **違反原則**：無文件，不實作
- **影響**：浪費 2 小時實作錯誤的 API 整合
- **修正行動**：查找官方文檔，重新實作
- **學習點**：整合第三方服務前必須確認官方規範

## 2025-01-15 16:45 - 測試跳過違反
- **觸發模式**：聲稱功能完成但無測試證據
- **違反原則**：實際測試優於文件
- **影響**：功能實際不可用，需重新修復
- **修正行動**：執行端到端測試，發現並修復問題
- **學習點**：任何功能完成聲明都必須附帶測試證據
```

---

**自動偵測機制已建立，將持續監控並改進偵測準確性。**