/** @type {import('next').NextConfig} */
const nextConfig = {
  // 伺服器端渲染模式（支援動態功能）
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig;
