'use client'

import { use, useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Progress } from '@heroui/progress'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'
import { Spinner } from '@heroui/spinner'
import { Input } from '@heroui/input'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import MobileMenu from '@/components/MobileMenu'
import CameraCapture from '@/components/CameraCapture'
import SignatureCanvas from '@/components/SignatureCanvas'
import BankSelector from '@/components/BankSelector'
import BranchSelector from '@/components/BranchSelector'
import { supabase, type BankCode } from '@/lib/supabase'
import { ocrClient } from '@/lib/ocr-client'
import { useCountdown } from '@/hooks/useCountdown'

type FormStep = 'consent-form' | 'application-form' | 'document-upload' | 'completed'

const steps = [
  { key: 'consent-form', title: '個資收集同意聲明', titleEn: 'Privacy Consent Declaration' },
  { key: 'application-form', title: '基本資料與證件拍照', titleEn: 'Basic Info & Document Photos' },
  { key: 'document-upload', title: '其他文件上傳', titleEn: 'Additional Documents Upload' },
]

export default function NewApplicationPage({ params }: { params: Promise<{ village: string }> }) {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { village: rawVillage } = use(params)
  const village = decodeURIComponent(rawVillage) // 解碼中文村名
  const [currentStep, setCurrentStep] = useState<FormStep>('consent-form')
  const [isAgreed, setIsAgreed] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [currentSubStep, setCurrentSubStep] = useState(1) // 第三步的子步驟
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // 表單資料
  const [formData, setFormData] = useState({
    victim_name: '',
    id_number: '',
    phone_number: '',
    address: '',
    bank_code: '',
    bank_name: '',
    branch_code: '',
    bank_branch: '',
    bank_account: '',
    account_name: '',
    contactOption: '' as '' | 'provide' | 'skip',
    signature: '' as string,
    front_id_photo: '' as string,
    back_id_photo: '' as string,
    bank_photo: '' as string
  })

  // 數字鍵盤狀態
  const [showNumberPad, setShowNumberPad] = useState(false)
  const [tempPhoneNumber, setTempPhoneNumber] = useState('')

  // 檔案資料
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

  // OCR 處理狀態
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [ocrMessage, setOCRMessage] = useState('AI 辨識中，請稍候...')

  // 附加檔案上傳狀態 - 必須在頂層定義
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{
    id: string
    type: string
    customType?: string  // 當 type 為 'other' 時的自訂類型
    file: File | null
    preview: string | null
  }>>([])

  // 倒數計時器 Hook - 必須在頂層調用，不能在條件內
  const { timeLeft, isComplete, percentage } = useCountdown(5, {
    autoStart: currentStep === 'consent-form'
  })

  // 檢查用戶登入狀態
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  // 載入銀行代碼
  useEffect(() => {
    const fetchBankCodes = async () => {
      const { data, error } = await supabase
        .from('bank_codes')
        .select('*')
        .order('code', { ascending: true })
        .order('name', { ascending: true })

      if (data) {
        setBankCodes(data)
        console.log('載入銀行代碼:', data.length, '筆')
      } else if (error) {
        console.error('載入銀行代碼失敗:', error)
      }
    }

    fetchBankCodes()
  }, [])

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

  // 根據身分證字號自動判斷性別
  const getGender = (idNumber: string): string => {
    if (idNumber.length < 2) return ''
    const firstDigit = parseInt(idNumber[1]) // 身分證第二個字元（第一個數字）
    if (isNaN(firstDigit)) return ''
    // 1,8 = 男性；2,9 = 女性
    return (firstDigit === 1 || firstDigit === 8) ? '男' :
           (firstDigit === 2 || firstDigit === 9) ? '女' : ''
  }

  // 中文類型轉英文（用於檔案命名）
  const getEnglishDocType = (docType: string): string => {
    const typeMap: Record<string, string> = {
      '租賃契約': 'lease',
      '戶籍謄本': 'household',
      '房屋所有權狀': 'property',
      '其他': 'other'
    }
    // 如果在 typeMap 中找到，使用對應的英文；否則統一使用 'other'
    return typeMap[docType] || 'other'
  }

  // 上傳檔案到 Storage（使用 UUID v7 作為唯一檔名，保護隱私）
  const uploadFileToStorage = async (file: File, folder: string, docType: string) => {
    // 動態匯入 uuid
    const { v7: uuidv7 } = await import('uuid')

    const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
    const uniqueId = uuidv7()
    // 將中文類型轉為英文以避免檔名問題
    const englishType = getEnglishDocType(docType)
    const fileName = `${folder}/${uniqueId}_${englishType}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error
    return fileName
  }

  // 提交完整申請
  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // 1. 取得當前用戶
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('用戶未登入')
      }

      // 2. 準備申請資料（JSONB 格式）
      const applicationData = {
        user_id: user.id,
        victim_name: formData.victim_name,
        id_number: formData.id_number,
        phone_number: formData.phone_number.trim() || null,
        address: formData.address
      }

      // 插入到 village_applications 表
      const { data: insertedData, error: insertError } = await supabase
        .from('village_applications')
        .insert([{
          village: village,
          data: applicationData
        }])
        .select()
        .single()

      if (insertError) throw insertError

      const newApplicationId = insertedData.uuid
      setApplicationId(newApplicationId)

      // 3. 上傳所有檔案並準備 documents JSONB
      const documentsData: any = {}

      if (fileData.frontIdPhoto) {
        const path = await uploadFileToStorage(fileData.frontIdPhoto, 'front_id', 'front')
        documentsData.front_id_photo = path
      }

      if (fileData.backIdPhoto) {
        const path = await uploadFileToStorage(fileData.backIdPhoto, 'back_id', 'back')
        documentsData.back_id_photo = path
      }

      if (fileData.signature) {
        const path = await uploadFileToStorage(fileData.signature, 'signature', 'signature')
        documentsData.signature = path
      }

      // 4. 上傳附加檔案
      const validDocuments = uploadedDocuments.filter(doc => doc.file !== null)

      if (validDocuments.length > 0) {
        console.log('開始上傳附加檔案:', validDocuments.length, '個')

        const addonsDocsData = []

        for (let i = 0; i < validDocuments.length; i++) {
          const doc = validDocuments[i]
          if (doc.file) {
            try {
              // 使用英文類型 + 索引編號（如果同類型有多個）
              const englishType = getEnglishDocType(doc.type)
              const typeIndex = validDocuments.slice(0, i + 1).filter(d => d.type === doc.type).length
              const docTypeName = typeIndex > 1 ? `${englishType}${typeIndex}` : englishType

              const path = await uploadFileToStorage(doc.file, 'addons_docs', docTypeName)

              addonsDocsData.push({
                id: doc.id,
                type: doc.type,
                customType: doc.customType,
                filePath: path,
                uploadedAt: new Date().toISOString()
              })

              console.log('✅ 附件上傳成功:', path)
            } catch (error) {
              console.error('❌ 附件上傳失敗:', doc.type, error)
              throw new Error(`附件上傳失敗: ${doc.customType || doc.type}`)
            }
          }
        }

        if (addonsDocsData.length > 0) {
          documentsData.addons_docs = addonsDocsData
        }
      }

      // 5. 更新 documents JSONB 欄位
      if (Object.keys(documentsData).length > 0) {
        console.log('準備更新 documents:', {
          uuid: newApplicationId,
          documentsData
        })

        const { data: updateResult, error: updateError } = await supabase
          .from('village_applications')
          .update({ documents: documentsData })
          .eq('uuid', newApplicationId)
          .select()

        if (updateError) {
          console.error('更新文件資料失敗:', updateError)
          throw updateError
        }

        console.log('✅ 所有文件已儲存到資料庫，更新結果:', updateResult)
      } else {
        console.log('⚠️ 沒有文件需要更新')
      }

      // 6. 完成
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

  // 簽名驗證已移除（不再需要電子簽名）

  // 第一步：個資授權同意書
  if (currentStep === 'consent-form') {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Header - RWD 友善 */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">救災個資收集申請 - {village}</h1>
                <p className="text-sm text-default-500">個資收集同意聲明 (1/3)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={33} size="sm" className="w-24" aria-label="進度 33%" />
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>

          {/* 手機版 Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <Logo width={32} height={32} />
              <MobileMenu showLogout={true} />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold">救災個資收集申請 - {village}</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">個資收集同意聲明</p>
                <span className="text-xs text-default-400">1/3</span>
              </div>
              <Progress value={33} color="primary" size="sm" aria-label="進度 33%" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 bg-content1 p-4 overflow-x-hidden">
          <div className="max-w-4xl mx-auto h-full w-full">
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
                      aria-label="同意授權條款"
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
              isDisabled={!isAgreed || !isComplete}
              className="px-8 py-3 relative"
            >
              {!isComplete ? (
                <span className="flex items-center gap-2">
                  <span className="text-lg font-bold">{timeLeft}</span>
                  <span>秒後可同意</span>
                </span>
              ) : (
                t('application.agreeAndContinue')
              )}
              {!isComplete && (
                <Progress
                  value={percentage}
                  size="sm"
                  color="warning"
                  aria-label={`剩餘 ${timeLeft} 秒`}
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
                  classNames={{
                    indicator: "bg-gradient-to-r from-yellow-400 to-orange-400"
                  }}
                />
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 第三步：基本資料表單
  if (currentStep === 'application-form') {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Header - RWD 友善 */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">{t('application.title')}</h1>
                <p className="text-sm text-default-500">
{t(`application.subStep${currentSubStep}`)} ({currentSubStep}/4) - {i18n.language === 'zh-TW' ? '第2步' : 'Step 2'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={33 + (currentSubStep / 4) * 34} size="sm" className="w-24" color="success" aria-label={`進度 ${33 + (currentSubStep / 4) * 34}%`} />
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
              <Progress value={33 + (currentSubStep / 4) * 34} color="success" size="sm" aria-label={`進度 ${33 + (currentSubStep / 4) * 34}%`} />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full">
            {/* 子步驟 1: 身份證拍照與 OCR */}
            {currentSubStep === 1 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">身份證拍照辨識</h2>
                  <p className="text-sm text-default-500">請拍攝身份證正反面，系統將自動識別資料</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 身份證正面 */}
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold text-primary">身份證正面</h3>

                      {/* 拍照/上傳區域 */}
                      <div className="relative">
                        <CameraCapture
                          label="身份證正面"
                          onCapture={async (file) => {
                            // 流程: 圖片上傳 → EXIF 方向自動修正 → 使用者確認，儲存 → 轉換為 base64 → 加上提示詞送至 OCR API
                            // file 是經過 ImageEditor 處理後的 File 物件（已完成 EXIF 修正）
                            const imageUrl = URL.createObjectURL(file)
                            setFormData(prev => ({ ...prev, front_id_photo: imageUrl }))

                            // 儲存 File 物件以便稍後上傳到 Supabase
                            setFileData(prev => ({ ...prev, frontIdPhoto: file }))

                            // 呼叫後端 OCR API
                            try {
                              setIsProcessingOCR(true)
                              setOCRMessage('AI 正在辨識身分證正面，請稍候...')

                              const formDataApi = new FormData()
                              formDataApi.append('image', file)
                              formDataApi.append('type', 'front')

                              const response = await fetch('/api/ocr', {
                                method: 'POST',
                                body: formDataApi
                              })

                              if (response.ok) {
                                const result = await response.json()
                                if (result.success && result.data) {
                                  setFormData(prev => ({
                                    ...prev,
                                    victim_name: result.data.name || prev.victim_name,
                                    id_number: result.data.idNumber || prev.id_number
                                  }))
                                }
                              }
                            } catch (error) {
                              console.error('OCR failed:', error)
                            } finally {
                              setIsProcessingOCR(false)
                            }
                          }}
                          currentImage={formData.front_id_photo}
                        />
                      </div>

                      {/* OCR 識別結果輸入框 */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            姓名 <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.victim_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, victim_name: e.target.value }))}
                            aria-label="姓名"
                            placeholder="請輸入姓名"
                            className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                              formData.victim_name.trim()
                                ? 'border-success focus:border-success focus:ring-success/20'
                                : 'border-default-300 focus:border-primary focus:ring-primary/20'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            身分證字號 <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.id_number}
                            aria-label="身分證字號"
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
                              if (value.length <= 10) {
                                setFormData(prev => ({ ...prev, id_number: value }))
                              }
                            }}
                            placeholder="A123456789"
                            maxLength={10}
                            className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
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
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            性別
                          </label>
                          <div className={`w-full px-3 py-2 border rounded-lg bg-default-100 text-foreground ${
                            getGender(formData.id_number)
                              ? 'border-default-300'
                              : 'border-default-200'
                          }`}>
                            {getGender(formData.id_number) || '請先輸入身分證字號'}
                          </div>
                          <p className="text-xs text-default-400 mt-1">根據身分證字號自動判斷</p>
                        </div>
                      </div>
                    </div>

                    {/* 身份證背面 */}
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold text-primary">身份證背面</h3>

                      {/* 拍照/上傳區域 */}
                      <div className="relative">
                        <CameraCapture
                          label="身份證背面"
                          onCapture={async (file) => {
                            // file 現在是 File 物件，不是 URL
                            const imageUrl = URL.createObjectURL(file)
                            setFormData(prev => ({ ...prev, back_id_photo: imageUrl }))

                            // 儲存 File 物件以便稍後上傳到 Supabase
                            setFileData(prev => ({ ...prev, backIdPhoto: file }))

                            // 呼叫後端 OCR API
                            try {
                              setIsProcessingOCR(true)
                              setOCRMessage('AI 正在辨識身分證背面，請稍候...')

                              const formDataApi = new FormData()
                              formDataApi.append('image', file)
                              formDataApi.append('type', 'back')

                              const response = await fetch('/api/ocr', {
                                method: 'POST',
                                body: formDataApi
                              })

                              if (response.ok) {
                                const result = await response.json()
                                if (result.success && result.data) {
                                  setFormData(prev => ({
                                    ...prev,
                                    address: result.data.address || prev.address
                                  }))
                                }
                              }
                            } catch (error) {
                              console.error('OCR failed:', error)
                            } finally {
                              setIsProcessingOCR(false)
                            }
                          }}
                          currentImage={formData.back_id_photo}
                        />
                      </div>

                      {/* OCR 識別結果輸入框 */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            戶籍地址 <span className="text-danger">*</span>
                          </label>
                          <textarea
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="請輸入戶籍地址"
                            aria-label="戶籍地址"
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 resize-none ${
                              formData.address.trim()
                                ? 'border-success focus:border-success focus:ring-success/20'
                                : 'border-default-300 focus:border-primary focus:ring-primary/20'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </CardBody>
              </Card>
            )}

            {/* 子步驟 2: 銀行存摺拍照與資料填寫 */}
            {/* ARCHIVED: 銀行存摺資料功能已保存但不使用 */}
            {false && currentSubStep === 2 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">銀行存摺資料</h2>
                  <p className="text-sm text-default-500">請拍攝存摺封面並填寫銀行資料</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  {/* 存摺拍照 */}
                  <div>
                    <h3 className="text-md font-semibold text-primary mb-4">存摺封面拍照</h3>
                    <CameraCapture
                      label="銀行存摺"
                      onCapture={async (file) => {
                        // file 現在是 File 物件，不是 URL
                        const imageUrl = URL.createObjectURL(file)
                        setFormData(prev => ({ ...prev, bank_photo: imageUrl }))

                        // 儲存 File 物件以便稍後上傳到 Supabase
                        setFileData(prev => ({ ...prev, bankPhoto: file }))

                        // 呼叫後端 OCR API 進行存摺識別
                        try {
                          setIsProcessingOCR(true)
                          setOCRMessage('AI 正在辨識銀行存摺，請稍候...')

                          const formDataApi = new FormData()
                          formDataApi.append('image', file)
                          formDataApi.append('type', 'bank')

                          const response = await fetch('/api/ocr', {
                            method: 'POST',
                            body: formDataApi
                          })

                          if (response.ok) {
                            const result = await response.json()
                            console.log('OCR 辨識結果:', result.data)

                            if (result.success && result.data) {
                              // 自動填入識別的銀行資料
                              const bankCode = result.data.銀行代碼 || result.data.bankCode
                              const branchCode = result.data.分行代碼 || result.data.branchCode
                              const branchName = result.data.分行名稱 || result.data.分行 || result.data.分會 || result.data.branchName
                              const accountNumber = result.data.銀行帳號 || result.data.帳號 || result.data.accountNumber || result.data.account
                              const accountName = result.data.戶名 || result.data.accountName || result.data.name

                              console.log('OCR 解析結果:', { bankCode, branchCode, branchName, accountNumber, accountName })

                              // 先處理並準備所有資料
                              const cleanedBankCode = bankCode ? bankCode.replace(/[^0-9]/g, '').substring(0, 3) : ''
                              const cleanedAccount = accountNumber ? accountNumber.replace(/[\s\-]/g, '') : ''
                              const cleanedBranchCode = branchCode ? branchCode.replace(/[^0-9]/g, '') : ''

                              // 一次性更新所有表單資料（避免非同步問題）
                              const updates: any = {}

                              // 銀行代碼
                              if (cleanedBankCode.length === 3) {
                                const bank = bankCodes.find(b => b.code === cleanedBankCode && b.branch_code === null)
                                updates.bank_code = cleanedBankCode
                                updates.bank_name = bank?.name || ''
                              }

                              // 銀行帳號
                              if (cleanedAccount) {
                                updates.bank_account = cleanedAccount
                              }

                              // 分行代碼和名稱
                              if (cleanedBranchCode && cleanedBankCode) {
                                // 優先使用 OCR 辨識的分行代碼
                                const matchedBranch = bankCodes.find(b =>
                                  b.code === cleanedBankCode &&
                                  b.branch_code === cleanedBranchCode
                                )

                                if (matchedBranch) {
                                  updates.branch_code = cleanedBranchCode
                                  updates.bank_branch = matchedBranch.branch_name || branchName || ''
                                  console.log('✅ 找到匹配分行:', matchedBranch)
                                } else {
                                  updates.branch_code = cleanedBranchCode
                                  updates.bank_branch = branchName || ''
                                  console.log('⚠️ 資料庫中找不到該分行，使用 OCR 結果')
                                }
                              } else if (branchName && cleanedBankCode) {
                                // 如果沒有分行代碼，用分行名稱反查
                                const matchedBranch = bankCodes.find(b =>
                                  b.code === cleanedBankCode &&
                                  b.branch_name &&
                                  (b.branch_name.includes(branchName) || branchName.includes(b.branch_name))
                                )

                                if (matchedBranch && matchedBranch.branch_code) {
                                  updates.branch_code = matchedBranch.branch_code
                                  updates.bank_branch = matchedBranch.branch_name || branchName
                                  console.log('✅ 用名稱反查找到分行:', matchedBranch)
                                } else {
                                  updates.bank_branch = branchName
                                  console.log('⚠️ 無法反查分行代碼，只填入名稱')
                                }
                              }

                              // 戶名
                              if (accountName) {
                                updates.account_name = accountName
                              }

                              // 一次性更新所有欄位
                              console.log('準備更新表單:', updates)
                              setFormData(prev => ({
                                ...prev,
                                ...updates
                              }))
                            }
                          }
                        } catch (error) {
                          console.error('OCR failed:', error)
                        } finally {
                          setIsProcessingOCR(false)
                        }
                      }}
                      currentImage={formData.bank_photo}
                    />
                  </div>

                  {/* 銀行資料輸入 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        銀行代碼 <span className="text-danger">*</span>
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
                          placeholder="請選擇銀行"
                          isRequired
                        />
                      </div>
                      <p className="text-xs text-default-400 mt-1">例：中國信託(822)、台北富邦(012)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        銀行帳號 <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.bank_account}
                        aria-label="銀行帳號"
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          if (value.length <= 20) {
                            setFormData(prev => ({ ...prev, bank_account: value }))
                          }
                        }}
                        placeholder="請輸入銀行帳號"
                        maxLength={20}
                        className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          formData.bank_account && /^[0-9]{5,20}$/.test(formData.bank_account)
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                      {formData.bank_account && formData.bank_account.length > 0 && !/^[0-9]{5,20}$/.test(formData.bank_account) && (
                        <p className="text-xs text-danger mt-1">{i18n.language === 'zh-TW' ? '請輸入5-20位數字' : 'Enter 5-20 digits'}</p>
                      )}
                    </div>

                    <div>
                      <BranchSelector
                        bankCodes={bankCodes}
                        selectedBankCode={formData.bank_code}
                        selectedBranchCode={formData.branch_code}
                        onSelectionChange={(branchCode, branchName) => {
                          setFormData(prev => ({
                            ...prev,
                            branch_code: branchCode,
                            bank_branch: branchName
                          }))
                        }}
                        label="分行（分會）"
                        placeholder="請選擇分行或分會"
                        isRequired
                      />
                      <p className="text-xs text-default-400 mt-1">格式：0037 - 營業部</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        戶名 <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.account_name}
                        aria-label="戶名"
                        onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                        placeholder="請輸入銀行帳戶戶名"
                        className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          formData.account_name.trim()
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 子步驟 3: 確認所有資料 */}
            {currentSubStep === 3 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">資料確認</h2>
                  <p className="text-sm text-default-500">請確認所有資料無誤後繼續</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  {/* 身份證資料確認 */}
                  <div className="bg-content2 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-semibold text-primary">身份證資料</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        color="primary"
                        onPress={() => setCurrentSubStep(1)}
                        className="min-w-unit-20"
                      >
                        修改
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* 身份證照片預覽 */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-default-600">身份證照片</h4>
                        <div className="flex gap-2">
                          {formData.front_id_photo ? (
                            <div className="relative w-24 h-16 border rounded overflow-hidden">
                              <img src={formData.front_id_photo} alt="身份證正面" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1">正面</span>
                            </div>
                          ) : (
                            <div className="w-24 h-16 border rounded flex items-center justify-center bg-default-100 text-default-400 text-xs">
                              未提供
                            </div>
                          )}
                          {formData.back_id_photo ? (
                            <div className="relative w-24 h-16 border rounded overflow-hidden">
                              <img src={formData.back_id_photo} alt="身份證背面" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1">背面</span>
                            </div>
                          ) : (
                            <div className="w-24 h-16 border rounded flex items-center justify-center bg-default-100 text-default-400 text-xs">
                              未提供
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 身份資料 */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-default-500">姓名：</span>
                          <span className="text-sm font-medium">{formData.victim_name || '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-default-500">身分證字號：</span>
                          <span className="text-sm font-medium">{formData.id_number || '未填寫'}</span>
                        </div>
                        <div>
                          <span className="text-sm text-default-500">戶籍地址：</span>
                          <p className="text-sm font-medium mt-1">{formData.address || '未填寫'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 簽名區域 - 選填 */}
                  <div className="bg-content2 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-semibold text-primary">申請人簽名（選填）</h3>
                      <span className="text-sm text-warning">非必填項目</span>
                    </div>
                    <p className="text-sm text-default-600 mb-4">
                      如您方便，可在此處簽名。若不方便在電腦上簽名，可選擇略過此步驟。
                    </p>
                    <SignatureCanvas
                      onSave={(signatureFile) => {
                        // 儲存 File 物件以便上傳
                        setFileData(prev => ({ ...prev, signature: signatureFile }))

                        // 建立預覽用的 Object URL
                        const imageUrl = URL.createObjectURL(signatureFile)
                        setFormData(prev => ({ ...prev, signature: imageUrl }))
                      }}
                      label="電子簽名"
                      currentSignature={formData.signature}
                    />
                    <p className="text-xs text-default-500 mt-2">
                      * 長者或行動不便者可選擇不簽名
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 子步驟 4: 聯絡方式選擇 */}
            {currentSubStep === 4 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">聯絡方式</h2>
                  <p className="text-sm text-default-500">請選擇您的聯絡方式偏好</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="space-y-4">
                    {/* 提供手機號碼選項 */}
                    <Card
                      className={`cursor-pointer border-2 transition-colors ${
                        formData.contactOption === 'provide'
                          ? 'border-primary bg-primary-50'
                          : 'border-default-200 hover:border-default-400'
                      }`}
                      isPressable={formData.contactOption !== 'provide'}
                      onClick={() => {
                        if (formData.contactOption !== 'provide') {
                          setFormData({...formData, contactOption: 'provide'})
                          setTempPhoneNumber(formData.phone_number)
                          setShowNumberPad(true)
                        }
                      }}
                    >
                      <CardBody className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-full w-5 h-5 border-2 flex items-center justify-center ${
                            formData.contactOption === 'provide'
                              ? 'border-primary'
                              : 'border-default-400'
                          }`}>
                            {formData.contactOption === 'provide' && (
                              <div className="w-3 h-3 bg-primary rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-md font-semibold mb-2">提供手機號碼</h3>
                            <p className="text-sm text-default-600 mb-3">
                              我願意提供手機號碼，以便接收申請進度通知與重要訊息
                            </p>
                            {formData.contactOption === 'provide' && formData.phone_number && (
                              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">手機號碼</p>
                                    <p className="text-lg text-primary">{formData.phone_number}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="primary"
                                    onPress={() => {
                                      setTempPhoneNumber(formData.phone_number)
                                      setShowNumberPad(true)
                                    }}
                                  >
                                    修改
                                  </Button>
                                </div>
                                <p className="text-xs text-default-500 mt-2">
                                  * 我們將透過簡訊通知您申請進度
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* 不提供手機號碼選項 */}
                    <Card
                      className={`cursor-pointer border-2 transition-colors ${
                        formData.contactOption === 'skip'
                          ? 'border-primary bg-primary-50'
                          : 'border-default-200 hover:border-default-400'
                      }`}
                      isPressable
                      onClick={() => setFormData({...formData, contactOption: 'skip', phone_number: ''})}
                    >
                      <CardBody className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-full w-5 h-5 border-2 flex items-center justify-center ${
                            formData.contactOption === 'skip'
                              ? 'border-primary'
                              : 'border-default-400'
                          }`}>
                            {formData.contactOption === 'skip' && (
                              <div className="w-3 h-3 bg-primary rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-md font-semibold mb-2">暫不提供手機號碼</h3>
                            <p className="text-sm text-default-600 mb-3">
                              我暫時無法提供手機號碼，了解可能無法即時收到申請進度通知
                            </p>
                            {formData.contactOption === 'skip' && (
                              <div className="mt-3 bg-warning-50 rounded-lg p-3">
                                <p className="text-xs text-warning-700">
                                  ⚠️ 注意：不提供手機號碼將無法接收進度簡訊通知，您需要主動登入系統查看申請狀態
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  {/* 說明文字 */}
                  <div className="bg-default-50 rounded-lg p-4">
                    <p className="text-sm text-default-700">
                      <strong>關於聯絡方式：</strong>
                    </p>
                    <ul className="text-sm text-default-600 mt-2 space-y-1 list-disc list-inside">
                      <li>手機號碼僅用於申請進度通知，不會用於其他商業用途</li>
                      <li>即使不提供手機號碼，您的申請仍會正常處理</li>
                      <li>您可以隨時登入系統查看申請狀態</li>
                    </ul>
                  </div>

                  {/* 提交錯誤訊息 */}
                  {submitError && (
                    <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                      <p className="text-sm text-danger-700">
                        <strong>錯誤：</strong>{submitError}
                      </p>
                    </div>
                  )}
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
                if (currentSubStep > 1) {
                  setCurrentSubStep(currentSubStep - 1)
                } else {
                  handleBack()
                }
              }}
              className="px-4 md:px-6 py-2 md:py-3"
            >
{currentSubStep > 1 ? t('application.back') : t('application.backToConsent')}
            </Button>

            <Button
              color={currentSubStep === 4 ? 'success' : 'primary'}
              size="lg"
              onClick={() => {
                if (currentSubStep < 4) {
                  // 跳過子步驟2（銀行存摺資料已archive）
                  const nextStep = currentSubStep === 1 ? 3 : currentSubStep + 1
                  setCurrentSubStep(nextStep)
                } else {
                  // 進入步驟三：附加檔案上傳
                  setCurrentStep('document-upload')
                }
              }}
              isLoading={isSubmitting}
              isDisabled={
                isSubmitting ||
                (currentSubStep === 1 && !(
                  formData.victim_name.trim() &&
                  /^[A-Z][0-9]{9}$/.test(formData.id_number) &&
                  formData.address.trim()
                )) ||
                // 子步驟3（簽名）現在是選填的，無需驗證
                (currentSubStep === 4 && (
                  !formData.contactOption ||
                  (formData.contactOption === 'provide' && !formData.phone_number.trim())
                ))
              }
              className="px-6 md:px-8 py-2 md:py-3"
            >
              {isSubmitting ? t('application.submitting') : (currentSubStep === 4 ? '進入附加檔案上傳' : t('application.nextStep'))}
            </Button>
          </div>
        </div>

        {/* OCR Processing Modal */}
        <Modal
          isOpen={isProcessingOCR}
          hideCloseButton
          isDismissable={false}
          placement="center"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              AI 辨識中
            </ModalHeader>
            <ModalBody className="flex flex-col items-center justify-center py-8">
              <Spinner size="lg" color="primary" />
              <p className="mt-4 text-center text-default-600">
                {ocrMessage}
              </p>
              <p className="mt-2 text-sm text-center text-default-400">
                這可能需要幾秒鐘的時間
              </p>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Number Pad Modal */}
        <Modal
          isOpen={showNumberPad}
          onClose={() => {
            setShowNumberPad(false)
            setTempPhoneNumber('')
          }}
          placement="center"
          size="sm"
          hideCloseButton
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              輸入手機號碼
            </ModalHeader>
            <ModalBody
              onKeyDown={(e) => {
                // 支援實體鍵盤輸入
                e.preventDefault()
                e.stopPropagation()

                if (e.key >= '0' && e.key <= '9') {
                  if (tempPhoneNumber.length < 12) {
                    setTempPhoneNumber(prev => prev + e.key)
                  }
                } else if (e.key === 'Backspace') {
                  setTempPhoneNumber(prev => prev.slice(0, -1))
                } else if (e.key === 'Enter' && tempPhoneNumber.length >= 10) {
                  setFormData({...formData, phone_number: tempPhoneNumber})
                  setShowNumberPad(false)
                } else if (e.key === 'Escape') {
                  setShowNumberPad(false)
                  setTempPhoneNumber('')
                  setFormData({...formData, contactOption: '', phone_number: ''})
                }
              }}
              tabIndex={0}
              className="outline-none"
            >
              <div className="space-y-4">
                {/* Phone Number Display */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center min-h-[60px] flex items-center justify-center">
                  <p className="text-2xl font-mono">
                    {tempPhoneNumber || '請輸入號碼'}
                  </p>
                </div>

                {/* Number Pad Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button
                      key={num}
                      size="lg"
                      variant="flat"
                      className="h-16 text-xl font-semibold"
                      onPress={() => {
                        if (tempPhoneNumber.length < 12) {
                          setTempPhoneNumber(prev => prev + num)
                        }
                      }}
                    >
                      {num}
                    </Button>
                  ))}

                  {/* Special Buttons Row */}
                  <Button
                    size="lg"
                    variant="flat"
                    color="warning"
                    className="h-16"
                    onPress={() => {
                      setTempPhoneNumber(prev => prev.slice(0, -1))
                    }}
                    isDisabled={!tempPhoneNumber}
                  >
                    ← 返回
                  </Button>

                  <Button
                    size="lg"
                    variant="flat"
                    className="h-16 text-xl font-semibold"
                    onPress={() => {
                      if (tempPhoneNumber.length < 12) {
                        setTempPhoneNumber(prev => prev + '0')
                      }
                    }}
                  >
                    0
                  </Button>

                  <Button
                    size="lg"
                    variant="flat"
                    color="danger"
                    className="h-16"
                    onPress={() => {
                      setShowNumberPad(false)
                      setTempPhoneNumber('')
                      setFormData({...formData, contactOption: '', phone_number: ''})
                    }}
                  >
                    取消
                  </Button>
                </div>

                {/* Confirm Button */}
                <Button
                  color="primary"
                  size="lg"
                  className="w-full h-14 text-lg"
                  isDisabled={tempPhoneNumber.length < 10}
                  onPress={() => {
                    setFormData({...formData, phone_number: tempPhoneNumber})
                    setShowNumberPad(false)
                  }}
                >
                  確認 {tempPhoneNumber && `(${tempPhoneNumber.length} 位數)`}
                </Button>

                {/* 提示文字 */}
                <p className="text-xs text-center text-default-500">
                  提示：您也可以使用鍵盤數字鍵輸入
                </p>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      </div>
    )
  }

  // 第三步：其他文件上傳
  if (currentStep === 'document-upload') {

    const documentTypes = [
      { value: '租賃契約', label: '租賃契約' },
      { value: '戶籍謄本', label: '戶籍謄本' },
      { value: '房屋所有權狀', label: '房屋所有權狀' },
      { value: '其他', label: '其他' }
    ]

    // 新增空白上傳區塊
    const handleAddDocument = () => {
      const newDoc = {
        id: Date.now().toString(),
        type: '租賃契約',  // 預設選擇租賃契約
        customType: '',
        file: null,
        preview: null
      }
      setUploadedDocuments(prev => [...prev, newDoc])
    }

    // 處理檔案上傳（從 CameraCapture 或檔案選擇）
    const handleFileCapture = (id: string, file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedDocuments(prev =>
          prev.map(doc => doc.id === id ? {
            ...doc,
            file,
            preview: e.target?.result as string
          } : doc)
        )
      }
      reader.readAsDataURL(file)
    }

    const handleRemoveDocument = (id: string) => {
      setUploadedDocuments(prev => prev.filter(doc => doc.id !== id))
    }

    const handleDocumentTypeChange = (id: string, newType: string) => {
      setUploadedDocuments(prev =>
        prev.map(doc => doc.id === id ? { ...doc, type: newType, customType: '' } : doc)
      )
    }

    const handleCustomTypeChange = (id: string, customType: string) => {
      setUploadedDocuments(prev =>
        prev.map(doc => doc.id === id ? { ...doc, customType } : doc)
      )
    }

    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Header */}
        <div className="bg-background border-b border-divider p-3 md:p-4 w-full">
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">救災個資收集申請</h1>
                <p className="text-sm text-default-500">其他文件上傳 (3/3)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={100} size="sm" className="w-24" aria-label="進度 100%" />
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
                <p className="text-sm text-default-500">其他文件上傳</p>
                <span className="text-xs text-default-400">3/3</span>
              </div>
              <Progress value={100} color="primary" size="sm" aria-label="進度 100%" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto w-full">
            <Card className="shadow-lg">
              <CardHeader>
                <h2 className="text-2xl font-bold">其他相關文件上傳</h2>
                <p className="text-sm text-default-500 mt-2">
                  如有其他相關證明文件，請在此上傳（選填）
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* 文件上傳區塊 */}
                {uploadedDocuments.map((doc) => (
                  <Card key={doc.id} className="relative border-2 border-default-200">
                    <CardBody className="p-4">
                      {/* 刪除按鈕 */}
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="absolute top-2 right-2 z-10"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                        </svg>
                      </Button>

                      <div className="space-y-4">
                        {/* 文件類型選擇 */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">文件類型</label>
                          <select
                            value={doc.type}
                            onChange={(e) => handleDocumentTypeChange(doc.id, e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="文件類型"
                          >
                            {documentTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>

                          {/* 當選擇「其他」時顯示自訂輸入框 */}
                          {doc.type === '其他' && (
                            <input
                              type="text"
                              value={doc.customType || ''}
                              onChange={(e) => handleCustomTypeChange(doc.id, e.target.value)}
                              placeholder="請輸入文件名稱"
                              className="w-full p-2 mt-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          )}
                        </div>

                        {/* 檔案上傳/拍照區域 */}
                        {!doc.file ? (
                          <CameraCapture
                            label={
                              doc.type === '其他' && doc.customType
                                ? doc.customType
                                : doc.type
                            }
                            onCapture={(file) => handleFileCapture(doc.id, file)}
                            currentImage={null}
                          />
                        ) : (
                          <div className="relative">
                            <img
                              src={doc.preview || ''}
                              alt="Document preview"
                              className="w-full h-48 object-contain rounded-lg bg-gray-100 dark:bg-gray-800"
                            />
                            <Button
                              size="sm"
                              variant="flat"
                              onClick={() => {
                                setUploadedDocuments(prev =>
                                  prev.map(d => d.id === doc.id ? {
                                    ...d,
                                    file: null,
                                    preview: null
                                  } : d)
                                )
                              }}
                              className="absolute bottom-2 right-2"
                            >
                              重新上傳
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}

                {/* 新增文件按鈕 */}
                <div className="flex justify-center py-4">
                  <Button
                    size="lg"
                    variant="bordered"
                    onClick={handleAddDocument}
                    startContent={
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                      </svg>
                    }
                    className="w-full md:w-auto px-8"
                  >
                    新增文件上傳
                  </Button>
                </div>

                {/* 提示文字 */}
                {uploadedDocuments.length === 0 && (
                  <div className="text-center py-8 text-default-500">
                    <p className="text-lg mb-2">目前沒有上傳任何文件</p>
                    <p className="text-sm">點擊上方按鈕新增文件，或直接點擊「完成」跳過此步驟</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-divider p-6">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep('application-form')}
              className="px-6 py-3"
            >
              上一步
            </Button>
            <Button
              color="success"
              size="lg"
              onClick={async () => {
                // 直接呼叫 handleFinalSubmit，附件會在裡面一起處理
                await handleFinalSubmit()
              }}
              isLoading={isSubmitting}
              className="px-8 py-3"
            >
              {isSubmitting ? '提交中...' : '完成申請'}
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