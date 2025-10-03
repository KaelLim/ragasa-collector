# Linux 伺服器部署指南（Apache + Port 8793）

## 伺服器環境
- ✅ Linux
- ✅ Apache
- ✅ Node.js（最新版本）
- ✅ Port 8793 對外開放

---

## 部署步驟

### 1. 上傳專案到伺服器

```bash
# 方法一：使用 Git（推薦）
ssh user@your-server
cd /var/www  # 或其他目錄
git clone https://github.com/KaelLim/ragasa-collector.git
cd ragasa-collector/heroui

# 方法二：使用 SCP（從本機執行）
cd /Users/kael/Desktop/website/ragasa-collector
scp -r heroui user@your-server:/var/www/ragasa-collector/
```

### 2. 安裝 PM2（行程管理器）

```bash
# 安裝 PM2
sudo npm install -g pm2

# 驗證安裝
pm2 --version
```

### 3. 設定環境變數

```bash
cd /var/www/ragasa-collector/heroui

# 建立 .env.production
nano .env.production
```

貼上以下內容：
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTAzNDg4MDAsImV4cCI6MTkwODExNTIwMH0.OtlmhR0M9VRnIljImzpXuTX0VkHBsmRP28qqqF-UQKM

# OCR 服務
NEXT_PUBLIC_XINFERENCE_API_URL=https://tcm3studio.tzuchi-org.tw/v1
NEXT_PUBLIC_XINFERENCE_API_KEY=sk-TzDigital-94800552
NEXT_PUBLIC_XINFERENCE_MODEL_ID=qwen2.5-vl-instruct

# Ragic API
RAGIC_API_KEY=cWl5VlRWQjJ4ZGJScllaVG5PMFNYM3FGc1VsM2hTVU9jbVFBZ0tGWFVSMFFZOVFqcUdVT25GUEZtd3JDUzA1eFN4RjNPdDJQZTdNPQ==
RAGIC_BASE_URL=https://ap11.ragic.com/TCTCharity/4-20252

# Node 環境
NODE_ENV=production
PORT=3000
```

儲存並退出（Ctrl+X → Y → Enter）

### 4. 安裝相依套件並建置

```bash
# 安裝相依套件
npm install

# 建置專案（production build）
npm run build
```

### 5. 使用 PM2 啟動應用

```bash
# 啟動 Next.js（port 3000）
pm2 start npm --name "ragasa-collector" -- start

# 查看狀態
pm2 status

# 查看日誌
pm2 logs ragasa-collector

# 設定開機自動啟動
pm2 startup
# 複製並執行顯示的指令（通常是 sudo ...）

# 儲存 PM2 設定
pm2 save
```

### 6. 設定 Apache 反向代理（Port 8793 → Port 3000）

```bash
# 啟用必要的 Apache 模組
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod headers
sudo a2enmod rewrite

# 建立 Apache 虛擬主機設定
sudo nano /etc/apache2/sites-available/ragasa-collector.conf
```

貼上以下設定：

```apache
<VirtualHost *:8793>
    ServerName your-domain.com
    # ServerAlias www.your-domain.com

    # 反向代理到 Next.js (port 3000)
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # WebSocket 支援（用於 Hot Reload）
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]

    # 安全標頭
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # 日誌
    ErrorLog ${APACHE_LOG_DIR}/ragasa-collector-error.log
    CustomLog ${APACHE_LOG_DIR}/ragasa-collector-access.log combined
</VirtualHost>
```

### 7. 啟用網站並重啟 Apache

```bash
# 啟用網站
sudo a2ensite ragasa-collector

# 測試設定
sudo apache2ctl configtest

# 重啟 Apache
sudo systemctl restart apache2

# 檢查 Apache 狀態
sudo systemctl status apache2
```

### 8. 測試部署

```bash
# 測試 Next.js 是否運行（本機）
curl http://localhost:3000

# 測試 Apache 反向代理（本機）
curl http://localhost:8793

# 從外部測試
curl http://your-server-ip:8793
```

---

## 防火牆設定

### 確保 Port 8793 開放

```bash
# UFW
sudo ufw allow 8793/tcp
sudo ufw status

# Firewalld
sudo firewall-cmd --permanent --add-port=8793/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8793 -j ACCEPT
sudo netfilter-persistent save
```

---

## PM2 管理指令

### 常用指令
```bash
# 查看狀態
pm2 status

# 查看即時日誌
pm2 logs ragasa-collector

# 查看最近 100 行日誌
pm2 logs ragasa-collector --lines 100

# 查看錯誤日誌
pm2 logs ragasa-collector --err

# 重啟應用
pm2 restart ragasa-collector

# 停止應用
pm2 stop ragasa-collector

# 刪除應用
pm2 delete ragasa-collector

