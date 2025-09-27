import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'

const resources = {
  en: {
    translation: en
  },
  'zh-TW': {
    translation: zhTW
  }
}

// 獲取瀏覽器語言偏好
const getBrowserLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language || navigator.languages?.[0]
    if (browserLang?.startsWith('zh')) {
      return 'zh-TW'
    }
    return 'en'
  }
  return 'zh-TW'
}

// 從 localStorage 獲取語言設定，如果沒有則使用瀏覽器偏好
const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
      return savedLanguage
    }
    return getBrowserLanguage()
  }
  return 'zh-TW' // SSR 預設語言
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  })

// 監聽語言變化並保存到 localStorage
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lng)
  }
})

export default i18n