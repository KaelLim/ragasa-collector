'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/logo'
import MobileMenu from '@/components/MobileMenu'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import { useVisitRecord } from '@/hooks/useVisitRecord'
import type { PendingVisitCase } from '@/lib/visit-record-types'

export default function VisitRecordsListPage() {
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pendingCases, setPendingCases] = useState<PendingVisitCase[]>([])
  const router = useRouter()
  const { fetchPendingVisitCases, loading: fetchLoading } = useVisitRecord()

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

  useEffect(() => {
    if (user) {
      loadPendingCases()
    }
  }, [user])

  const loadPendingCases = async () => {
    try {
      const cases = await fetchPendingVisitCases()
      setPendingCases(cases)
    } catch (error) {
      console.error('Failed to load pending visit cases:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleStartVisit = (applicationId: string) => {
    router.push(`/visit-records/new?applicationId=${applicationId}`)
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

        {/* 待訪視案件列表 */}
        <Card className="mt-6">
          <CardHeader className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                {i18n.language === 'zh-TW' ? '待訪視案件列表' : 'Pending Visit Cases'}
              </h2>
              <p className="text-sm text-default-500 mt-1">
                {i18n.language === 'zh-TW'
                  ? `共 ${pendingCases.length} 個案件尚未建立訪視紀錄`
                  : `${pendingCases.length} cases pending visit record`}
              </p>
            </div>
            <Button
              color="success"
              variant="flat"
              onClick={() => router.push('/visit-records/completed')}
            >
              {i18n.language === 'zh-TW' ? '查看已完成' : 'View Completed'}
            </Button>
          </CardHeader>
          <CardBody>
            {fetchLoading && (
              <div className="text-center py-12">
                <div className="text-default-500">
                  {i18n.language === 'zh-TW' ? '載入中...' : 'Loading...'}
                </div>
              </div>
            )}

            {!fetchLoading && pendingCases.length === 0 && (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-success opacity-50">
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-default-700 mb-2">
                  {i18n.language === 'zh-TW' ? '太棒了！' : 'Great!'}
                </h3>
                <p className="text-default-500">
                  {i18n.language === 'zh-TW'
                    ? '所有申請案件都已完成訪視紀錄'
                    : 'All application cases have completed visit records'}
                </p>
              </div>
            )}

            {!fetchLoading && pendingCases.length > 0 && (
              <div className="space-y-4">
                {/* 桌面版：表格 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-default-200">
                        <th className="text-left py-3 px-4 font-semibold text-default-700">
                          {i18n.language === 'zh-TW' ? '申請人姓名' : 'Applicant Name'}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-default-700">
                          {i18n.language === 'zh-TW' ? '申請編號' : 'Application No.'}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-default-700">
                          {i18n.language === 'zh-TW' ? '地址' : 'Address'}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-default-700">
                          {i18n.language === 'zh-TW' ? '操作' : 'Action'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCases.map((case_) => (
                        <tr
                          key={case_.application_id}
                          className="border-b border-default-100 hover:bg-default-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="font-medium text-default-900">
                              {case_.victim_name}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm text-default-700">
                              {case_.application_number}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-default-600">
                              {case_.address}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              color="warning"
                              size="sm"
                              onClick={() => handleStartVisit(case_.application_id)}
                            >
                              {i18n.language === 'zh-TW' ? '開始訪視' : 'Start Visit'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 手機版：卡片 */}
                <div className="md:hidden space-y-4">
                  {pendingCases.map((case_) => (
                    <Card
                      key={case_.application_id}
                      className="border-2 border-default-200 hover:border-warning transition-colors"
                      isPressable
                      onClick={() => handleStartVisit(case_.application_id)}
                    >
                      <CardBody className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-lg text-default-900">
                                {case_.victim_name}
                              </span>
                              <Chip size="sm" color="warning" variant="flat">
                                {i18n.language === 'zh-TW' ? '待訪視' : 'Pending'}
                              </Chip>
                            </div>
                            <p className="text-xs text-default-500 font-mono">
                              {i18n.language === 'zh-TW' ? '編號' : 'No.'}: {case_.application_number}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-default-400 mt-0.5 flex-shrink-0">
                              <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                            </svg>
                            <span className="text-sm text-default-600">
                              {case_.address}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button
                            color="warning"
                            size="sm"
                            endContent={
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                              </svg>
                            }
                          >
                            {i18n.language === 'zh-TW' ? '開始訪視' : 'Start Visit'}
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 說明卡片 */}
        {pendingCases.length > 0 && (
          <Card className="mt-6 bg-warning-50">
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-warning-600 flex-shrink-0">
                  <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                </svg>
                <div className="text-sm text-warning-800">
                  <p className="font-semibold mb-1">
                    {i18n.language === 'zh-TW' ? '操作說明' : 'Instructions'}
                  </p>
                  <p>
                    {i18n.language === 'zh-TW'
                      ? '點擊「開始訪視」按鈕，進入訪視紀錄表單，填寫完整的訪視資料。每個申請案件只能建立一次訪視紀錄。'
                      : 'Click "Start Visit" button to enter the visit record form and fill in complete visit information. Each application case can only create one visit record.'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
