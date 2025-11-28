/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export'，改為 Server 模式以支援內網服務
  // output: 'export',  // 已停用靜態輸出
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // 生產環境配置
  poweredByHeader: false,  // 隱藏 X-Powered-By header
}

module.exports = nextConfig;
