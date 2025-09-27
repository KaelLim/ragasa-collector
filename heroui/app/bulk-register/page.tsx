'use client'

import { useState, useRef } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Progress } from '@heroui/progress'
import { Chip } from '@heroui/chip'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import Logo from '@/components/logo'

interface BulkResult {
  index: number
  email: string
  name: string
  success: boolean
  message: string
  user_id?: string
}

interface BulkResponse {
  success: boolean
  total: number
  success_count: number
  error_count: number
  results: BulkResult[]
  summary: {
    total_processed: number
    successfully_created: number
    errors: number
    default_password: string
  }
  error?: string
}

export default function BulkRegisterPage() {
  const { t, i18n } = useTranslation()
  const [csvData, setCsvData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<BulkResponse | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length >= 2 && values[0] && values[1]) {
        data.push({
          email: values[0],
          name: values[1]
        })
      }
    }

    return data
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (file.name.endsWith('.csv')) {
        const parsed = parseCSV(text)
        setCsvData(parsed)
      } else {
        alert(i18n.language === 'zh-TW' ? '請上傳 CSV 檔案' : 'Please upload a CSV file')
      }
    }
    reader.readAsText(file)
  }

  const handleBulkRegister = async () => {
    if (csvData.length === 0) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const response = await fetch('/api/bulk-register.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          users: csvData
        })
      })

      const result: BulkResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Bulk registration failed')
      }

      setResults(result)
      setProgress(100)

    } catch (error) {
      console.error('Bulk register error:', error)
      alert(i18n.language === 'zh-TW' ? '批量註冊失敗' : 'Bulk registration failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'email,name\nexample@tzuchi.org.tw,範例用戶\nuser1@tzuchi.org.tw,用戶一\nuser2@tzuchi.org.tw,用戶二'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'bulk_register_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Logo width={48} height={48} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {i18n.language === 'zh-TW' ? '大量匯入註冊' : 'Bulk User Registration'}
              </h1>
              <p className="text-default-600">
                {i18n.language === 'zh-TW' ? '批量創建用戶帳號' : 'Batch create user accounts'}
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

        {!results ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 上傳區域 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">
                  {i18n.language === 'zh-TW' ? '上傳用戶資料' : 'Upload User Data'}
                </h2>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {i18n.language === 'zh-TW' ? '檔案格式' : 'File Format'}:
                    </span>
                    <Chip color="primary" size="sm">CSV</Chip>
                  </div>

                  <div className="bg-content2 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">
                      {i18n.language === 'zh-TW' ? '檔案格式要求' : 'File Format Requirements'}:
                    </h4>
                    <ul className="text-sm text-default-600 space-y-1">
                      <li>• {i18n.language === 'zh-TW' ? '第一欄：電子郵件' : 'Column 1: Email'}</li>
                      <li>• {i18n.language === 'zh-TW' ? '第二欄：姓名' : 'Column 2: Name'}</li>
                      <li>• {i18n.language === 'zh-TW' ? '預設密碼：94800552' : 'Default password: 94800552'}</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="bordered"
                      onClick={downloadTemplate}
                      startContent={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                        </svg>
                      }
                    >
                      {i18n.language === 'zh-TW' ? '下載範本' : 'Download Template'}
                    </Button>
                  </div>

                  <div
                    className="border-2 border-dashed border-default-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-default-400 mx-auto mb-4">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    <p className="text-default-600">
                      {i18n.language === 'zh-TW' ? '點擊選擇 CSV 檔案或拖拽到此處' : 'Click to select CSV file or drag here'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div className="bg-success-50 p-4 rounded-lg">
                      <p className="text-success-800">
                        ✓ {i18n.language === 'zh-TW' ? '已載入' : 'Loaded'} {csvData.length} {i18n.language === 'zh-TW' ? '筆用戶資料' : 'user records'}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* 預覽區域 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">
                  {i18n.language === 'zh-TW' ? '資料預覽' : 'Data Preview'}
                </h2>
              </CardHeader>
              <CardBody>
                {csvData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-default-500">
                      {i18n.language === 'zh-TW' ? '請先上傳 CSV 檔案' : 'Please upload a CSV file first'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-default-600">
                      {i18n.language === 'zh-TW' ? '將創建以下用戶' : 'Will create the following users'}:
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                      <Table isStriped>
                        <TableHeader>
                          <TableColumn>{i18n.language === 'zh-TW' ? '電子郵件' : 'Email'}</TableColumn>
                          <TableColumn>{i18n.language === 'zh-TW' ? '姓名' : 'Name'}</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {csvData.map((user, index) => (
                            <TableRow key={index}>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-default-500">
                        {i18n.language === 'zh-TW' ? '預設密碼' : 'Default Password'}: 94800552
                      </span>
                      <Button
                        color="primary"
                        size="lg"
                        onClick={handleBulkRegister}
                        isLoading={isProcessing}
                        isDisabled={csvData.length === 0}
                        startContent={
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                          </svg>
                        }
                      >
                        {isProcessing
                          ? (i18n.language === 'zh-TW' ? '處理中...' : 'Processing...')
                          : (i18n.language === 'zh-TW' ? '開始註冊' : 'Start Registration')
                        }
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        ) : (
          /* 結果頁面 */
          <div className="space-y-8">
            {/* 統計摘要 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-2 border-primary/20">
                <CardBody className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-primary">{results.summary.total_processed}</h3>
                  <p className="text-default-500 text-sm">
                    {i18n.language === 'zh-TW' ? '總處理數' : 'Total Processed'}
                  </p>
                </CardBody>
              </Card>

              <Card className="border-2 border-success/20">
                <CardBody className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-success">{results.summary.successfully_created}</h3>
                  <p className="text-default-500 text-sm">
                    {i18n.language === 'zh-TW' ? '成功創建' : 'Successfully Created'}
                  </p>
                </CardBody>
              </Card>

              <Card className="border-2 border-danger/20">
                <CardBody className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-danger">{results.summary.errors}</h3>
                  <p className="text-default-500 text-sm">
                    {i18n.language === 'zh-TW' ? '失敗數量' : 'Failed'}
                  </p>
                </CardBody>
              </Card>

              <Card className="border-2 border-warning/20">
                <CardBody className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-warning">94800552</h3>
                  <p className="text-default-500 text-sm">
                    {i18n.language === 'zh-TW' ? '預設密碼' : 'Default Password'}
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* 詳細結果 */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {i18n.language === 'zh-TW' ? '詳細結果' : 'Detailed Results'}
                </h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => {
                      setResults(null)
                      setCsvData([])
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    {i18n.language === 'zh-TW' ? '重新開始' : 'Start Over'}
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    onClick={() => router.push('/dashboard')}
                  >
                    {i18n.language === 'zh-TW' ? '返回首頁' : 'Back to Home'}
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <Table isStriped>
                  <TableHeader>
                    <TableColumn>{i18n.language === 'zh-TW' ? '編號' : 'No.'}</TableColumn>
                    <TableColumn>{i18n.language === 'zh-TW' ? '電子郵件' : 'Email'}</TableColumn>
                    <TableColumn>{i18n.language === 'zh-TW' ? '姓名' : 'Name'}</TableColumn>
                    <TableColumn>{i18n.language === 'zh-TW' ? '狀態' : 'Status'}</TableColumn>
                    <TableColumn>{i18n.language === 'zh-TW' ? '訊息' : 'Message'}</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {results.results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{result.email}</TableCell>
                        <TableCell>{result.name}</TableCell>
                        <TableCell>
                          <Chip color={result.success ? 'success' : 'danger'} size="sm">
                            {result.success
                              ? (i18n.language === 'zh-TW' ? '成功' : 'Success')
                              : (i18n.language === 'zh-TW' ? '失敗' : 'Failed')
                            }
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${result.success ? 'text-success' : 'text-danger'}`}>
                            {result.message}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        )}

        {/* 處理進度 */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardBody className="text-center space-y-4">
                <h3 className="text-lg font-bold">
                  {i18n.language === 'zh-TW' ? '正在處理...' : 'Processing...'}
                </h3>
                <Progress value={progress} color="primary" size="lg" />
                <p className="text-sm text-default-600">
                  {i18n.language === 'zh-TW' ? '請勿關閉頁面' : 'Please do not close this page'}
                </p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}