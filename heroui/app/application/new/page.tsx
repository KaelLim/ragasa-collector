'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Progress } from '@heroui/progress'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import MobileMenu from '@/components/MobileMenu'
import CameraCapture from '@/components/CameraCapture'
import SignatureCanvas from '@/components/SignatureCanvas'
import BankSelector from '@/components/BankSelector'
import { supabase, type BankCode } from '@/lib/supabase'
import { batchUploadImages } from '@/services/imageAnalysisService'
import { parseExif } from '@/lib/exifParser'

type FormStep = 'visit-record' | 'consent-form' | 'visit-data' | 'completed'

const steps = [
  { key: 'visit-record', title: '訪視紀錄', titleEn: 'Visit Record' },
  // { key: 'consent-form', title: '個資授權同意書', titleEn: 'Consent Form' },  // POC 版本隱藏
  { key: 'visit-data', title: '訪視資料', titleEn: 'Visit Data' },
]

export default function NewApplicationPage() {
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState<FormStep>('visit-record')
  const [isAgreed, setIsAgreed] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [currentSubStep, setCurrentSubStep] = useState(2) // POC 版本：直接從子步驟 2（現場照片）開始
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // 訪視紀錄資料（新增）
  const [visitRecord, setVisitRecord] = useState({
    eventName: '',
    visitNotes: '',
    visitDate: '',  // 將在 useEffect 中設定
    visitTime: ''   // 將在 useEffect 中設定
  })

  // 自動帶入日期時間（客戶端）
  useEffect(() => {
    const now = new Date()
    setVisitRecord(prev => ({
      ...prev,
      visitDate: now.toISOString().split('T')[0],
      visitTime: now.toTimeString().slice(0, 5)
    }))
  }, [])

  // 表單資料（POC 版本暫不使用）
  const [formData, setFormData] = useState({
    victim_name: '',
    id_number: '',
    phone_number: '',
    address: '',
    bank_code: '',
    bank_name: '',
    bank_account: ''
  })

  // 檔案資料（POC 版本：支援多張現場照片）
  const [photos, setPhotos] = useState<Array<{ file: File; exifData?: any }>>([])

  // 舊的檔案資料結構（POC 版本暫不使用）
  const [fileData, setFileData] = useState({
    frontIdPhoto: null as File | null,
    backIdPhoto: null as File | null,
    bankPhoto: null as File | null,
    signature: null as File | null
  })

  // 銀行代碼資料
  const [bankCodes, setBankCodes] = useState<BankCode[]>([])

  // 提交狀態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // 上傳進度（新增）
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    fileName: '',
    status: ''
  })

  const router = useRouter()

  // 載入銀行代碼（POC 版本不使用）
  // useEffect(() => {
  //   const fetchBankCodes = async () => {
  //     const { data, error } = await supabase
  //       .from('bank_codes')
  //       .select('*')
  //       .order('type', { ascending: true })
  //       .order('name', { ascending: true })

  //     if (data) {
  //       setBankCodes(data)
  //     }
  //   }

  //   fetchBankCodes()
  // }, [])

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep)
  }

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key as FormStep)
    } else {
      setCurrentStep('completed')
    }
  }

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key as FormStep)
    }
  }

  // 上傳檔案到 Storage
  const uploadFileToStorage = async (file: File, folder: string, uuid: string) => {
    const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
    const fileName = `${folder}/${uuid}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error
    return fileName
  }

  // 提交訪視紀錄（POC 版本：批次上傳照片）
  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // 1. 驗證必填資料
      if (!visitRecord.eventName || !visitRecord.visitNotes) {
        throw new Error('請填寫事件名稱和訪視紀錄')
      }

      if (photos.length === 0) {
        throw new Error('請至少上傳 1 張現場照片')
      }

      // 2. 組合事件描述（包含訪視紀錄）
      const eventDescription = `事件：${visitRecord.eventName}
訪視時間：${visitRecord.visitDate} ${visitRecord.visitTime}
訪視紀錄：
${visitRecord.visitNotes}`.trim()

      console.log('開始批次上傳照片...', {
        照片數量: photos.length,
        事件: visitRecord.eventName
      })

      // 3. 批次上傳照片（不等待 AI 處理）
      const uploadResults = await batchUploadImages(
        photos.map(p => p.file),
        eventDescription,
        (current, total, fileName, status) => {
          // 更新上傳進度
          setUploadProgress({ current, total, fileName, status })
          console.log(`上傳進度：${current}/${total} - ${fileName} - ${status}`)
        }
      )

      // 4. 檢查上傳結果
      const successCount = uploadResults.filter(r => r.status === 'success').length
      const failedCount = uploadResults.filter(r => r.status === 'failed').length

      console.log(`上傳完成：成功 ${successCount} 張，失敗 ${failedCount} 張`)

      if (successCount === 0) {
        throw new Error('所有照片上傳失敗，請檢查網路連線')
      }

      // 5. 生成訪視紀錄 ID（臨時）
      const visitId = `VISIT-${Date.now()}`
      setApplicationId(visitId)

      console.log('訪視紀錄提交完成', {
        訪視ID: visitId,
        成功上傳: successCount,
        失敗: failedCount
      })

      // 6. 立即完成提交流程（不等待 AI 處理）
      setCurrentStep('completed')

    } catch (error) {
      console.error('提交錯誤:', error)
      setSubmitError(error instanceof Error ? error.message : '提交失敗，請重試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressValue = currentStep === 'completed' ? 100 : ((getCurrentStepIndex() + 1) / steps.length) * 100

  // 表單驗證函數
  const validateBasicInfo = () => {
    return (
      formData.victim_name.trim() &&
      /^[A-Z][0-9]{9}$/.test(formData.id_number) &&
      /^[0-9\-]{8,12}$/.test(formData.phone_number) &&
      formData.address.trim() &&
      formData.bank_code &&
      formData.bank_account &&
      /^[0-9]{5,20}$/.test(formData.bank_account)
    )
  }

  const validatePhotos = () => {
    return fileData.frontIdPhoto && fileData.backIdPhoto && fileData.bankPhoto
  }

  const validateSignature = () => {
    return fileData.signature
  }

  // 第一步：訪視紀錄
  if (currentStep === 'visit-record') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header - RWD 友善 */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">{t('application.title')}</h1>
                <p className="text-sm text-default-500">{t('application.step1')} (1/3)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={33} size="sm" className="w-24" aria-label="表單進度" />
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>返回</Button>
            </div>
          </div>

          {/* 手機版 Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <Logo width={32} height={32} />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard')}
                  size="sm"
                  className="px-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                  </svg>
                </Button>
                <MobileMenu showLogout={true} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">{t('application.step1')}</p>
                <span className="text-xs text-default-400">1/3</span>
              </div>
              <Progress value={33} color="primary" size="sm" aria-label="表單進度" />
            </div>
          </div>
        </div>

        {/* Container - 訪視紀錄表單 */}
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 md:p-8">
          <div className="max-w-3xl mx-auto h-full flex flex-col gap-6 justify-center">
            <Card className="shadow-2xl">
              <CardHeader className="flex flex-col gap-2 pb-4">
                <h2 className="text-2xl font-bold">訪視紀錄</h2>
                <p className="text-sm text-default-500">請填寫災區訪視的基本資訊</p>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* 事件名稱 */}
                <div className="space-y-2">
                  <label htmlFor="eventName" className="text-sm font-medium">
                    事件名稱 <span className="text-danger">*</span>
                  </label>
                  <input
                    id="eventName"
                    type="text"
                    placeholder="例如：2025花蓮地震災區訪視"
                    value={visitRecord.eventName}
                    onChange={(e) => setVisitRecord({ ...visitRecord, eventName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none dark:bg-default-100"
                    aria-label="事件名稱"
                  />
                </div>

                {/* 訪視紀錄 */}
                <div className="space-y-2">
                  <label htmlFor="visitNotes" className="text-sm font-medium">
                    訪視紀錄 <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="visitNotes"
                    placeholder="請描述現場狀況、災戶情況、損害程度等..."
                    value={visitRecord.visitNotes}
                    onChange={(e) => setVisitRecord({ ...visitRecord, visitNotes: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none resize-none dark:bg-default-100"
                    aria-label="訪視紀錄"
                  />
                </div>

                {/* 訪視日期時間 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="visitDate" className="text-sm font-medium">訪視日期</label>
                    <input
                      id="visitDate"
                      type="date"
                      value={visitRecord.visitDate}
                      onChange={(e) => setVisitRecord({ ...visitRecord, visitDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none dark:bg-default-100"
                      aria-label="訪視日期"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="visitTime" className="text-sm font-medium">訪視時間</label>
                    <input
                      id="visitTime"
                      type="time"
                      value={visitRecord.visitTime}
                      onChange={(e) => setVisitRecord({ ...visitRecord, visitTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none dark:bg-default-100"
                      aria-label="訪視時間"
                    />
                  </div>
                </div>

                {/* 說明文字 */}
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <p className="text-sm text-default-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
                      <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                    </svg>
                    日期和時間已自動帶入當前時間，您可以視需要調整
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-divider p-6">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
            >
              返回首頁
            </Button>
            <Button
              color="primary"
              size="lg"
              onClick={handleNext}
              className="px-8 py-3"
              isDisabled={!visitRecord.eventName || !visitRecord.visitNotes}
            >
              下一步：上傳現場照片
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 第二步：個資授權同意書（POC 版本隱藏）
  if (false && currentStep === 'consent-form') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header - RWD 友善 */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">救災個資收集申請</h1>
                <p className="text-sm text-default-500">個資授權同意書 (2/3)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={66} size="sm" className="w-24" aria-label="表單進度" />
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>返回</Button>
            </div>
          </div>

          {/* 手機版 Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <Logo width={32} height={32} />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard')}
                  size="sm"
                  className="px-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                  </svg>
                </Button>
                <MobileMenu showLogout={true} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold">救災個資收集申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">個資授權同意書</p>
                <span className="text-xs text-default-400">2/3</span>
              </div>
              <Progress value={66} color="primary" size="sm" aria-label="表單進度" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 bg-content1 p-4">
          <div className="max-w-4xl mx-auto h-full">
            <Card className="shadow-2xl h-full">
              <CardHeader className="pb-2">
              </CardHeader>
              <CardBody className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 bg-content2 rounded-lg border border-divider">
                  <div className="space-y-6 text-foreground">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-primary mb-2">財團法人中華民國佛教慈濟慈善事業基金會</h3>
                      <h4 className="text-lg font-semibold">蒐集個人資料告知事項暨當事人同意書</h4>
                    </div>

                    <div className="leading-relaxed">
                      <p>財團法人中華民國佛教慈濟慈善事業基金會（下稱本會）依據個人資料保護法、本會之個人資料保護政策及辦法，在向您蒐集個人資料前，依法向您告知下列事項，敬請詳閱：</p>
                    </div>

                    <div>
                      <p><strong>1.</strong> 本會基於章程業務、活動、社會服務、行政管理及宣傳推廣活動等目的，蒐集、處理及利用個人資料。</p>
                    </div>

                    <div>
                      <p><strong>2.</strong> 本會蒐集之個人資料類別如填寫頁所示，請您填寫正確且最新及完整的個人資料，若有任何異動，請即時向本會更正。</p>
                    </div>

                    <div>
                      <p><strong>3.</strong> 本會蒐集、處理、利用、傳輸您個人資料之期間、地區、對象及方式如下：</p>
                      <div className="ml-4 space-y-2 mt-2">
                        <p><strong>1)</strong> <strong>期間</strong>：本會僅於特定目的存續期間利用您個人資料，但因執行職務或業務所必須或經您同意者，不在此限。</p>
                        <p><strong>2)</strong> <strong>地區</strong>：本會執行職務或業務之國內外地區。</p>
                        <p><strong>3)</strong> <strong>對象</strong>：您個人資料將使用在本會、其他本會志業體、受本會委託處理相關事務之第三人、因履行契約所必要之第三人、其他業務相關之第三人、政府機構、其他未受中央目的事業主管機關限制國際傳輸之接收者。</p>
                        <p><strong>4)</strong> <strong>方式</strong>：您個人資料將以自動化機器或其他非自動化之利用方式，並以合理方式使用。利用方式包括但不限於以言詞、書面、電話、簡訊、電子郵件、傳真、電子文件或其他合於當時科學技術之適當方式。</p>
                      </div>
                    </div>

                    <div>
                      <p><strong>4.</strong> 您得到本會官網聯絡窗口，就您個人資料向本會行使以下權利：(一)查詢或請求閱覽。(二)請求製給複製本。(三)請求補充或更正。(四)請求停止蒐集、處理及利用。(五)請求刪除。</p>
                      <p className="mt-2">本會得依個人資料保護法及相關法律規定、執行職務及業務所必須或經您書面同意時，拒絕您行使上述權利。若您因行使上述權利，而致權益受損時，本會將不負相關賠償責任。</p>
                    </div>

                    <div>
                      <p><strong>5.</strong> 您得自由選擇提供個人資料，如選擇您不提供個人資料，本會可能無法提供蒐集目的之相關服務。</p>
                    </div>

                    <div>
                      <p><strong>6.</strong> 若因本同意書涉訟，您同意以中華民國法律為準據法，並以臺灣花蓮地方法院為第一審管轄法院。</p>
                    </div>

                    <div>
                      <p><strong>7.</strong> 您同意本會留存此同意書，供日後取出查驗。</p>
                    </div>

                    <div className="border-t border-divider pt-6 mt-6 bg-warning-50 p-4 rounded-lg">
                      <h4 className="text-lg font-bold text-warning-800 mb-3">※您於相關文件填寫個人資料，即視為同意個人資料提供予本會，代表：</h4>

                      <div className="space-y-3 text-warning-700">
                        <p>您已閱讀、瞭解並同意接受本同意書之規定，並同意本會於所列蒐集目的之必要範圍內，蒐集、處理及利用本人之個人資料。</p>

                        <p>若您未滿十八歲，您確認已經法定代理人閱讀、瞭解並同意本同意書之所有內容，並遵守本同意書所有規範，始得填寫。</p>

                        <p>若您是代填報者，您保證已向個人資料所有人說明本同意書之內容，並獲得個人資料所有人之同意，始填報相關個人資料。</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 border-t border-divider bg-content3 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm">
{t('application.consentCheckbox')}
                    </span>
                  </label>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-divider p-6">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <Button variant="ghost" onClick={handleBack} className="px-6 py-3">
              {t('application.back')}
            </Button>
            <Button
              color="primary"
              size="lg"
              onClick={handleNext}
              isDisabled={!isAgreed}
              className="px-8 py-3"
            >
{t('application.agreeAndContinue')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 第三步：訪視資料（現場照片）
  if (currentStep === 'visit-data') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header - RWD 友善 */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">{t('application.title')}</h1>
                <p className="text-sm text-default-500">
{t(`application.subStep${currentSubStep}`)} ({currentSubStep}/4) - {i18n.language === 'zh-TW' ? '第3步' : 'Step 3'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={66 + (currentSubStep / 4) * 34} size="sm" className="w-24" color="success" aria-label="表單進度" />
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>返回</Button>
            </div>
          </div>

          {/* 手機版 Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <Logo width={32} height={32} />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard')}
                  size="sm"
                  className="px-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                  </svg>
                </Button>
                <MobileMenu showLogout={true} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold">救災個資收集申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">{t(`application.subStep${currentSubStep}`)}</p>
                <span className="text-xs text-default-400">{currentSubStep}/4</span>
              </div>
              <Progress value={66 + (currentSubStep / 4) * 34} color="success" size="sm" aria-label="表單進度" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* 子步驟 1: 基本資料填寫（POC 版本隱藏） */}
            {false && currentSubStep === 1 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">{t('application.basicInfo')}</h2>
                  <p className="text-sm text-default-500">{t('application.basicInfoDesc')}</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  {/* 一列一列的表單欄位 */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        1. {t('application.victimName')} <span className="text-danger">{t('application.required')}</span>
                      </label>
                      <input
                        type="text"
                        value={formData.victim_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, victim_name: e.target.value }))}
                        placeholder={t('application.victimNamePlaceholder')}
                        className={`w-full px-4 py-3 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          formData.victim_name.trim()
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                      {!formData.victim_name.trim() && (
                        <p className="text-xs text-danger mt-1">{i18n.language === 'zh-TW' ? '此欄位為必填' : 'This field is required'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        2. {t('application.idNumber')} <span className="text-danger">{t('application.required')}</span>
                      </label>
                      <input
                        type="text"
                        value={formData.id_number}
                        onChange={(e) => {
                          // 只允許英文字母和數字，自動大寫
                          const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
                          if (value.length <= 10) {
                            setFormData(prev => ({ ...prev, id_number: value }))
                          }
                        }}
                        placeholder="A123456789"
                        maxLength={10}
                        className={`w-full px-4 py-3 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          /^[A-Z][0-9]{9}$/.test(formData.id_number)
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                      {formData.id_number && !/^[A-Z][0-9]{9}$/.test(formData.id_number) && (
                        <p className="text-xs text-danger mt-1">
                          {i18n.language === 'zh-TW' ? '格式錯誤：需要1個英文字母 + 9個數字' : 'Invalid format: 1 letter + 9 digits required'}
                        </p>
                      )}
                      {(!formData.id_number || /^[A-Z][0-9]{9}$/.test(formData.id_number)) && (
                        <p className="text-xs text-default-400 mt-1">{t('application.idNumberFormat')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        3. {t('application.phoneNumber')} <span className="text-danger">{t('application.required')}</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => {
                          // 只允許數字和連字號
                          const value = e.target.value.replace(/[^0-9\-]/g, '')
                          if (value.length <= 12) {
                            setFormData(prev => ({ ...prev, phone_number: value }))
                          }
                        }}
                        placeholder="09xxxxxxxx"
                        maxLength={12}
                        className={`w-full px-4 py-3 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          /^[0-9\-]{8,12}$/.test(formData.phone_number)
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                      {formData.phone_number && !/^[0-9\-]{8,12}$/.test(formData.phone_number) && (
                        <p className="text-xs text-danger mt-1">{i18n.language === 'zh-TW' ? '請輸入8-12位數字' : 'Enter 8-12 digits'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        4. {t('application.address')} <span className="text-danger">{t('application.required')}</span>
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder={t('application.addressPlaceholder')}
                        rows={3}
                        className="w-full px-4 py-3 border border-default-300 rounded-lg bg-content1 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        5. {t('application.bankCode')} <span className="text-danger">{t('application.required')}</span>
                      </label>
                      <div className="w-full">
                        <BankSelector
                          bankCodes={bankCodes}
                          selectedBankCode={formData.bank_code}
                          onSelectionChange={(code, name) => {
                            setFormData(prev => ({
                              ...prev,
                              bank_code: code,
                              bank_name: name
                            }))
                          }}
                          label=""
                          placeholder={t('application.bankCodePlaceholder')}
                          isRequired
                        />
                      </div>
                      <p className="text-xs text-default-400 mt-1">{t('application.bankCodeExample')}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        6. {t('application.bankAccount')} <span className="text-danger">{t('application.required')}</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.bank_account}
                        onChange={(e) => {
                          // 只允許數字
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          if (value.length <= 20) {
                            setFormData(prev => ({ ...prev, bank_account: value }))
                          }
                        }}
                        placeholder={t('application.bankAccountPlaceholder')}
                        maxLength={20}
                        className={`w-full px-4 py-3 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          formData.bank_account && /^[0-9]{5,20}$/.test(formData.bank_account)
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                      {formData.bank_account && formData.bank_account.length > 0 && !/^[0-9]{5,20}$/.test(formData.bank_account) && (
                        <p className="text-xs text-danger mt-1">{i18n.language === 'zh-TW' ? '請輸入5-20位數字' : 'Enter 5-20 digits'}</p>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 子步驟 2: 現場照片上傳（支援多張，最多 20 張） */}
            {currentSubStep === 2 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">現場照片上傳</h2>
                  <p className="text-sm text-default-500">拍攝或選擇現場照片（最多 20 張）</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  {/* 照片上傳區 */}
                  {photos.length < 20 && (
                    <div className="space-y-4">
                      {/* 單張拍照/選擇 */}
                      <CameraCapture
                        label={`現場照片 ${photos.length + 1}`}
                        onCapture={(file, exifData) => {
                          setPhotos(prev => [...prev, { file, exifData }])
                        }}
                      />

                      {/* 批次選擇多張照片 */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || [])
                            const remainingSlots = 20 - photos.length
                            const filesToAdd = files.slice(0, remainingSlots)

                            console.log(`批次選擇：${files.length} 張，可加入：${filesToAdd.length} 張`)

                            // 逐一解析 EXIF 並加入
                            for (const file of filesToAdd) {
                              try {
                                const exifData = await parseExif(file)
                                setPhotos(prev => [...prev, { file, exifData }])
                              } catch (error) {
                                console.error('EXIF 解析失敗:', error)
                                setPhotos(prev => [...prev, { file, exifData: undefined }])
                              }
                            }

                            // 清空 input
                            e.target.value = ''
                          }}
                          className="hidden"
                          id="batch-upload"
                        />
                        <label
                          htmlFor="batch-upload"
                          className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-primary rounded-lg cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
                            <path d="M12 13l-4 4h8z"/>
                          </svg>
                          <span className="font-medium text-primary">
                            批次選擇多張照片（可選 {20 - photos.length} 張）
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 已上傳照片列表 */}
                  {photos.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-semibold">已上傳照片 ({photos.length}/20)</h3>
                        {photos.length < 20 && (
                          <p className="text-sm text-default-500">可繼續新增 {20 - photos.length} 張</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(photo.file)}
                              alt={`照片 ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button
                                size="sm"
                                color="danger"
                                onClick={() => {
                                  setPhotos(prev => prev.filter((_, i) => i !== index))
                                }}
                              >
                                刪除
                              </Button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              #{index + 1}
                            </div>
                            {photo.exifData?.gps && (
                              <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                GPS
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 提示訊息 */}
                  {photos.length === 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
                      <p className="text-sm text-default-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
                          <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                        </svg>
                        請至少上傳 1 張現場照片
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* 子步驟 3: 電子簽名（POC 版本隱藏） */}
            {false && currentSubStep === 3 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">{t('application.electronicSignature')}</h2>
                  <p className="text-sm text-default-500">{t('application.signatureDesc')}</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  <SignatureCanvas
                    label={t('application.handwrittenSignature')}
                    onSave={(file) => setFileData(prev => ({ ...prev, signature: file }))}
                    isRequired
                    currentSignature={fileData.signature ? URL.createObjectURL(fileData.signature) : null}
                  />
                </CardBody>
              </Card>
            )}

            {/* 子步驟 4: 確認提交 */}
            {currentSubStep === 4 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <h2 className="text-lg font-bold">確認提交</h2>
                  <p className="text-sm text-default-500">請確認訪視紀錄無誤後提交</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  {/* 訪視紀錄預覽 */}
                  <Card className="bg-content2">
                    <CardHeader>
                      <h3 className="font-semibold">訪視紀錄</h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-default-500">事件名稱：</span>
                        <span className="font-medium">{visitRecord.eventName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-default-500">訪視時間：</span>
                        <span>{visitRecord.visitDate} {visitRecord.visitTime}</span>
                      </div>
                      <div className="border-t pt-3">
                        <p className="text-default-500 text-sm mb-2">訪視紀錄：</p>
                        <p className="text-sm whitespace-pre-wrap">{visitRecord.visitNotes}</p>
                      </div>
                    </CardBody>
                  </Card>

                  {/* 照片預覽 */}
                  <Card className="bg-content2">
                    <CardHeader>
                      <h3 className="font-semibold">現場照片（{photos.length} 張）</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(photo.file)}
                              alt={`照片 ${index + 1}`}
                              className="w-full aspect-square object-cover rounded"
                            />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                              #{index + 1}
                            </div>
                            {photo.exifData?.gps && (
                              <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                                GPS
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  {/* 上傳進度 */}
                  {isSubmitting && uploadProgress.total > 0 && (
                    <Card className="bg-primary-50 dark:bg-primary-950/30">
                      <CardBody className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">上傳進度</span>
                          <span className="text-sm">
                            {uploadProgress.current} / {uploadProgress.total} 張
                          </span>
                        </div>
                        <Progress
                          value={(uploadProgress.current / uploadProgress.total) * 100}
                          color="primary"
                          size="lg"
                          aria-label="照片上傳進度"
                        />
                        <p className="text-sm text-default-600">
                          {uploadProgress.status === 'uploading' && `正在上傳：${uploadProgress.fileName}`}
                          {uploadProgress.status === 'completed' && `已完成：${uploadProgress.fileName}`}
                          {uploadProgress.status === 'failed' && `失敗：${uploadProgress.fileName}`}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {submitError && (
                    <div className="bg-danger-50 p-4 rounded-lg border border-danger-200 text-center">
                      <p className="text-danger-800">
                        <strong>提交錯誤：</strong>{submitError}
                      </p>
                    </div>
                  )}

                  <div className="bg-success-50 p-4 rounded-lg border border-success-200 text-center">
                    <p className="text-success-800">
                      <strong>提交後注意事項：</strong>資料提交後將無法修改，請確認所有資料正確無誤。
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-divider p-6">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => {
                // POC 版本：子步驟 2 → 回到步驟 1，子步驟 4 → 回到子步驟 2
                if (currentSubStep === 4) {
                  setCurrentSubStep(2)
                } else if (currentSubStep === 2) {
                  handleBack()  // 回到步驟 1（訪視紀錄）
                }
              }}
              className="px-4 md:px-6 py-2 md:py-3"
            >
              上一步
            </Button>

            <Button
              color={currentSubStep === 4 ? 'success' : 'primary'}
              size="lg"
              onClick={() => {
                // POC 版本：子步驟 2 → 跳到子步驟 4（跳過子步驟 3）
                if (currentSubStep === 2) {
                  setCurrentSubStep(4)
                } else if (currentSubStep === 4) {
                  // 提交訪視紀錄
                  handleFinalSubmit()
                }
              }}
              isLoading={isSubmitting}
              isDisabled={
                isSubmitting ||
                (currentSubStep === 2 && photos.length === 0)  // 至少 1 張照片
              }
              className="px-6 md:px-8 py-2 md:py-3"
            >
              {isSubmitting ? t('application.submitting') : (currentSubStep === 4 ? t('application.submitApplication') : t('application.nextStep'))}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 完成頁面
  if (currentStep === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-success">申請提交成功！</h2>
          <p>您的申請已成功提交</p>
          <Button color="primary" onClick={() => router.push('/dashboard')}>
            返回首頁
          </Button>
        </div>
      </div>
    )
  }

  return null
}