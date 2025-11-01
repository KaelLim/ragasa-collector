# Xinference API Key 部署完整流程

> **更新日期**: 2025-09-30
> **適用版本**: Xinference 0.x+
> **目的**: 從 CLI 啟動 Xinference 到部署 API Key 認證的完整步驟

---

## 📋 目錄

1. [前置需求](#前置需求)
2. [步驟一：啟動 Xinference 服務](#步驟一啟動-xinference-服務)
3. [步驟二：部署模型](#步驟二部署模型)
4. [步驟三：設定 API Key](#步驟三設定-api-key)
5. [步驟四：測試 API Key](#步驟四測試-api-key)
6. [步驟五：整合到專案](#步驟五整合到專案)
7. [常見問題](#常見問題)

---

## 前置需求

### 系統需求
- Python 3.8+
- 至少 16GB RAM
- 50GB+ 可用硬碟空間（用於模型儲存）

### 安裝 Xinference

```bash
# 使用 pip 安裝
pip install xinference

# 或使用 conda
conda install -c conda-forge xinference
```

### 驗證安裝

```bash
xinference --version
```

---

## 步驟一：啟動 Xinference 服務

### 1.1 基本啟動（無認證）

```bash
# 啟動本地服務（預設 port 9997）
xinference-local --host 0.0.0.0 --port 9997
```

### 1.2 背景執行

```bash
# 使用 nohup 背景執行
nohup xinference-local --host 0.0.0.0 --port 9997 > xinference.log 2>&1 &

# 查看 PID
echo $!

# 查看日誌
tail -f xinference.log
```

### 1.3 驗證服務啟動

```bash
# 檢查服務狀態
curl http://localhost:9997/v1/models

# 預期回應：{"object":"list","data":[]}
```

---

## 步驟二：部署模型

### 2.1 查看可用模型

```bash
# 列出所有支援的模型
xinference registrations -t LLM

# 搜尋 qwen 模型
xinference registrations -t LLM | grep qwen
```

### 2.2 部署 qwen2.5-vl-instruct（Vision 模型）

```bash
# 使用 CLI 部署
xinference launch \
  --model-name qwen2.5-vl-instruct \
  --model-format mlx \
  --size-in-billions 32 \
  --quantization 4bit

# 或使用 API 部署
curl -X POST http://localhost:9997/v1/models \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "qwen2.5-vl-instruct",
    "model_format": "mlx",
    "size_in_billions": 32,
    "quantization": "4bit"
  }'
```

### 2.3 驗證模型部署

```bash
# 查看已部署模型
curl http://localhost:9997/v1/models

# 測試模型（無認證）
curl http://localhost:9997/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-vl-instruct",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

---

## 步驟三：設定 API Key

### 3.1 停止現有服務

```bash
# 找到 xinference 進程
ps aux | grep xinference

# 停止服務（替換 PID）
kill -9 <PID>
```

### 3.2 使用環境變數設定 API Key

```bash
# 方法 1：直接設定環境變數
export XINFERENCE_API_KEY="sk-TzDigital-94800552"

# 啟動服務
xinference-local --host 0.0.0.0 --port 9997
```

### 3.3 使用設定檔（推薦）

建立設定檔 `~/.xinference/config.json`:

```json
{
  "api_key": "sk-TzDigital-94800552",
  "host": "0.0.0.0",
  "port": 9997
}
```

啟動服務：

```bash
xinference-local --config ~/.xinference/config.json
```

### 3.4 使用命令列參數（如支援）

```bash
# 某些版本支援直接設定 API key
xinference-local \
  --host 0.0.0.0 \
  --port 9997 \
  --api-key sk-TzDigital-94800552
```

---

## 步驟四：測試 API Key

### 4.1 測試模型列表（需要認證）

```bash
# 無 API key（應該失敗）
curl http://localhost:9997/v1/models

# 使用 Bearer Token 認證（應該成功）
curl http://localhost:9997/v1/models \
  -H "Authorization: Bearer sk-TzDigital-94800552"
```

### 4.2 測試 Chat 功能

```bash
curl http://localhost:9997/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-TzDigital-94800552" \
  -d '{
    "model": "qwen2.5-vl-instruct",
    "messages": [{"role": "user", "content": "你好，請用中文回答：1+1等於多少？"}],
    "max_tokens": 50
  }'
```

### 4.3 測試 Vision/OCR 功能

```bash
curl http://localhost:9997/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-TzDigital-94800552" \
  -d '{
    "model": "qwen2.5-vl-instruct",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "請辨識這張圖片中的文字"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/test-image.jpg"
            }
          }
        ]
      }
    ],
    "max_tokens": 1000
  }'
```

---

## 步驟五：整合到專案

### 5.1 更新 .env.ocr

```bash
# 編輯 heroui/.env.ocr
cat > heroui/.env.ocr << 'EOF'
# Xinference OCR Service Configuration

# === 本地端服務（使用 API Key） ===
XINFERENCE_API_URL=http://localhost:9997/v1
XINFERENCE_API_KEY=sk-TzDigital-94800552

# 使用的模型 ID
XINFERENCE_MODEL_ID=qwen2.5-vl-instruct

# 模型參數設定
XINFERENCE_MAX_TOKENS=2000
XINFERENCE_TEMPERATURE=0.1

# OCR 提示詞模板
XINFERENCE_OCR_SYSTEM_PROMPT="你是一個專業的 OCR 文字識別助手，專門處理台灣身分證和銀行存摺的文字識別。"

