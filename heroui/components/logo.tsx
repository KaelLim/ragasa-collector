'use client'

import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface LogoProps {
  className?: string
  width?: number
  height?: number
  clickable?: boolean
}

// Fallback SVG logo
const FallbackLogo = ({ width, height }: { width: number; height: number }) => (
  <svg width={width} height={height} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="currentColor" className="text-primary" opacity="0.1"/>
    <path
      d="M24 8C16.268 8 10 14.268 10 22s6.268 14 14 14 14-6.268 14-14S31.732 8 24 8zm0 6c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8z"
      fill="currentColor"
      className="text-primary"
    />
    <path
      d="M24 18v8m-4-4h8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-primary"
    />
  </svg>
)

export default function Logo({ className = "", width = 40, height = 40, clickable = true }: LogoProps) {
  const { theme } = useTheme()
  const { i18n } = useTranslation()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // 根據主題選擇 favicon 路徑（使用絕對路徑）
  const iconPath = theme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg'

  // 根據語言顯示不同標題
  const logoText = i18n.language === 'zh-TW' ? '慈濟救災系統' : 'TC Disaster System'

  const handleClick = () => {
    if (clickable) {
      router.push('/dashboard')
    }
  }

  return (
    <div
      className={`flex items-center gap-2 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={handleClick}
    >
      {!imageError ? (
        <img
          src={iconPath}
          alt={logoText}
          width={width}
          height={height}
          className="object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <FallbackLogo width={width} height={height} />
      )}
      <span className="font-bold text-lg text-foreground">{logoText}</span>
    </div>
  )
}