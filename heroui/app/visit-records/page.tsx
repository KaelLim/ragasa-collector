'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/logo'
import MobileMenu from '@/components/MobileMenu'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'

export default function VisitRecordsPage() {
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Logo width={48} height={48} clickable={true} />
            <div>
              <h1 className="text-2xl font-bold">
                {i18n.language === 'zh-TW' ? '訪視紀錄' : 'Visit Records'}
              </h1>
              <p className="text-default-600 text-sm">
                {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button color="danger" variant="ghost" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <Logo width={40} height={40} clickable={true} />
          <MobileMenu showLogout={true} />
        </div>

        {/* 主要內容區域 */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold">
              {i18n.language === 'zh-TW' ? '訪視紀錄功能開發中' : 'Visit Records Feature Under Development'}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 text-center py-12">
              <div className="flex justify-center">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-warning opacity-50">
                  <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7M7.5,13.5L9,12L11,14L15.5,9.5L17,11L11,17L7.5,13.5Z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-default-700">
                {i18n.language === 'zh-TW' ? '功能即將推出' : 'Feature Coming Soon'}
              </h3>
              <p className="text-default-500 max-w-md mx-auto">
                {i18n.language === 'zh-TW'
                  ? '訪視紀錄功能正在開發中，敬請期待。您可以先使用其他功能。'
                  : 'Visit records feature is under development. Please stay tuned. You can use other features in the meantime.'}
              </p>
              <div className="pt-4">
                <Button
                  color="primary"
                  variant="flat"
                  onClick={() => router.push('/dashboard')}
                >
                  {i18n.language === 'zh-TW' ? '返回主控台' : 'Back to Dashboard'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 預留的功能說明區域 */}
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {i18n.language === 'zh-TW' ? '訪視紀錄功能規劃' : 'Visit Records Feature Plan'}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-default-600">
              <p className="font-medium">
                {i18n.language === 'zh-TW' ? '本功能預計包含：' : 'This feature will include:'}
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>{i18n.language === 'zh-TW' ? '訪視記錄建立與編輯' : 'Create and edit visit records'}</li>
                <li>{i18n.language === 'zh-TW' ? '訪視照片上傳' : 'Upload visit photos'}</li>
                <li>{i18n.language === 'zh-TW' ? '訪視結果記錄' : 'Record visit results'}</li>
                <li>{i18n.language === 'zh-TW' ? '與申請案件關聯' : 'Link to application cases'}</li>
                <li>{i18n.language === 'zh-TW' ? '訪視歷史查詢' : 'Query visit history'}</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
