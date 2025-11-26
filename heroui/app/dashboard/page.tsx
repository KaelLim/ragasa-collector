'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Input } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import Logo from '@/components/logo'
import MobileMenu from '@/components/MobileMenu'

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState('xlsx')
  const [password, setPassword] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
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

  const handleDownloadRequest = () => {
    setIsDownloadModalOpen(true)
    setPassword('')
    setDownloadError('')
  }

  const handleDownload = async () => {
    if (password !== '94800552') {
      setDownloadError(t('auth.loginError') + 'Invalid password')
      return
    }

    setIsDownloading(true)
    setDownloadError('')

    try {
      // 獲取所有圖片分析資料（POC 版本）
      const { data, error } = await supabase
        .from('image_analyses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // 準備下載資料（POC 版本：訪視紀錄）
      const downloadData = data.map(analysis => ({
        'Analysis ID': analysis.id,
        'Image Name': analysis.image_name,
        'Event Description': analysis.event_description || '',
        'EXIF DateTime': analysis.exif_datetime || '',
        'EXIF GPS': analysis.exif_gps ? `${analysis.exif_gps.lat}, ${analysis.exif_gps.lon}` : '',
        'EXIF Camera': analysis.exif_camera || '',
        'Caption': analysis.caption || '',
        'Tags': analysis.tags ? JSON.stringify(analysis.tags) : '',
        'Status': analysis.status,
        'Created At': new Date(analysis.created_at).toLocaleDateString(),
        'Processed At': analysis.processed_at ? new Date(analysis.processed_at).toLocaleDateString() : ''
      }))

      if (downloadFormat === 'csv') {
        downloadCSV(downloadData)
      } else {
        downloadXLSX(downloadData)
      }

      setIsDownloadModalOpen(false)
    } catch (error) {
      setDownloadError(t('application.submitError') + (error as Error).message)
    } finally {
      setIsDownloading(false)
    }
  }

  const downloadCSV = (data: any[]) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `visit_records_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadXLSX = async (data: any[]) => {
    // 使用簡單的方式創建 Excel 檔案（需要安裝 xlsx 庫）
    // 暫時使用 CSV 格式，後續可添加 xlsx 庫
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header] || '').join('\t'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `visit_records_${new Date().toISOString().split('T')[0]}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      <div className="max-w-4xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Logo width={48} height={48} clickable={false} />
            <div>
              <p className="text-default-600">
                {t('dashboard.welcome')}{user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="light"
              color="secondary"
              onClick={() => router.push('/bulk-register')}
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4M16,13.4C18.78,13.4 24,14.79 24,17.6V20H8V17.6C8,14.79 13.22,13.4 16,13.4M8,4C10.11,4 11.8,5.69 11.8,7.8C11.8,9.91 10.11,11.6 8,11.6C5.89,11.6 4.2,9.91 4.2,7.8C4.2,5.69 5.89,4 8,4M8,13.4C10.78,13.4 16,14.79 16,17.6V20H0V17.6C0,14.79 5.22,13.4 8,13.4Z" />
                </svg>
              }
            >
              {i18n.language === 'zh-TW' ? '批量註冊' : 'Bulk Register'}
            </Button>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button color="danger" variant="ghost" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <Logo width={40} height={40} clickable={false} />
          <MobileMenu showLogout={true} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* 新增申請卡片 */}
          <Card
            className="hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group border-2 hover:border-primary"
            isPressable
            as={Link}
            href="/application/new"
          >
            <CardBody className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-6 bg-primary-100 rounded-full group-hover:bg-primary-200 transition-colors">
                  {/* Add Document Icon */}
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M12,11L16,15H13.5V19H10.5V15H8L12,11Z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {t('dashboard.newApplication')}
                </h3>
                <p className="text-default-500 leading-relaxed">
                  {t('dashboard.newApplicationDesc')}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* 申請記錄卡片 */}
          <Card
            className="hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group border-2 hover:border-secondary"
            isPressable
            as={Link}
            href="/applications"
          >
            <CardBody className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-6 bg-secondary-100 rounded-full group-hover:bg-secondary-200 transition-colors">
                  {/* List Icon */}
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-secondary">
                    <path d="M9,5V9H21V5M9,19H21V15H9M9,14H21V10H9M4,9H8V5H4M4,19H8V15H4M4,14H8V10H4V14Z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold group-hover:text-secondary transition-colors">
                  {t('dashboard.applicationRecords')}
                </h3>
                <p className="text-default-500 leading-relaxed">
                  {t('dashboard.applicationRecordsDesc')}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* 下載檔案卡片 */}
          <Card
            className="hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group border-2 hover:border-success"
            isPressable
            onClick={handleDownloadRequest}
          >
            <CardBody className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-6 bg-success-100 rounded-full group-hover:bg-success-200 transition-colors">
                  {/* Download Icon */}
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-success">
                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold group-hover:text-success transition-colors">
                  {t('dashboard.downloadFiles')}
                </h3>
                <p className="text-default-500 leading-relaxed">
                  {t('dashboard.downloadFilesDesc')}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 下載檔案 Modal */}
        <Modal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          size="md"
        >
          <ModalContent>
            <ModalHeader>
              <h3 className="text-lg font-bold">
                {t('dashboard.downloadFiles')}
              </h3>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Select
                label={t('dashboard.fileFormat')}
                selectedKeys={[downloadFormat]}
                onSelectionChange={(keys) => setDownloadFormat(Array.from(keys)[0] as string)}
              >
                <SelectItem key="xlsx">
                  Excel (.xlsx)
                </SelectItem>
                <SelectItem key="csv">
                  CSV (.csv)
                </SelectItem>
              </Select>

              <Input
                label={t('dashboard.passwordConfirm')}
                type="password"
                value={password}
                onValueChange={setPassword}
                variant="bordered"
                isRequired
              />

              {downloadError && (
                <div className="text-danger text-sm">
                  {downloadError}
                </div>
              )}

              <div className="bg-warning-50 p-4 rounded-lg">
                <p className="text-warning-800 text-sm">
                  <strong>{t('dashboard.securityNotice')}:</strong> {t('dashboard.downloadSecurityDesc')}
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onClick={() => setIsDownloadModalOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                color="success"
                onClick={handleDownload}
                isLoading={isDownloading}
                isDisabled={!password}
              >
                {isDownloading ? t('dashboard.downloading') : t('dashboard.download')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  )
}