'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@heroui/button'
import { Spinner } from '@heroui/spinner'
import { useTranslation } from 'react-i18next'
import Logo from '@/components/logo'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import MobileMenu from '@/components/MobileMenu'
import ApplicationDetailView from '@/components/ApplicationDetailView'
import { useApplicationDetail } from '@/hooks/useApplicationDetail'

function ApplicationDetailClient() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { t } = useTranslation()
  const router = useRouter()

  const { application, loading, error } = useApplicationDetail(id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="ml-3">載入中...</p>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-danger text-lg mb-4">{error || '找不到申請記錄'}</p>
        <Button color="primary" onClick={() => router.push('/dashboard')}>
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-divider p-3 md:p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo />
            <h1 className="text-lg md:text-xl font-bold">申請詳情</h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              size="sm"
              variant="light"
              onClick={() => router.push('/dashboard')}
            >
              ← 返回列表
            </Button>
          </div>

          <ApplicationDetailView application={application} />
        </div>
      </div>
    </div>
  )
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    }>
      <ApplicationDetailClient />
    </Suspense>
  )
}
