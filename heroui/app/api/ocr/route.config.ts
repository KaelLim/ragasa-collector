// Next.js API Route 配置
// 增加執行時間限制以支援 OCR 處理

export const runtime = 'nodejs'
export const maxDuration = 120 // 120 秒 (適用於 Vercel Pro)
