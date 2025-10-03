'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { Tabs, Tab } from '@heroui/tabs'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table'
import { Pagination } from '@heroui/pagination'
import { Select, SelectItem } from '@heroui/select'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { supabase, type DisasterApplication } from '@/lib/supabase'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import Logo from '@/components/logo'
import MobileMenu from '@/components/MobileMenu'

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation()
  const [allApplications, setAllApplications] = useState<DisasterApplication[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const router = useRouter()

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      setCurrentUser(user)

      // 從 Ragic 讀取所有申請記錄（使用 limit）
      const response = await fetch('/api/ragic-list?limit=100')

      if (response.ok) {
        const result = await response.json()

        if (result.success) {
          console.log('從 Ragic 載入記錄:', result.total, '筆')

          // 轉換 Ragic 資料為 DisasterApplication 格式
          const ragicData = result.records.map((record: any) => ({
            id: String(record.ragicId),
            user_id: user.id,
            victim_name: record.name || '',
            id_number: record.idNumber || '',
            phone_number: null,
            address: record.address || '',
            bank_code: '',
            bank_account: '',
            status: 'submitted',
            created_at: record.updatedAt || new Date().toISOString(),
            updated_at: record.updatedAt || new Date().toISOString(),
            // 新增樺加沙編號
            village: record.village
          }))

          setAllApplications(ragicData)

        } else {
          throw new Error(result.error)
        }
      } else {
        throw new Error('Failed to fetch from Ragic')
      }

    } catch (err) {
      console.error('Error fetching applications:', err)
      setError(i18n.language === 'zh-TW' ? '載入申請記錄失敗' : 'Failed to load application records')
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
      minute: '2-digit'
    })
  }

  // 分頁邏輯
  const getCurrentPageData = (applications: DisasterApplication[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return applications.slice(startIndex, endIndex)
  }

  const getTotalPages = (applications: DisasterApplication[]) => {
    return Math.ceil(applications.length / itemsPerPage)
  }

  const renderApplicationList = (applications: DisasterApplication[], canEdit: boolean) => {
    if (applications.length === 0) {
      return (
        <Card className="text-center py-12">
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-default-300">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-default-600">
                {i18n.language === 'zh-TW' ? '尚無申請記錄' : 'No Applications Yet'}
              </h3>
              <p className="text-default-500">
                {canEdit
                  ? (i18n.language === 'zh-TW' ? '您還沒有提交任何申請' : 'You haven\'t submitted any applications yet')
                  : (i18n.language === 'zh-TW' ? '團隊尚無申請記錄' : 'No team applications yet')
                }
              </p>
              {canEdit && (
                <Button
                  color="primary"
                  onClick={() => router.push('/application/new')}
                  startContent={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </svg>
                  }
                >
                  {i18n.language === 'zh-TW' ? '開始申請' : 'Start Application'}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )
    }

    const paginatedData = getCurrentPageData(applications)
    const totalPages = getTotalPages(applications)

    return (
      <div className="space-y-6">
        {/* 視圖控制 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* 視圖切換 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === 'card' ? 'solid' : 'ghost'}
                color={viewMode === 'card' ? 'primary' : 'default'}
                onClick={() => setViewMode('card')}
                startContent={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9,5V9H21V5M9,19H21V15H9M9,14H21V10H9M4,9H8V5H4M4,19H8V15H4M4,14H8V10H4V14Z" />
                  </svg>
                }
              >
                {i18n.language === 'zh-TW' ? '卡片' : 'Cards'}
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'solid' : 'ghost'}
                color={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
                startContent={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,8V12H11V8H5M13,8V12H19V8H13M5,14V18H11V14H5M13,14V18H19V14H13Z" />
                  </svg>
                }
              >
                {i18n.language === 'zh-TW' ? '表格' : 'Table'}
              </Button>
            </div>

            {/* 每頁項目數選擇 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-default-500">
                {i18n.language === 'zh-TW' ? '每頁顯示' : 'Show'}:
              </span>
              <Select
                size="sm"
                className="w-20"
                aria-label={i18n.language === 'zh-TW' ? '每頁顯示項目數' : 'Items per page'}
                selectedKeys={[itemsPerPage.toString()]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string
                  setItemsPerPage(parseInt(value))
                  setCurrentPage(1) // 重置到第一頁
                }}
              >
                <SelectItem key="10">10</SelectItem>
                <SelectItem key="25">25</SelectItem>
                <SelectItem key="50">50</SelectItem>
              </Select>
            </div>
          </div>

          <div className="text-sm text-default-500">
            {i18n.language === 'zh-TW' ? '總計' : 'Total'}: {applications.length} {i18n.language === 'zh-TW' ? '筆申請' : 'applications'}
          </div>
        </div>

        {/* 內容渲染 */}
        {viewMode === 'card' ? renderCardView(paginatedData, canEdit) : renderTableView(paginatedData, canEdit)}

        {/* 分頁控制 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              total={totalPages}
              page={currentPage}
              onChange={setCurrentPage}
              showControls
              color="primary"
            />
          </div>
        )}
      </div>
    )
  }

  // 卡片視圖
  const renderCardView = (applications: DisasterApplication[], canEdit: boolean) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {applications.map((application) => {
          const isOwner = currentUser && application.user_id === currentUser.id

          return (
            <Card
              key={application.id}
              className="hover:shadow-lg transition-shadow border-2 hover:border-primary"
            >
              <CardHeader className="pb-3">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold">{application.victim_name}</h3>
                    <Chip color="primary" variant="flat" size="sm" className="font-mono">
                      {application.village}
                    </Chip>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-default-400">
                      <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                    <span className="text-default-500">身分證：</span>
                    <span className="font-mono">{application.id_number || '-'}</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-default-400 mt-0.5">
                      <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-default-500">地址：</span>
                      <span className="ml-1">{application.address || '-'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-xs text-default-400">
                      {formatDate(application.updated_at)}
                    </span>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onClick={() => router.push(`/application/detail/${application.id}`)}
                      endContent={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                        </svg>
                      }
                    >
                      查看詳情
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    )
  }

  // 表格視圖
  const renderTableView = (applications: DisasterApplication[], canEdit: boolean) => {
    return (
      <Table
        aria-label="申請記錄表格"
        isStriped
        classNames={{
          table: "min-h-[400px]",
        }}
      >
        <TableHeader>
          <TableColumn>樺加沙編號</TableColumn>
          <TableColumn>姓名</TableColumn>
          <TableColumn>身分證</TableColumn>
          <TableColumn>地址</TableColumn>
          <TableColumn>操作</TableColumn>
        </TableHeader>
        <TableBody>
          {applications.map((application) => {
            const isOwner = currentUser && application.user_id === currentUser.id

            return (
              <TableRow key={application.id}>
                <TableCell>
                  <Chip color="primary" variant="flat" size="sm" className="font-mono">
                    {application.village}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{application.victim_name}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{application.id_number || '-'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{application.address || '-'}</span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    onClick={() => router.push(`/application/detail/${application.id}`)}
                    startContent={
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                      </svg>
                    }
                  >
                    {i18n.language === 'zh-TW' ? '查看' : 'View'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Logo width={48} height={48} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {i18n.language === 'zh-TW' ? '申請記錄' : 'Application Records'}
              </h1>
              <p className="text-default-600">
                {i18n.language === 'zh-TW' ? '查看您的申請歷史記錄' : 'View your application history'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                </svg>
              }
            >
              {i18n.language === 'zh-TW' ? '返回首頁' : 'Back to Home'}
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
              onClick={() => router.push('/dashboard')}
              className="px-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
            </Button>
            <MobileMenu showLogout={true} />
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <Card className="mb-6 border-danger">
            <CardBody>
              <p className="text-danger">{error}</p>
              <Button
                size="sm"
                color="danger"
                variant="light"
                onClick={fetchApplications}
                className="mt-2"
              >
                {i18n.language === 'zh-TW' ? '重新載入' : 'Retry'}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* 所有申請記錄 */}
        {renderApplicationList(allApplications, false)}

        {/* 新增申請按鈕 */}
        <div className="fixed bottom-8 right-8">
          <Button
            color="primary"
            size="lg"
            className="shadow-2xl"
            onClick={() => router.push('/application/new')}
            startContent={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            }
          >
            {i18n.language === 'zh-TW' ? '新增申請' : 'New Application'}
          </Button>
        </div>
      </div>
    </div>
  )
}