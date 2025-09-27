'use client'

import { Button } from '@heroui/button'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh-TW' ? 'en' : 'zh-TW'
    i18n.changeLanguage(newLang)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="min-w-0 px-3 text-foreground"
      onClick={toggleLanguage}
      aria-label="Toggle language"
    >
      {i18n.language === 'zh-TW' ? 'EN' : '繁'}
    </Button>
  )
}