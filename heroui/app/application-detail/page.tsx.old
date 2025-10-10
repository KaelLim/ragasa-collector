'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { useTranslation } from 'react-i18next'
import { supabase, type DisasterApplication } from '@/lib/supabase'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import Logo from '@/components/logo'
import MobileMenu from '@/components/MobileMenu'

function ApplicationDetailClient() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { t, i18n } = useTranslation()
  const [application, setApplication] = useState<DisasterApplication | null>(null)
  const [applicantName, setApplicantName] = useState<string>('')
  const [bankName, setBankName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (id) {
      fetchApplicationDetail(id)
    }
  }, [id])

  const fetchApplicationDetail = async (applicationId: string) => {
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      setCurrentUser(user)

      // 獲取申請詳細資訊
      const { data, error: fetchError } = await supabase
        .from('disaster_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      setApplication(data)

      // 設定申請人名稱
      setApplicantName(data.victim_name)

      // 查詢銀行名稱
      if (data.bank_code) {
        const { data: bankData, error: bankError } = await supabase
          .from('bank_codes')
          .select('name')
          .eq('code', data.bank_code)
          .limit(1)
          .single()

        if (bankData && !bankError) {
          setBankName(bankData.name)
        }
      }

    } catch (err) {
      console.error('Error fetching application detail:', err)
      setError(i18n.language === 'zh-TW' ? '載入申請詳情失敗' : 'Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'warning'
      case 'reviewed': return 'primary'
      case 'approved': return 'success'
      case 'rejected': return 'danger'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      'submitted': i18n.language === 'zh-TW' ? '已提交' : 'Submitted',
      'reviewed': i18n.language === 'zh-TW' ? '審核中' : 'Under Review',
      'approved': i18n.language === 'zh-TW' ? '已核准' : 'Approved',
      'rejected': i18n.language === 'zh-TW' ? '已拒絕' : 'Rejected'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return data.publicUrl
  }

  const isOwner = currentUser && application && application.user_id === currentUser.id

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p>{i18n.language === 'zh-TW' ? '載入中...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody className="text-center space-y-4">
            <h2 className="text-xl font-bold text-danger">
              {i18n.language === 'zh-TW' ? '載入失敗' : 'Loading Failed'}
            </h2>
            <p className="text-default-600">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={() => router.push('/applications')}>
                {i18n.language === 'zh-TW' ? '返回列表' : 'Back to List'}
              </Button>
              <Button color="primary" onClick={() => id && fetchApplicationDetail(id)}>
                {i18n.language === 'zh-TW' ? '重新載入' : 'Retry'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Logo width={48} height={48} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {i18n.language === 'zh-TW' ? '申請詳情' : 'Application Details'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button
              variant="ghost"
              onClick={() => router.push('/applications')}
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                </svg>
              }
            >
              {i18n.language === 'zh-TW' ? '返回列表' : 'Back to List'}
            </Button>
            {isOwner && application.status === 'submitted' && (
              <Button
                color="primary"
                startContent={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                  </svg>
                }
                onClick={() => {
                  // 編輯功能（後續開發）
                  console.log('Edit application:', application.id)
                }}
              >
                {i18n.language === 'zh-TW' ? '編輯申請' : 'Edit Application'}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <Logo width={40} height={40} />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/applications')}
              className="px-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
            </Button>
            <MobileMenu showLogout={true} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主要資訊 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 個人資料 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">
                  {i18n.language === 'zh-TW' ? '個人資料' : 'Personal Information'}
                </h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* 個人資料文字 */}
                <div className="space-y-3">
                  <div>
                    <span className="text-default-500">{i18n.language === 'zh-TW' ? '姓名' : 'Name'}：</span>
                    <span className="ml-2 font-medium">{application.victim_name}</span>
                  </div>
                  <div>
                    <span className="text-default-500">{i18n.language === 'zh-TW' ? '身分證字號' : 'ID Number'}：</span>
                    <span className="ml-2 font-mono">{application.id_number}</span>
                  </div>
                  <div>
                    <span className="text-default-500">{i18n.language === 'zh-TW' ? '聯絡電話' : 'Phone'}：</span>
                    <span className="ml-2">{application.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-default-500">{i18n.language === 'zh-TW' ? '居住地址' : 'Address'}：</span>
                    <span className="ml-2">{application.address}</span>
                  </div>
                </div>

                {/* 身分證圖片 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {i18n.language === 'zh-TW' ? '身分證正面 & 身分證反面' : 'ID Front & Back'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">{i18n.language === 'zh-TW' ? '身分證正面' : 'ID Front'}</h4>
                      {application.front_id_photo ? (
                        <div className="aspect-video bg-content2 rounded-lg overflow-hidden cursor-pointer">
                          <img
                            src={getImageUrl(application.front_id_photo) || ''}
                            alt="身分證正面"
                            className="w-full h-full object-cover"
                            onClick={() => window.open(getImageUrl(application.front_id_photo) || '', '_blank')}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-default-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-default-400">{i18n.language === 'zh-TW' ? '未上傳' : 'Not uploaded'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">{i18n.language === 'zh-TW' ? '身分證反面' : 'ID Back'}</h4>
                      {application.back_id_photo ? (
                        <div className="aspect-video bg-content2 rounded-lg overflow-hidden cursor-pointer">
                          <img
                            src={getImageUrl(application.back_id_photo) || ''}
                            alt="身分證反面"
                            className="w-full h-full object-cover"
                            onClick={() => window.open(getImageUrl(application.back_id_photo) || '', '_blank')}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-default-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-default-400">{i18n.language === 'zh-TW' ? '未上傳' : 'Not uploaded'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 銀行資訊 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">
                  {i18n.language === 'zh-TW' ? '銀行資訊' : 'Bank Information'}
                </h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 銀行資料文字 */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-default-500">{i18n.language === 'zh-TW' ? '銀行代碼' : 'Bank Code'}：</span>
                      <span className="ml-2 font-mono">{application.bank_code}</span>
                    </div>
                    <div>
                      <span className="text-default-500">{i18n.language === 'zh-TW' ? '銀行帳號' : 'Account'}：</span>
                      <span className="ml-2 font-mono">{application.bank_account}</span>
                    </div>
                  </div>

                  {/* 銀行帳簿圖片 */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">{i18n.language === 'zh-TW' ? '銀行帳簿' : 'Bank Account Book'}</h4>
                    {application.bank_photo ? (
                      <div className="aspect-video bg-content2 rounded-lg overflow-hidden cursor-pointer">
                        <img
                          src={getImageUrl(application.bank_photo) || ''}
                          alt="銀行帳簿"
                          className="w-full h-full object-cover"
                          onClick={() => window.open(getImageUrl(application.bank_photo) || '', '_blank')}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-default-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-default-400">{i18n.language === 'zh-TW' ? '未上傳' : 'Not uploaded'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 側邊欄 - 電子簽名 */}
          <div>
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">
                  {i18n.language === 'zh-TW' ? '電子簽名' : 'Electronic Signature'}
                </h2>
              </CardHeader>
              <CardBody>
                {application.signature ? (
                  <div className="aspect-video bg-white rounded-lg overflow-hidden cursor-pointer border">
                    <img
                      src={getImageUrl(application.signature) || ''}
                      alt="電子簽名"
                      className="w-full h-full object-contain"
                      onClick={() => window.open(getImageUrl(application.signature) || '', '_blank')}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-default-100 rounded-lg flex items-center justify-center">
                    <span className="text-default-400">{i18n.language === 'zh-TW' ? '未完成簽名' : 'Signature not completed'}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ApplicationDetailClient />
    </Suspense>
  )
}