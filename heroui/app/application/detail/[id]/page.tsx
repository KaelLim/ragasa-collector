'use client'

import { use, useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { useTranslation } from 'react-i18next'
import { supabase, type DisasterApplication } from '@/lib/supabase'
import { getRagicImageUrl } from '@/lib/ragic-utils'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import Logo from '@/components/logo'
import MobileMenu from '@/components/MobileMenu'

function ApplicationDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t, i18n } = useTranslation()
  const [application, setApplication] = useState<DisasterApplication | null>(null)
  const [applicantName, setApplicantName] = useState<string>('')
  const [bankName, setBankName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetchApplicationDetail(id)
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

      // 從 Ragic 獲取詳細資訊
      const response = await fetch(`/api/ragic-detail?id=${applicationId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch from Ragic')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const ragicData = result.data

      // 轉換為 DisasterApplication 格式
      const enrichedData = {
        id: String(ragicData.ragicId),
        user_id: user.id,
        victim_name: ragicData.name || '',
        id_number: ragicData.idNumber || '',
        phone_number: null,
        address: ragicData.address || '',
        bank_code: '',
        bank_account: '',
        front_id_photo: ragicData.frontIdPhoto,
        back_id_photo: ragicData.backIdPhoto,
        status: 'submitted',
        created_at: ragicData.createdAt || new Date().toISOString(),
        updated_at: ragicData.updatedAt || new Date().toISOString(),
        // Ragic 特有欄位
        village: ragicData.village,
        cityDistrict: ragicData.cityDistrict,
        villageLi: ragicData.villageLi,
        householdDoc: ragicData.householdDoc,
        otherDocs: ragicData.otherDocs
      }

      setApplication(enrichedData as any)
      setApplicantName(ragicData.name || '')
      setBankName('')

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
    // 使用 Ragic 圖片 URL
    return getRagicImageUrl(path)
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
            <Button
              color="primary"
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                </svg>
              }
              onClick={() => {
                // 導向編輯頁面，帶上 Ragic ID
                router.push(`/application/edit/${id}`)
              }}
            >
              {i18n.language === 'zh-TW' ? '編輯申請' : 'Edit Application'}
            </Button>
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
                {/* 樺加沙編號 */}
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                  <span className="text-sm text-default-500">樺加沙編號：</span>
                  <span className="ml-2 font-mono text-lg font-bold text-primary">{application.village}</span>
                </div>

                {/* 個人資料文字 */}
                <div className="space-y-3">
                  <div>
                    <span className="text-default-500">姓名：</span>
                    <span className="ml-2 font-medium">{application.victim_name}</span>
                  </div>
                  <div>
                    <span className="text-default-500">身分證字號：</span>
                    <span className="ml-2 font-mono">{application.id_number}</span>
                  </div>
                </div>

                {/* 身分證地址 */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">戶籍地址（身分證）</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-default-500">縣市行政區：</span>
                      <span className="ml-2 text-sm">{application.cityDistrict || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-default-500">村/里：</span>
                      <span className="ml-2 text-sm">{application.villageLi || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-default-500">地址：</span>
                      <span className="ml-2 text-sm">{application.address || '-'}</span>
                    </div>
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

                {/* 戶籍謄本 */}
                {application.householdDoc && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">戶籍謄本</h3>
                    <div className="aspect-video bg-content2 rounded-lg overflow-hidden cursor-pointer">
                      <img
                        src={getImageUrl(application.householdDoc) || ''}
                        alt="戶籍謄本"
                        className="w-full h-full object-contain"
                        onClick={() => window.open(getImageUrl(application.householdDoc) || '', '_blank')}
                      />
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

          </div>

          {/* 側邊欄 */}
          <div className="space-y-6">
            {/* 其他佐證照片（含簽名）*/}
            {application.otherDocs && (() => {
              // 統一轉換為陣列
              const otherDocsArray = Array.isArray(application.otherDocs)
                ? application.otherDocs
                : [application.otherDocs]

              const validDocs = otherDocsArray.filter((f: any) => f && f !== '')

              return validDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-bold">其他佐證照片</h2>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {validDocs.map((file: string, index: number) => {
                        const filename = file.split('@')[1] || '文件'
                        return (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <div className="aspect-video bg-content2 cursor-pointer">
                              <img
                                src={getImageUrl(file) || ''}
                                alt={filename}
                                className="w-full h-full object-contain"
                                onClick={() => window.open(getImageUrl(file) || '', '_blank')}
                              />
                            </div>
                            <div className="p-2 bg-content1">
                              <p className="text-xs text-center text-default-600">{filename}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardBody>
                </Card>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ApplicationDetailClient params={params} />
}