# 身分證正面 OCR 提示詞
XINFERENCE_ID_FRONT_PROMPT="請識別這張台灣身分證正面的資訊，包括：姓名、身分證字號、出生日期、性別。請以 JSON 格式回傳，格式為：{\"name\": \"姓名\", \"idNumber\": \"身分證字號\", \"birthDate\": \"出生日期\", \"gender\": \"性別\"}"

# 身分證背面 OCR 提示詞
XINFERENCE_ID_BACK_PROMPT="請識別這張台灣身分證背面的資訊，包括：戶籍地址、發證日期、發證地點。請以 JSON 格式回傳，格式為：{\"address\": \"地址\", \"issueDate\": \"發證日期\", \"issuePlace\": \"發證地點\"}"

# 銀行存摺 OCR 提示詞
XINFERENCE_BANK_PROMPT="請識別這張銀行存摺的資訊，包括：銀行名稱、銀行代碼、分行名稱、帳號、戶名。請以 JSON 格式回傳，格式為：{\"bankName\": \"銀行名稱\", \"bankCode\": \"銀行代碼\", \"branchName\": \"分行名稱\", \"accountNumber\": \"帳號\", \"accountName\": \"戶名\"}"

# 請求超時設定（毫秒）
XINFERENCE_REQUEST_TIMEOUT=30000

# 重試次數
XINFERENCE_MAX_RETRIES=3

# 是否啟用 OCR 服務
ENABLE_OCR_SERVICE=true

# OCR 服務模式：xinference | mock
OCR_SERVICE_MODE=xinference
EOF
```

### 5.2 使用測試腳本驗證

```bash
# 測試 OCR 功能（會自動讀取 .env.ocr）
node scripts/test-ocr-with-env.js https://example.com/id-card.jpg

# 或手動指定 API key
node scripts/test-ocr-with-env.js https://example.com/id-card.jpg sk-TzDigital-94800552
```

### 5.3 重啟 Next.js 開發伺服器

```bash
# 清除快取
rm -rf .next

# 重啟服務
npm run dev
```

---

## 常見問題

### Q1: API Key 認證失敗

**症狀**:
```
{"error": "Unauthorized"}
```

**解決方案**:
1. 確認環境變數已設定：`echo $XINFERENCE_API_KEY`
2. 確認服務有重新啟動（API key 需要在啟動時載入）
3. 檢查 API key 格式是否正確

### Q2: 模型未部署

**症狀**:
```
{"error": "Model not found"}
```

**解決方案**:
```bash
# 檢查已部署模型
curl http://localhost:9997/v1/models \
  -H "Authorization: Bearer sk-TzDigital-94800552"

# 重新部署模型
xinference launch --model-name qwen2.5-vl-instruct
```

### Q3: Vision 功能超時

**症狀**:
處理圖片時超過 30 秒無回應

**解決方案**:
1. 增加超時時間：`XINFERENCE_REQUEST_TIMEOUT=60000`
2. 檢查圖片大小（建議 < 5MB）
3. 檢查系統資源（記憶體、GPU）

### Q4: 端口被佔用

**症狀**:
```
Address already in use
```

**解決方案**:
```bash
# 找到佔用 9997 端口的進程
lsof -ti:9997

# 停止該進程
lsof -ti:9997 | xargs kill -9

# 或使用不同端口
xinference-local --host 0.0.0.0 --port 9998
```

### Q5: 如何切換到私有雲端

編輯 `.env.ocr`:

```bash
# === 本地端服務（已註解） ===
# XINFERENCE_API_URL=http://localhost:9997/v1
# XINFERENCE_API_KEY=sk-TzDigital-94800552

# === 私有雲端服務（TCM3 Studio） ===
XINFERENCE_API_URL=https://tcm3studio.tzuchi-org.tw/v1
XINFERENCE_API_KEY=studiom3tc038266779  # 使用 x-api-key 認證
```

---

## 快速檢查清單

啟動 Xinference 服務前的檢查：

- [ ] Python 3.8+ 已安裝
- [ ] Xinference 已安裝
- [ ] 環境變數 `XINFERENCE_API_KEY` 已設定
- [ ] 端口 9997 未被佔用
- [ ] 有足夠的記憶體和硬碟空間

API Key 部署後的驗證：

- [ ] 模型列表 API 需要認證才能訪問
- [ ] Bearer Token 認證可正常運作
- [ ] Chat 功能可正常使用
- [ ] Vision/OCR 功能可正常使用
- [ ] `.env.ocr` 已更新正確配置

---

## 完整啟動腳本範例

建立 `start-xinference.sh`:

```bash
#!/bin/bash

# 設定 API Key
export XINFERENCE_API_KEY="sk-TzDigital-94800552"

# 停止現有服務
echo "停止現有 Xinference 服務..."
pkill -f xinference-local

# 等待進程結束
sleep 2

# 啟動服務
echo "啟動 Xinference 服務..."
nohup xinference-local --host 0.0.0.0 --port 9997 > xinference.log 2>&1 &

# 等待服務啟動
sleep 5

# 驗證服務
echo "驗證服務狀態..."
curl -s http://localhost:9997/v1/models \
  -H "Authorization: Bearer $XINFERENCE_API_KEY" | python3 -m json.tool

echo "Xinference 服務已啟動"
echo "日誌檔案: xinference.log"
echo "PID: $(pgrep -f xinference-local)"
```

使用方式：

```bash
chmod +x start-xinference.sh
./start-xinference.sh
```

---

**文件維護**: Claude AI (Anthropic)
**專案**: 慈濟災害個人資料收集系統
**版本**: v1.0