# 即時監控（CPU、記憶體）
pm2 monit
```

### 進階設定（使用 ecosystem 檔案）

建立 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'ragasa-collector',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/ragasa-collector/heroui',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

使用配置檔案啟動：
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 更新部署流程

### 快速更新腳本

建立 `deploy.sh`：
```bash
#!/bin/bash

echo "🚀 開始部署..."

# 1. 拉取最新程式碼
echo "📦 拉取最新程式碼..."
git pull

# 2. 安裝相依套件
echo "📦 安裝相依套件..."
npm install

# 3. 建置專案
echo "🔨 建置專案..."
npm run build

# 4. 重啟 PM2
echo "🔄 重啟應用..."
pm2 restart ragasa-collector

# 5. 查看狀態
echo "✅ 部署完成！"
pm2 status

echo "📊 最近日誌："
pm2 logs ragasa-collector --lines 20 --nostream
```

使用方式：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## SSL/HTTPS 設定（可選）

### 使用 Let's Encrypt

```bash
# 安裝 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-apache

# 取得 SSL 憑證
sudo certbot --apache -d your-domain.com

# 憑證會自動續期，測試自動續期
sudo certbot renew --dry-run
```

### 手動設定 SSL（如果有自己的憑證）

修改 Apache 設定：
```apache
<VirtualHost *:8793>
    ServerName your-domain.com

    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/chain.crt

    # ... 其他設定同上 ...
</VirtualHost>
```

---

## 效能調校

### Apache 效能設定

編輯 `/etc/apache2/apache2.conf` 或 `/etc/httpd/conf/httpd.conf`：

```apache
# 啟用 KeepAlive
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5

# 壓縮
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# 快取靜態資源
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

重啟 Apache：
```bash
sudo systemctl restart apache2
```

---

## 疑難排解

### 1. Next.js 建置失敗
```bash
# 清除快取
rm -rf .next node_modules package-lock.json

# 重新安裝
npm install
npm run build
```

### 2. PM2 啟動失敗
```bash
# 查看詳細錯誤
pm2 logs ragasa-collector --err --lines 50

# 手動測試啟動
cd /var/www/ragasa-collector/heroui
npm start
```

### 3. Apache 無法連接到 Next.js
```bash
# 檢查 Next.js 是否在 port 3000 運行
netstat -tlnp | grep 3000

# 檢查 Apache 錯誤日誌
sudo tail -f /var/log/apache2/error.log

# 測試反向代理
curl http://localhost:3000
curl http://localhost:8793
```

### 4. Port 8793 無法從外部訪問
```bash
# 檢查 Apache 是否監聽 8793
sudo netstat -tlnp | grep 8793

# 檢查防火牆
sudo ufw status
sudo firewall-cmd --list-ports

# 測試從本機連接
curl http://localhost:8793
```

---

## 快速部署指令（複製貼上即可）

```bash
# 1. 安裝 PM2
sudo npm install -g pm2

# 2. 進入專案目錄
cd /var/www/ragasa-collector/heroui

# 3. 建立環境變數檔案
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
PORT=3000
EOF

# 4. 安裝相依套件
npm install

# 5. 建置專案
npm run build

# 6. 使用 PM2 啟動
pm2 start npm --name "ragasa-collector" -- start

# 7. 設定開機自動啟動
pm2 startup
# 執行顯示的 sudo 指令

pm2 save

# 8. 查看狀態
pm2 status
pm2 logs ragasa-collector --lines 20
```

### Apache 設定（Port 8793）

```bash
# 啟用必要模組
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod rewrite

# 建立虛擬主機設定
sudo nano /etc/apache2/sites-available/ragasa-collector.conf
```

貼上以下內容：
```apache
<VirtualHost *:8793>
    ServerName your-domain.com
    DocumentRoot /var/www/ragasa-collector/heroui

    # 反向代理到 Next.js
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # WebSocket 支援
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]

    # 安全標頭
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # 日誌
    ErrorLog ${APACHE_LOG_DIR}/ragasa-collector-error.log
    CustomLog ${APACHE_LOG_DIR}/ragasa-collector-access.log combined
</VirtualHost>
```

**重要**：確保 Apache 監聽 Port 8793

編輯 `/etc/apache2/ports.conf`：
```bash
sudo nano /etc/apache2/ports.conf
```

確保包含：
```apache
Listen 8793
```

啟用網站並重啟：
```bash
# 啟用網站
sudo a2ensite ragasa-collector

# 測試設定
sudo apache2ctl configtest

# 重啟 Apache
sudo systemctl restart apache2

# 檢查狀態
sudo systemctl status apache2
```

---

## 驗證部署

