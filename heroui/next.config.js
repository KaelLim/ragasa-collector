/** @type {import('next').NextConfig} */
const nextConfig = {
  // 只在生產環境使用 static export
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig;
