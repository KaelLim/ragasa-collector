#!/bin/bash

# CLAUDE 原則快速檢查腳本 (適用於開發過程中)

echo "🔍 CLAUDE 原則快速檢查"
echo "========================"

# 1. 目標一致性檢查
echo ""
echo "🎯 1. 目標一致性檢查"
echo "你當前在做的事情直接服務於原始目標嗎？"
echo "   (y) 是的，直接相關"
echo "   (n) 可能偏離了"
echo "   (u) 不確定"
read -p "請選擇 [y/n/u]: " target_check

# 2. 文檔基礎檢查
echo ""
echo "📚 2. 文檔基礎檢查"
echo "過去 30 分鐘的工作基於確定的文檔/需求嗎？"
read -p "請選擇 [y/n/u]: " doc_check

# 3. 簡單性檢查
echo ""
echo "🎯 3. 簡單性檢查"
echo "當前方向是最簡單有效的解決方案嗎？"
read -p "請選擇 [y/n/u]: " simplicity_check

# 4. 必要性檢查
echo ""
echo "❓ 4. 必要性檢查"
echo "你能在 10 秒內解釋為什麼當前工作是必要的嗎？"
read -p "請選擇 [y/n/u]: " necessity_check

# 評估結果
echo ""
echo "📊 檢查結果："
echo "========================"

total_score=0
if [ "$target_check" = "y" ]; then total_score=$((total_score + 1)); fi
if [ "$doc_check" = "y" ]; then total_score=$((total_score + 1)); fi
if [ "$simplicity_check" = "y" ]; then total_score=$((total_score + 1)); fi
if [ "$necessity_check" = "y" ]; then total_score=$((total_score + 1)); fi

echo "遵循度評分: $total_score/4"

if [ $total_score -eq 4 ]; then
    echo "✅ 優秀！完全遵循 CLAUDE 原則"
elif [ $total_score -ge 3 ]; then
    echo "✅ 良好！大部分遵循原則，注意改進"
elif [ $total_score -ge 2 ]; then
    echo "⚠️ 注意！建議暫停並調整方向"
else
    echo "🚨 警告！強烈建議執行深度重評"
    osascript -e 'display notification "CLAUDE 原則遵循度較低，建議深度重評" with title "原則警報"'
fi

# 記錄檢查結果
echo "$(date): 快速檢查評分 $total_score/4" >> .claude/logs/quick-checks.log

# 建議行動
echo ""
echo "💡 建議行動："
if [ $total_score -lt 3 ]; then
    echo "1. 立即暫停當前工作"
    echo "2. 重新確認原始目標"
    echo "3. 查找相關官方文檔"
    echo "4. 考慮更簡單的替代方案"
    echo "5. 執行深度重評流程"
else
    echo "1. 繼續當前工作"
    echo "2. 注意保持目標導向"
    echo "3. 定期檢查文檔更新"
    echo "4. 下次檢查時間: $(date -d '+30 minutes' +'%H:%M')"
fi

echo ""
echo "🔄 下次檢查：30 分鐘後"