### 本機測試
```bash
# 1. 測試 Next.js
curl http://localhost:3000

# 2. 測試 Apache
curl http://localhost:8793

# 3. 檢查 PM2
pm2 status
pm2 logs ragasa-collector --lines 50
```

### 外部測試
```bash
# 從本機測試（替換成你的伺服器 IP）
curl http://YOUR_SERVER_IP:8793

# 或在瀏覽器開啟
http://YOUR_SERVER_IP:8793
```

---

## 更新部署

### 每次更新時執行

```bash
# SSH 到伺服器
ssh user@your-server

# 進入專案目錄
cd /var/www/ragasa-collector/heroui

# 拉取最新程式碼
git pull

# 安裝新的相依套件（如果 package.json 有變動）
npm install

# 重新建置
npm run build

# 重啟應用
pm2 restart ragasa-collector

# 查看日誌確認
pm2 logs ragasa-collector --lines 20
```

### 自動化部署腳本

建立 `deploy.sh`：
```bash
#!/bin/bash

set -e  # 遇到錯誤立即停止

echo "🚀 開始部署 Ragasa Collector..."

# 進入專案目錄
cd /var/www/ragasa-collector/heroui

# 拉取最新程式碼
echo "📦 拉取最新程式碼..."
git pull origin main

# 安裝相依套件
echo "📦 安裝相依套件..."
npm install --production=false

# 建置專案
echo "🔨 建置專案..."
npm run build

# 重啟 PM2
echo "🔄 重啟應用..."
pm2 restart ragasa-collector

# 等待 2 秒
sleep 2

# 查看狀態
echo "✅ 部署完成！當前狀態："
pm2 status

echo ""
echo "📊 最近日誌："
pm2 logs ragasa-collector --lines 20 --nostream

echo ""
echo "🌐 訪問網址: http://YOUR_SERVER_IP:8793"
```

使用方式：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 監控與日誌

### 查看 Apache 日誌
```bash
# 即時查看存取日誌
sudo tail -f /var/log/apache2/ragasa-collector-access.log

# 即時查看錯誤日誌
sudo tail -f /var/log/apache2/ragasa-collector-error.log
```

### 查看 PM2 日誌
```bash
# 即時查看所有日誌
pm2 logs ragasa-collector

# 只看錯誤
pm2 logs ragasa-collector --err

# 只看輸出
pm2 logs ragasa-collector --out
```

### 系統資源監控
```bash
# PM2 即時監控
pm2 monit

# 系統資源
htop
# 或
top
```

---

## 備份與還原

### 備份資料
```bash
# 備份專案（不含 node_modules）
cd /var/www/ragasa-collector
tar -czf ragasa-backup-$(date +%Y%m%d).tar.gz \
  --exclude='heroui/node_modules' \
  --exclude='heroui/.next' \
  heroui/

# 下載備份到本機
scp user@your-server:/var/www/ragasa-collector/ragasa-backup-*.tar.gz ~/Downloads/
```

### 還原
```bash
# 解壓備份
tar -xzf ragasa-backup-YYYYMMDD.tar.gz

# 安裝相依套件
cd heroui
npm install
npm run build
pm2 restart ragasa-collector
```

---

## 安全建議

### 1. 限制 .env 檔案權限
```bash
chmod 600 /var/www/ragasa-collector/heroui/.env.production
```

### 2. 設定檔案擁有者
```bash
# 假設使用 www-data 用戶
sudo chown -R www-data:www-data /var/www/ragasa-collector
```

### 3. 定期更新套件
```bash
# 每月執行一次
npm audit
npm update
```

---

## 完整部署檢查清單

- [ ] Node.js 已安裝且版本 >= 18.17
- [ ] PM2 已安裝
- [ ] Apache 已安裝並監聽 port 8793
- [ ] 專案已上傳到 `/var/www/ragasa-collector/heroui`
- [ ] `.env.production` 已建立且包含所有環境變數
- [ ] `npm install` 執行成功
- [ ] `npm run build` 執行成功
- [ ] PM2 啟動成功（`pm2 status` 顯示 online）
- [ ] Apache 反向代理設定完成
- [ ] Port 8793 防火牆已開放
- [ ] 可以從外部訪問 `http://YOUR_IP:8793`
- [ ] 登入功能正常
- [ ] 新建申請流程正常
- [ ] Ragic 同步正常
- [ ] OCR 功能正常

---

## 聯絡與支援

部署遇到問題？請提供：
1. 伺服器作業系統版本：`cat /etc/os-release`
2. Node.js 版本：`node --version`
3. PM2 狀態：`pm2 status`
4. Apache 錯誤日誌：`sudo tail -100 /var/log/apache2/error.log`
5. PM2 日誌：`pm2 logs ragasa-collector --lines 50`

---

**最後更新**: 2025-10-03
