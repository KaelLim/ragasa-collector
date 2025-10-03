/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用動態模式（支援 API Routes 和 SSR）
  // output: 'export',  // ⚠️ 不要取消註解，會導致 API Routes 無法運作
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig;
