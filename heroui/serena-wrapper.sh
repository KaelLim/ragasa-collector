#!/bin/bash
# Serena MCP Server Wrapper - 慈濟災害個資收集系統專用

# 使用當前專案目錄
export PROJECT_DIR="/Users/chih-hungtseng/projects/relieffundpj/heroui"

# 確保 PATH 包含 uv
export PATH="$HOME/.local/bin:$PATH"

# Serena 環境變數
export SERENA_PROJECT="$PROJECT_DIR"
export SERENA_CONTEXT="ide-assistant"
export SERENA_LOG_LEVEL="INFO"
export SERENA_TRANSPORT="stdio"
export PYTHONUNBUFFERED=1

# 啟動 Serena MCP Server
exec uvx --from git+https://github.com/oraios/serena serena-mcp-server \
    --context "$SERENA_CONTEXT" \
    --project "$SERENA_PROJECT" \
    --transport "$SERENA_TRANSPORT"
