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
  const [myApplications, setMyApplications] = useState<DisasterApplication[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('team')
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

      // 獲取所有申請記錄（團隊視圖）
      const { data: allData, error: allError } = await supabase
        .from('disaster_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<DisasterApplication[]>()

      if (allError) {
        console.log('RLS 限制：無法查看團隊記錄', allError)
        setAllApplications([]) // 設為空陣列
      } else {
        console.log('團隊記錄查詢成功:', allData?.length)
        setAllApplications(allData || [])
      }

      // 獲取個人申請記錄
      const { data: myData, error: myError } = await supabase
        .from('disaster_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .returns<DisasterApplication[]>()

      if (myError) {
        throw myError
      }

      setMyApplications(myData || [])

      // 如果沒有團隊權限，預設顯示個人記錄
      if (allError) {
        setActiveTab('personal')
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
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
              isPressable
              onClick={() => router.push(`/application-detail?id=${application.id}`)}
            >
              <CardHeader className="flex flex-row justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{application.victim_name}</h3>
                    {canEdit && isOwner && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-default-500 font-mono">
                    {i18n.language === 'zh-TW' ? '申請編號' : 'Application ID'}: {application.id}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Chip color={getStatusColor(application.status)} size="sm">
                    {getStatusText(application.status)}
                  </Chip>
                  {!canEdit && (
                    <div className="text-right">
                      <p className="text-xs text-default-400 mb-1">
                        {i18n.language === 'zh-TW' ? '申請人' : 'Applicant'}
                      </p>
                      <p className="text-xs font-medium">
                        {application.victim_name}
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-default-500">
                        {i18n.language === 'zh-TW' ? '身分證' : 'ID'}:
                      </span>
                      <span className="ml-2">{application.id_number}</span>
                    </div>
                    <div>
                      <span className="text-default-500">
                        {i18n.language === 'zh-TW' ? '電話' : 'Phone'}:
                      </span>
                      <span className="ml-2">{application.phone_number}</span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-default-500">
                      {i18n.language === 'zh-TW' ? '地址' : 'Address'}:
                    </span>
                    <span className="ml-2">{application.address}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-divider">
                    <span className="text-xs text-default-400">
                      {i18n.language === 'zh-TW' ? '提交時間' : 'Submitted'}: {formatDate(application.created_at)}
                    </span>
                    <div className="flex gap-1">
                      {application.front_id_photo && (
                        <div className="w-2 h-2 bg-success rounded-full" title={i18n.language === 'zh-TW' ? '身分證正面' : 'ID Front'}></div>
                      )}
                      {application.back_id_photo && (
                        <div className="w-2 h-2 bg-success rounded-full" title={i18n.language === 'zh-TW' ? '身分證反面' : 'ID Back'}></div>
                      )}
                      {application.bank_photo && (
                        <div className="w-2 h-2 bg-success rounded-full" title={i18n.language === 'zh-TW' ? '銀行證明' : 'Bank Proof'}></div>
                      )}
                      {application.signature && (
                        <div className="w-2 h-2 bg-success rounded-full" title={i18n.language === 'zh-TW' ? '電子簽名' : 'Signature'}></div>
                      )}
                    </div>
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
          <TableColumn>{i18n.language === 'zh-TW' ? '姓名' : 'Name'}</TableColumn>
          <TableColumn>{i18n.language === 'zh-TW' ? '身分證' : 'ID Number'}</TableColumn>
          <TableColumn>{i18n.language === 'zh-TW' ? '電話' : 'Phone'}</TableColumn>
          <TableColumn>{i18n.language === 'zh-TW' ? '提交時間' : 'Submitted'}</TableColumn>
          <TableColumn>{i18n.language === 'zh-TW' ? '操作' : 'Actions'}</TableColumn>
        </TableHeader>
        <TableBody>
          {applications.map((application) => {
            const isOwner = currentUser && application.user_id === currentUser.id

            return (
              <TableRow key={application.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{application.victim_name}</span>
                    <span className="text-xs text-default-400 font-mono">
                      {application.id.slice(0, 8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{application.id_number}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{application.phone_number}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs">{formatDate(application.created_at)}</span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    onClick={() => router.push(`/application-detail?id=${application.id}`)}
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

        {/* 團隊/個人切換 Tabs */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="mb-6"
          color="primary"
        >
          <Tab
            key="team"
            title={
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4M16,13.4C18.78,13.4 24,14.79 24,17.6V20H8V17.6C8,14.79 13.22,13.4 16,13.4M8,4C10.11,4 11.8,5.69 11.8,7.8C11.8,9.91 10.11,11.6 8,11.6C5.89,11.6 4.2,9.91 4.2,7.8C4.2,5.69 5.89,4 8,4M8,13.4C10.78,13.4 16,14.79 16,17.6V20H0V17.6C0,14.79 5.22,13.4 8,13.4Z" />
                </svg>
                {i18n.language === 'zh-TW' ? '團隊記錄' : 'Team Records'}
              </div>
            }
          >
            {/* 團隊申請記錄 */}
            {renderApplicationList(allApplications, false)}
          </Tab>
          <Tab
            key="personal"
            title={
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
                {i18n.language === 'zh-TW' ? '我的記錄' : 'My Records'}
              </div>
            }
          >
            {/* 個人申請記錄 */}
            {renderApplicationList(myApplications, true)}
          </Tab>
        </Tabs>

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