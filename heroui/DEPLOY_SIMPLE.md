# 簡易部署指南（直接使用 Port 8793）

## ✅ 前置條件
- Linux 伺服器
- Node.js（已安裝最新版本）
- Port 8793 對外開放
- **不需要 Apache 反向代理**（Next.js 直接監聽 8793）

---

## 🚀 快速部署（5 步驟）

### 步驟 1：上傳專案到伺服器

```bash
# SSH 登入伺服器
ssh user@your-server

# 進入目錄
cd /var/www  # 或你想要的目錄

# Clone 專案
git clone https://github.com/KaelLim/ragasa-collector.git
cd ragasa-collector/heroui

# 或如果已存在，拉取最新版本
cd /var/www/ragasa-collector
git pull origin feature/village-applications-system
cd heroui
```

### 步驟 2：安裝 PM2

```bash
sudo npm install -g pm2
```

### 步驟 3：建立環境變數

```bash
cat > .env.production << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTAzNDg4MDAsImV4cCI6MTkwODExNTIwMH0.OtlmhR0M9VRnIljImzpXuTX0VkHBsmRP28qqqF-UQKM
NEXT_PUBLIC_XINFERENCE_API_URL=https://tcm3studio.tzuchi-org.tw/v1
NEXT_PUBLIC_XINFERENCE_API_KEY=sk-TzDigital-94800552
NEXT_PUBLIC_XINFERENCE_MODEL_ID=qwen2.5-vl-instruct
RAGIC_API_KEY=cWl5VlRWQjJ4ZGJScllaVG5PMFNYM3FGc1VsM2hTVU9jbVFBZ0tGWFVSMFFZOVFqcUdVT25GUEZtd3JDUzA1eFN4RjNPdDJQZTdNPQ==
RAGIC_BASE_URL=https://ap11.ragic.com/TCTCharity/4-20252
NODE_ENV=production
PORT=8793
EOF
```

### 步驟 4：建置專案

```bash
# 安裝相依套件
npm install

# 建置
npm run build
```

### 步驟 5：啟動應用

```bash
# 方法一：使用環境變數啟動
PORT=8793 pm2 start npm --name "ragasa-collector" -- start

# 方法二：使用 npm script（推薦）
pm2 start npm --name "ragasa-collector" -- run start:8793

# 設定開機自動啟動
pm2 startup
# ⚠️ 執行顯示的 sudo 指令

# 儲存 PM2 設定
pm2 save

# 查看狀態
pm2 status
```

---

## ✅ 驗證部署成功

```bash
# 1. 檢查 PM2 狀態
pm2 status
# 應該看到 ragasa-collector 狀態為 "online"

# 2. 測試本機連接
curl http://localhost:8793
# 應該回傳 HTML

# 3. 查看日誌
pm2 logs ragasa-collector --lines 50

# 4. 從外部瀏覽器訪問
# http://YOUR_SERVER_IP:8793
```

---

## 🔄 更新部署

每次有新版本時執行：

```bash
cd /var/www/ragasa-collector/heroui
git pull origin feature/village-applications-system
npm install
npm run build
pm2 restart ragasa-collector
pm2 logs ragasa-collector --lines 20
```

---

## 📊 常用管理指令

```bash
# 查看應用狀態
pm2 status

# 查看即時日誌
pm2 logs ragasa-collector

# 重啟應用
pm2 restart ragasa-collector

# 停止應用
pm2 stop ragasa-collector

# 即時監控（CPU、記憶體）
pm2 monit
```

---

## ⚠️ 疑難排解

### Port 8793 已被佔用
```bash
# 檢查誰在使用 port 8793
sudo lsof -i :8793
sudo netstat -tlnp | grep 8793

# 如果是其他程式，可以：
# 1. 停止該程式
# 2. 或改用其他 port（修改 .env.production 的 PORT）
```

### PM2 啟動失敗
```bash
# 查看錯誤
pm2 logs ragasa-collector --err --lines 100

# 手動測試啟動
npm start

# 檢查環境變數
cat .env.production
```

### 外部無法訪問
```bash
# 檢查防火牆
sudo ufw status
sudo firewall-cmd --list-ports

# 開放 port 8793
sudo ufw allow 8793/tcp
# 或
sudo firewall-cmd --permanent --add-port=8793/tcp
sudo firewall-cmd --reload
```

### 建置錯誤
```bash
# 清除快取重建
rm -rf .next node_modules
npm install
npm run build
```

---

## 📝 重點說明

### 為什麼不需要 Apache？

✅ **Next.js 直接監聽 port 8793**
- 在 `.env.production` 設定 `PORT=8793`
- PM2 啟動時 Next.js 會讀取這個環境變數
- 不需要額外的反向代理

✅ **簡化架構**
- 少一層代理 → 效能更好
- 設定更簡單
- 除錯更容易

⚠️ **何時需要 Apache 反向代理？**
- 需要 SSL termination
- 需要多個應用共用 port 80/443
- 需要進階的請求過濾/改寫

---

## 🎯 部署完成檢查清單

- [ ] PM2 狀態顯示 "online"
- [ ] `curl http://localhost:8793` 回傳 HTML
- [ ] 從外部可以訪問 `http://YOUR_IP:8793`
- [ ] 登入功能正常
- [ ] 新建申請功能正常
- [ ] Ragic 同步正常
- [ ] OCR 功能正常
- [ ] 大量註冊 API 可用

---

**部署完成！🎉**

訪問網址：`http://YOUR_SERVER_IP:8793`
