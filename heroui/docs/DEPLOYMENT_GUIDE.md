# 慈濟災害個人資料收集系統 - 部署指南

## 目錄
- [方案一：Vercel 部署（推薦）](#方案一vercel-部署推薦)
- [方案二：VPS/雲端伺服器部署](#方案二vps雲端伺服器部署)
- [方案三：Docker 部署](#方案三docker-部署)
- [環境變數設定](#環境變數設定)
- [部署後檢查清單](#部署後檢查清單)

---

## 方案一：Vercel 部署（推薦）

### 優點
- ✅ 零配置，自動優化
- ✅ 免費方案足夠使用
- ✅ 自動 HTTPS
- ✅ 全球 CDN
- ✅ 自動從 Git 部署

### 步驟

#### 1. 準備 Git Repository
```bash
cd /Users/kael/Desktop/website/ragasa-collector/heroui

# 初始化 git（如果還沒有）
git init
git add .
git commit -m "Initial commit for deployment"

# 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/ragasa-collector.git
git branch -M main
git push -u origin main
```

#### 2. 部署到 Vercel
1. 前往 https://vercel.com
2. 使用 GitHub 帳號登入
3. 點擊 **New Project**
4. 選擇你的 GitHub repository: `ragasa-collector`
5. **Root Directory** 設為 `heroui`
6. 設定環境變數（見下方）
7. 點擊 **Deploy**

#### 3. 設定環境變數
在 Vercel Project Settings → Environment Variables 中加入：

```env
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTAzNDg4MDAsImV4cCI6MTkwODExNTIwMH0.OtlmhR0M9VRnIljImzpXuTX0VkHBsmRP28qqqF-UQKM
NEXT_PUBLIC_XINFERENCE_API_URL=https://tcm3studio.tzuchi-org.tw/v1
NEXT_PUBLIC_XINFERENCE_API_KEY=sk-TzDigital-94800552
NEXT_PUBLIC_XINFERENCE_MODEL_ID=qwen2.5-vl-instruct
RAGIC_API_KEY=cWl5VlRWQjJ4ZGJScllaVG5PMFNYM3FGc1VsM2hTVU9jbVFBZ0tGWFVSMFFZOVFqcUdVT25GUEZtd3JDUzA1eFN4RjNPdDJQZTdNPQ==
RAGIC_BASE_URL=https://ap11.ragic.com/TCTCharity/4-20252
```

#### 4. 完成
- Vercel 會自動建置並部署
- 部署網址：`https://your-project.vercel.app`
- 之後每次 push 到 GitHub 都會自動重新部署

---

## 方案二：VPS/雲端伺服器部署

### 系統需求
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Node.js 18.17+
- PM2（用於行程管理）
- Nginx（用於反向代理）

### 步驟

#### 1. 安裝 Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
node --version  # 應該 >= 18.17
npm --version
```

#### 2. 安裝 PM2
```bash
sudo npm install -g pm2
```

#### 3. 上傳專案到伺服器
```bash
# 在本機
cd /Users/kael/Desktop/website/ragasa-collector
scp -r heroui user@your-server:/var/www/ragasa-collector

# 或使用 Git
ssh user@your-server
cd /var/www
git clone https://github.com/YOUR_USERNAME/ragasa-collector.git
cd ragasa-collector/heroui
```

#### 4. 安裝相依套件並建置
```bash
cd /var/www/ragasa-collector/heroui

# 安裝相依套件
npm install

# 建立 .env.local（或 .env.production）
nano .env.local
# 貼上環境變數（見下方）

# 建置專案
npm run build
```

#### 5. 使用 PM2 啟動
```bash
# 啟動應用
pm2 start npm --name "ragasa-collector" -- start

# 設定開機自動啟動
pm2 startup
pm2 save

# 查看狀態
pm2 status
pm2 logs ragasa-collector
```

#### 6. 設定 Nginx 反向代理
```bash
sudo nano /etc/nginx/sites-available/ragasa-collector
```

加入以下設定：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

啟用網站：
```bash
sudo ln -s /etc/nginx/sites-available/ragasa-collector /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. 設定 SSL (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 方案三：Docker 部署

### 1. 建立 Dockerfile
```dockerfile
FROM node:20-alpine AS base

# 安裝相依套件
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 建置應用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 執行應用
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. 建立 docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

### 3. 部署
```bash
# 建置
docker-compose build

# 啟動
docker-compose up -d

# 查看 logs
docker-compose logs -f
```

---

## 環境變數設定

### 必要變數（.env.local 或 .env.production）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sberelieffundpj.tzuchi-org.tw
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OCR 服務
NEXT_PUBLIC_XINFERENCE_API_URL=https://tcm3studio.tzuchi-org.tw/v1
NEXT_PUBLIC_XINFERENCE_API_KEY=sk-TzDigital-94800552
NEXT_PUBLIC_XINFERENCE_MODEL_ID=qwen2.5-vl-instruct

# Ragic API
RAGIC_API_KEY=your_ragic_api_key_here
RAGIC_BASE_URL=https://ap11.ragic.com/TCTCharity/4-20252
```

⚠️ **安全提醒**：
- 絕對不要將 `.env.local` 或 `.env.production` 推送到 Git
- 已加入 `.gitignore`，請確認

---

## 部署後檢查清單

### 1. 基本功能測試
- [ ] 登入功能正常
- [ ] 新建申請流程完整
- [ ] 編輯申請功能正常
- [ ] 查看申請詳情正常
- [ ] 下載功能正常

### 2. API 測試
- [ ] OCR 圖片識別正常
- [ ] Ragic 同步正常
- [ ] 大量註冊 API 可用

### 3. 效能檢查
- [ ] 首頁載入時間 < 3 秒
- [ ] 圖片上傳速度正常
- [ ] 列表頁面載入正常

### 4. 安全檢查
- [ ] HTTPS 已啟用
- [ ] 環境變數未暴露
- [ ] Supabase RLS 政策正確
- [ ] API 端點受保護

### 5. 監控設定
- [ ] 設定錯誤追蹤（如 Sentry）
- [ ] 設定 uptime 監控
- [ ] 設定備份機制

---

## 常見問題

### Q: Next.js 建置失敗
```bash
# 清除快取重新建置
rm -rf .next node_modules
npm install
npm run build
```

### Q: 環境變數沒有生效
- Vercel: 重新部署（Deployments → Redeploy）
- VPS: 重啟 PM2 (`pm2 restart ragasa-collector`)
- Docker: 重新建置 (`docker-compose down && docker-compose up -d --build`)

### Q: Port 3000 已被佔用
```bash
# 找出佔用的行程
lsof -ti:3000

# 終止行程
kill -9 $(lsof -ti:3000)

# 或更改 port
PORT=3001 npm start
```

### Q: Nginx 502 Bad Gateway
```bash
# 檢查 Next.js 是否執行
pm2 status

# 檢查 Nginx 設定
sudo nginx -t

# 查看 Nginx 錯誤日誌
sudo tail -f /var/log/nginx/error.log
```

---

## 效能最佳化建議

### 1. 啟用壓縮（Nginx）
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 2. 設定快取
```nginx
location /_next/static {
    alias /var/www/ragasa-collector/heroui/.next/static;
    expires 1y;
    access_log off;
}
```

### 3. 增加 Node.js 記憶體（如果需要）
```bash
# PM2
pm2 start npm --name "ragasa-collector" --node-args="--max-old-space-size=2048" -- start
```

---

## 更新部署

### Vercel
```bash
# 推送到 GitHub 即可自動部署
git add .
git commit -m "Update features"
git push
```

### VPS
```bash
# SSH 到伺服器
ssh user@your-server
cd /var/www/ragasa-collector/heroui

# 拉取最新程式碼
git pull

# 安裝新的相依套件（如果有）
npm install

# 重新建置
npm run build

# 重啟應用
pm2 restart ragasa-collector
```

---

## 監控與維護

### PM2 常用指令
```bash
pm2 status                    # 查看狀態
pm2 logs ragasa-collector    # 查看日誌
pm2 restart ragasa-collector # 重啟應用
pm2 stop ragasa-collector    # 停止應用
pm2 monit                    # 即時監控
```

### 日誌管理
```bash
# PM2 日誌輪替
pm2 install pm2-logrotate

# 查看最近的錯誤
pm2 logs ragasa-collector --err --lines 100
```

---

## 備份建議

### 1. Supabase 資料備份
- 定期匯出資料庫（Supabase Dashboard → Database → Backups）
- 設定自動備份

### 2. 程式碼備份
- 使用 Git 版本控制
- 定期推送到遠端 repository

### 3. Ragic 資料
- Ragic 有內建備份機制
- 定期匯出重要資料

---

## 聯絡資訊

如有部署問題，請提供：
1. 伺服器類型和作業系統
2. 錯誤訊息完整內容
3. 瀏覽器 Console 錯誤
4. 伺服器端日誌

---

**最後更新**: 2025-10-03
