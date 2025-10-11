'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
import HouseholdRegistration from '@/components/HouseholdRegistration'
import ContactPhoneInput from '@/components/ContactPhoneInput'
import { supabase, type BankCode } from '@/lib/supabase'
import { useCountdown } from '@/hooks/useCountdown'
import { useHouseholdUpload, type HouseholdDocument } from '@/hooks/useHouseholdUpload'
import { generateApplicationUuid, moveToApplications } from '@/lib/storage-helpers'

// 動態載入 HouseholdOCRIntegration（僅客戶端）
const HouseholdOCRIntegration = dynamic(
  () => import('@/components/HouseholdOCRIntegration'),
  { ssr: false, loading: () => <div className="text-center p-4"><Spinner /></div> }
)

type FormStep = 'consent-form' | 'application-form' | 'document-upload' | 'completed'

const steps = [
  { key: 'consent-form', title: '個資收集同意聲明', titleEn: 'Privacy Consent Declaration' },
  { key: 'application-form', title: '基本資料與證件拍照', titleEn: 'Basic Info & Document Photos' },
  { key: 'document-upload', title: '其他文件上傳', titleEn: 'Additional Documents Upload' },
]

export default function NewApplicationPage() {
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState<FormStep>('consent-form')
  const [isAgreed, setIsAgreed] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [currentSubStep, setCurrentSubStep] = useState(1) // 第三步的子步驟
  const [sessionUuid, setSessionUuid] = useState<string>('') // 表單會話 UUID7（用於檔案命名）
  const [applicationId, setApplicationId] = useState<string | null>(null) // 最終申請編號（資料庫生成）

  // 表單資料
  const [formData, setFormData] = useState({
    victim_name: '',
    id_number: '',
    address: '',
    bank_code: '',
    bank_name: '',
    bank_branch: '',
    bank_account: '',
    account_name: '',
    // 手機號碼（雙手機支援）
    householdHeadPhone: '',  // 戶長手機
    agentPhone: '',          // 代理人手機
    has_agent: false,
    agent_name: '',
    agent_id_number: '',
    agent_address: ''
  })

  // 數字鍵盤狀態
  const [showNumberPad, setShowNumberPad] = useState(false)
  const [tempPhoneNumber, setTempPhoneNumber] = useState('')

  // 檔案資料
  const [fileData, setFileData] = useState({
    frontIdPhoto: null as File | null,
    backIdPhoto: null as File | null,
    bankPhoto: null as File | null,
    frontIdPhotoAgent: null as File | null, // 代理人身份證正面
    backIdPhotoAgent: null as File | null,  // 代理人身份證背面
    // signature: null as File | null - 簽名已移除
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

  const router = useRouter()

  // 戶口名簿上傳 Hook
  const householdUpload = useHouseholdUpload()

  // 戶口名簿資料狀態
  const [hasHouseholdData, setHasHouseholdData] = useState(false)
  const [householdData, setHouseholdData] = useState<any>(null)
  const [householdScanStarted, setHouseholdScanStarted] = useState(false)

  // OCR 驗證狀態
  const [showOCRConfirmModal, setShowOCRConfirmModal] = useState(false)
  const [ocrMismatchData, setOcrMismatchData] = useState<{
    ocrName: string
    ocrIdNumber: string
    householdName: string
    householdIdNumber: string
    capturedFile: File
  } | null>(null)

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

  // 生成表單會話 UUID7（用於檔案命名）
  useEffect(() => {
    if (!sessionUuid) {
      const uuid = generateApplicationUuid()
      setSessionUuid(uuid)
      console.log('📋 表單會話 UUID7 已生成:', uuid)
    }
  }, [sessionUuid])

  // 載入銀行代碼
  useEffect(() => {
    const fetchBankCodes = async () => {
      const { data, error } = await supabase
        .from('bank_codes')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('載入銀行代碼失敗:', error)
      }

      if (data) {
        console.log('成功載入銀行代碼:', data.length, '筆')
        setBankCodes(data)
      } else {
        console.warn('未載入到銀行代碼資料')
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

  // OCR 確認 Modal 統一關閉處理
  const handleCloseOcrConfirmModal = () => {
    setShowOCRConfirmModal(false)
    setOcrMismatchData(null)
  }

  // 上傳檔案到 Storage（使用 UUID v7 作為唯一檔名，保護隱私）
  const uploadFileToStorage = async (file: File, folder: string, docType: string) => {
    // 動態匯入 uuid
    const { v7: uuidv7 } = await import('uuid')

    const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
    const uniqueId = uuidv7()
    const fileName = `${folder}/${uniqueId}_${docType}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error
    return fileName
  }

  // 提交完整申請（JSONB 格式）
  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // 1. 取得當前用戶
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('用戶未登入')
      }

      // 2. 收集所有 Storage URL 並搬移檔案
      const mediaUrls: any = {}
      console.log('📦 提交前先搬移檔案到正式區...')

      // 收集所有 temp/ 路徑
      const allTempPaths: string[] = []

      // 戶口名簿
      let pageNum = 1
      while (true) {
        const url = localStorage.getItem(`${sessionUuid}_household_page${pageNum}_url`)
        if (!url) break
        const match = url.match(/\/media\/(temp\/.+)$/)
        if (match) allTempPaths.push(match[1])
        pageNum++
      }

      // 身份證
      const idFrontUrl = localStorage.getItem(`${sessionUuid}_id_head_front_url`)
      const idBackUrl = localStorage.getItem(`${sessionUuid}_id_head_back_url`)
      if (idFrontUrl) {
        const match = idFrontUrl.match(/\/media\/(temp\/.+)$/)
        if (match) allTempPaths.push(match[1])
      }
      if (idBackUrl) {
        const match = idBackUrl.match(/\/media\/(temp\/.+)$/)
        if (match) allTempPaths.push(match[1])
      }

      // 代理人身份證
      if (formData.has_agent) {
        const agentFrontUrl = localStorage.getItem(`${sessionUuid}_id_proxy_front_url`)
        const agentBackUrl = localStorage.getItem(`${sessionUuid}_id_proxy_back_url`)
        if (agentFrontUrl) {
          const match = agentFrontUrl.match(/\/media\/(temp\/.+)$/)
          if (match) allTempPaths.push(match[1])
        }
        if (agentBackUrl) {
          const match = agentBackUrl.match(/\/media\/(temp\/.+)$/)
          if (match) allTempPaths.push(match[1])
        }
      }

      // 銀行存摺
      const bankUrl = localStorage.getItem(`${sessionUuid}_bank_book_url`)
      if (bankUrl) {
        const match = bankUrl.match(/\/media\/(temp\/.+)$/)
        if (match) allTempPaths.push(match[1])
      }

      // 簽名
      const sigUrl = localStorage.getItem(`${sessionUuid}_signature_url`)
      if (sigUrl) {
        const match = sigUrl.match(/\/media\/(temp\/.+)$/)
        if (match) allTempPaths.push(match[1])
      }

      console.log(`📋 共 ${allTempPaths.length} 個檔案需要搬移`)

      // 執行搬移
      if (allTempPaths.length > 0) {
        const movedPaths = await moveToApplications(sessionUuid, allTempPaths)
        console.log(`✅ 檔案已搬移到: applications/${sessionUuid}/`)

        // 重建 mediaUrls 使用正式路徑
        const baseUrl = 'https://sbevisitpj.tzuchi-org.tw/storage/v1/object/public/media'

        // 戶口名簿
        const householdMovedPaths = movedPaths.filter(p => p.includes('household-page'))
        if (householdMovedPaths.length > 0) {
          mediaUrls.household = householdMovedPaths.map(p => `${baseUrl}/${p}`)
        }

        // 身份證
        const idFrontMoved = movedPaths.find(p => p.includes('id-head-front'))
        const idBackMoved = movedPaths.find(p => p.includes('id-head-back'))
        if (idFrontMoved) mediaUrls.idFront = `${baseUrl}/${idFrontMoved}`
        if (idBackMoved) mediaUrls.idBack = `${baseUrl}/${idBackMoved}`

        // 代理人身份證
        const agentFrontMoved = movedPaths.find(p => p.includes('id-proxy-front'))
        const agentBackMoved = movedPaths.find(p => p.includes('id-proxy-back'))
        if (agentFrontMoved) mediaUrls.agentIdFront = `${baseUrl}/${agentFrontMoved}`
        if (agentBackMoved) mediaUrls.agentIdBack = `${baseUrl}/${agentBackMoved}`

        // 銀行存摺
        const bankMoved = movedPaths.find(p => p.includes('bank-book'))
        if (bankMoved) mediaUrls.bankBook = `${baseUrl}/${bankMoved}`

        // 簽名
        const sigMoved = movedPaths.find(p => p.includes('signature'))
        if (sigMoved) mediaUrls.signature = `${baseUrl}/${sigMoved}`
      }

      // 收集附加檔案
      const additionalFiles: string[] = []
      let fileIndex = 1
      while (true) {
        const url = localStorage.getItem(`${sessionUuid}_additional_file${fileIndex}_url`)
        if (!url) break
        additionalFiles.push(url)
        fileIndex++
      }

      // 3. 構建聯絡電話陣列
      const phones: any[] = []
      if (formData.householdHeadPhone && householdData?.householdHead) {
        phones.push({
          owner: 'householdHead',
          ownerName: householdData.householdHead.name,
          number: formData.householdHeadPhone
        })
      }
      if (formData.agentPhone && formData.has_agent) {
        phones.push({
          owner: 'agent',
          ownerName: formData.agent_name,
          number: formData.agentPhone
        })
      }

      // 4. 構建 JSONB 資料結構
      const applicationData = {
        household: householdData ? {
          header: householdData.header || {},
          householdHead: householdData.householdHead || {},
          members: householdData.members || []
        } : null,
        victim: {
          name: formData.victim_name,
          idNumber: formData.id_number,
          address: formData.address
        },
        agent: formData.has_agent ? {
          hasAgent: true,
          name: formData.agent_name,
          idNumber: formData.agent_id_number,
          address: formData.agent_address
        } : { hasAgent: false },
        bank: {
          code: formData.bank_code,
          name: formData.bank_name || '',
          branch: formData.bank_branch || '',
          account: formData.bank_account,
          accountName: formData.account_name || ''
        },
        contact: {
          phones: phones.length > 0 ? phones : null
        },
        signature: mediaUrls.signature || null,
        media: mediaUrls,
        additionalFiles: additionalFiles.length > 0 ? additionalFiles : null
      }

      console.log('📦 提交資料:', applicationData)

      // 4. 插入資料庫（JSONB 格式）
      const { data: insertData, error: insertError } = await supabase
        .from('disaster_applications')
        .insert([{
          user_id: user.id,
          application_data: applicationData,
          status: 'submitted'
        }])
        .select()
        .single()

      if (insertError) throw insertError

      const newApplicationId = insertData.id
      setApplicationId(newApplicationId)
      console.log('✅ 申請提交成功！ID:', newApplicationId)
      console.log('📁 JSONB 中的檔案路徑已是正式區（applications/）')

      // 5. 清理 localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(sessionUuid)) {
          localStorage.removeItem(key)
        }
      })

      // 7. 完成
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
      /^\d{3}$/.test(formData.bank_code) && // 銀行代碼必須是 3 位數字
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
      <div className="min-h-screen flex flex-col">
        {/* Header - RWD 友善 */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">發放訪視個資收集申請</h1>
                <p className="text-sm text-default-500">個資收集同意聲明 (1/3)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={33} size="sm" className="w-24" aria-label="進度 33%" />
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
              <h1 className="text-lg font-bold">發放訪視個資收集申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">個資授權同意書</p>
                <span className="text-xs text-default-400">1/3</span>
              </div>
              <Progress value={33} color="primary" size="sm" aria-label="進度 33%" />
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
                      aria-label="同意授權條款"
                      className="mt-1"
                    />
                    <span className="text-sm">{t('application.consentCheckbox')}</span>
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
      <>
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
                  {t(`application.subStep${currentSubStep}`)} ({currentSubStep}/5) - {i18n.language === 'zh-TW' ? '第2步' : 'Step 2'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={33 + (currentSubStep / 5) * 34} size="sm" className="w-24" color="success" aria-label={`進度 ${33 + (currentSubStep / 5) * 34}%`} />
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
              <h1 className="text-lg font-bold">發放訪視個資收集申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">{t(`application.subStep${currentSubStep}`)}</p>
                <span className="text-xs text-default-400">{currentSubStep}/5</span>
              </div>
              <Progress value={33 + (currentSubStep / 5) * 34} color="success" size="sm" aria-label={`進度 ${33 + (currentSubStep / 5) * 34}%`} />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* 子步驟 1: 戶口名簿/戶籍謄本 */}
            {currentSubStep === 1 && sessionUuid && (
              <HouseholdOCRIntegration
                sessionUuid={sessionUuid}
                setIsProcessingOCR={setIsProcessingOCR}
                setOCRMessage={setOCRMessage}
                onDocumentsChange={(hasDocuments) => {
                  setHasHouseholdData(hasDocuments)
                  console.log('Household documents updated, hasDocuments:', hasDocuments)
                }}
                onScanStarted={() => {
                  setHouseholdScanStarted(true)
                  console.log('✓ 成員掃描已開始，下一步按鈕已啟用')
                }}
                onDataChange={(data) => {
                  // 保存完整戶口名簿資料
                  setHouseholdData(data)
                  console.log('Household data updated:', data)

                  // 從戶口名簿 OCR 資料自動填入基本資料
                  if (data.householdHead) {
                    setFormData(prev => ({
                      ...prev,
                      victim_name: data.householdHead.name || prev.victim_name,
                      id_number: data.householdHead.idNumber || prev.id_number
                    }))
                  }
                }}
              />
            )}

            {/* 子步驟 2: 身份證拍照與 OCR */}
            {currentSubStep === 2 && (
              <div className="space-y-4">
                <Card className="shadow-lg">
                  <CardHeader className="flex flex-col items-start space-y-2">
                    <h2 className="text-lg font-bold">戶長身份證拍照辨識</h2>
                    <p className="text-sm text-default-500">請拍攝戶長身份證正反面，系統將自動識別資料</p>
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

                            // 呼叫 OCR API（圖片會在 xinference-client 中轉換為 base64）
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
                                if (result.data) {
                                  const ocrName = result.data.name || ''
                                  const ocrIdNumber = result.data.idNumber || ''

                                  console.log('🔍 身分證 OCR 驗證：')
                                  console.log('  OCR 結果:', { ocrName, ocrIdNumber })
                                  console.log('  戶口名簿戶長:', householdData?.householdHead)

                                  // 驗證：比對戶口名簿戶長資料
                                  if (householdData?.householdHead) {
                                    const householdName = householdData.householdHead.name || ''
                                    const householdIdNumber = householdData.householdHead.idNumber || ''

                                    console.log('  戶口名簿資料:', { householdName, householdIdNumber })

                                    // 檢查是否一致（容許部分匹配，因 OCR 可能有錯字）
                                    const nameMatch = ocrName === householdName ||
                                                      ocrName.includes(householdName) ||
                                                      householdName.includes(ocrName)
                                    const idMatch = ocrIdNumber === householdIdNumber

                                    console.log('  比對結果:', { nameMatch, idMatch })

                                    // 如果不一致，彈出確認對話框
                                    if (!nameMatch || !idMatch) {
                                      console.log('⚠️ 資料不一致，彈出確認對話框')
                                      setOcrMismatchData({
                                        ocrName,
                                        ocrIdNumber,
                                        householdName,
                                        householdIdNumber,
                                        capturedFile: file
                                      })
                                      setShowOCRConfirmModal(true)
                                      return // 等待使用者確認
                                    }

                                    console.log('✅ 資料一致，直接填入')
                                  } else {
                                    console.log('ℹ️ 無戶口名簿資料，直接填入 OCR 結果')
                                  }

                                  // 資料一致或無戶口名簿資料，直接填入
                                  setFormData(prev => ({
                                    ...prev,
                                    victim_name: ocrName || prev.victim_name,
                                    id_number: ocrIdNumber || prev.id_number
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

                            // 呼叫 OCR API
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
                                if (result.data) {
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

                  {/* 代理人選項 */}
                  <div className="border-t pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.has_agent}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, has_agent: e.target.checked }))
                          // 清空代理人資料
                          if (!e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              agent_name: '',
                              agent_id_number: '',
                              agent_address: ''
                            }))
                            setFileData(prev => ({
                              ...prev,
                              frontIdPhotoAgent: null,
                              backIdPhotoAgent: null
                            }))
                          }
                        }}
                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm font-medium text-foreground">
                        由代理人代為領取（需提供代理人身份證）
                      </span>
                    </label>
                  </div>
                </CardBody>
              </Card>

              {/* 代理人身份證卡片 */}
              {formData.has_agent && (
                <Card className="shadow-lg border-2 border-primary">
                  <CardHeader className="flex flex-col items-start space-y-2 bg-primary-50">
                    <h2 className="text-lg font-bold text-primary">代理人身份證拍照辨識</h2>
                    <p className="text-sm text-default-500">請拍攝代理人身份證正反面，系統將自動識別資料</p>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* 代理人身份證正面 */}
                      <div className="space-y-4">
                        <h3 className="text-md font-semibold text-primary">代理人身份證正面</h3>

                        {/* 拍照/上傳區域 */}
                        <div className="relative">
                          <CameraCapture
                            label="代理人身份證正面"
                            onCapture={async (file) => {
                              const imageUrl = URL.createObjectURL(file)
                              setFormData(prev => ({ ...prev, front_id_photo_agent: imageUrl }))

                              // 呼叫 OCR API
                              try {
                                setIsProcessingOCR(true)
                                setOCRMessage('AI 正在辨識代理人身分證正面，請稍候...')

                                const formDataApi = new FormData()
                                formDataApi.append('image', file)
                                formDataApi.append('type', 'front')

                                const response = await fetch('/api/ocr', {
                                  method: 'POST',
                                  body: formDataApi
                                })

                                if (response.ok) {
                                  const result = await response.json()
                                  if (result.data) {
                                    setFormData(prev => ({
                                      ...prev,
                                      agent_name: result.data.name || prev.agent_name,
                                      agent_id_number: result.data.idNumber || prev.agent_id_number
                                    }))
                                  }
                                }
                              } catch (error) {
                                console.error('OCR failed:', error)
                              } finally {
                                setIsProcessingOCR(false)
                              }
                            }}
                            currentImage={formData.front_id_photo_agent}
                          />
                        </div>

                        {/* OCR 識別結果輸入框 */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              代理人姓名 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.agent_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                              aria-label="代理人姓名"
                              placeholder="請輸入代理人姓名"
                              className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                                formData.agent_name.trim()
                                  ? 'border-success focus:border-success focus:ring-success/20'
                                  : 'border-default-300 focus:border-primary focus:ring-primary/20'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              代理人身分證字號 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.agent_id_number}
                              aria-label="代理人身分證字號"
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
                                if (value.length <= 10) {
                                  setFormData(prev => ({ ...prev, agent_id_number: value }))
                                }
                              }}
                              placeholder="A123456789"
                              maxLength={10}
                              className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                                /^[A-Z][0-9]{9}$/.test(formData.agent_id_number)
                                  ? 'border-success focus:border-success focus:ring-success/20'
                                  : 'border-default-300 focus:border-primary focus:ring-primary/20'
                              }`}
                            />
                            {formData.agent_id_number && !/^[A-Z][0-9]{9}$/.test(formData.agent_id_number) && (
                              <p className="text-xs text-danger mt-1">
                                {i18n.language === 'zh-TW' ? '格式錯誤：需要1個英文字母 + 9個數字' : 'Invalid format: 1 letter + 9 digits required'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 代理人身份證背面 */}
                      <div className="space-y-4">
                        <h3 className="text-md font-semibold text-primary">代理人身份證背面</h3>

                        {/* 拍照/上傳區域 */}
                        <div className="relative">
                          <CameraCapture
                            label="代理人身份證背面"
                            onCapture={async (file) => {
                              const imageUrl = URL.createObjectURL(file)
                              setFormData(prev => ({ ...prev, back_id_photo_agent: imageUrl }))

                              // 呼叫 OCR API
                              try {
                                setIsProcessingOCR(true)
                                setOCRMessage('AI 正在辨識代理人身分證背面，請稍候...')

                                const formDataApi = new FormData()
                                formDataApi.append('image', file)
                                formDataApi.append('type', 'back')

                                const response = await fetch('/api/ocr', {
                                  method: 'POST',
                                  body: formDataApi
                                })

                                if (response.ok) {
                                  const result = await response.json()
                                  if (result.data) {
                                    setFormData(prev => ({
                                      ...prev,
                                      agent_address: result.data.address || prev.agent_address
                                    }))
                                  }
                                }
                              } catch (error) {
                                console.error('OCR failed:', error)
                              } finally {
                                setIsProcessingOCR(false)
                              }
                            }}
                            currentImage={formData.back_id_photo_agent}
                          />
                        </div>

                        {/* OCR 識別結果輸入框 */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              代理人戶籍地址 <span className="text-danger">*</span>
                            </label>
                            <textarea
                              value={formData.agent_address}
                              onChange={(e) => setFormData(prev => ({ ...prev, agent_address: e.target.value }))}
                              placeholder="請輸入代理人戶籍地址"
                              aria-label="代理人戶籍地址"
                              rows={3}
                              className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 resize-none ${
                                formData.agent_address.trim()
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
              </div>
            )}

            {/* 子步驟 3: 銀行存摺拍照與資料填寫 */}
            {currentSubStep === 3 && (
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

                        // 呼叫 OCR API 進行存摺識別
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
                            console.log('🔍 OCR 原始結果:', result)

                            if (result.data) {
                              console.log('📄 OCR data:', result.data)

                              // 自動填入識別的銀行資料
                              // 處理可能的欄位名稱變化
                              const bankName = result.data.銀行 || result.data.bank || result.data.bankName
                              const branch = result.data.分行 || result.data.分會 || result.data.分社 || result.data.branch || result.data.branchName
                              const accountName = result.data.戶名 || result.data.accountName || result.data.name
                              const accountNumber = result.data.銀行帳號 || result.data.帳號 || result.data.accountNumber || result.data.account

                              console.log('💳 解析結果:', { bankName, branch, accountName, accountNumber })

                              // 如果識別到銀行名稱，嘗試找到對應的銀行代碼
                              if (bankName) {
                                console.log('🔎 搜尋銀行:', bankName)

                                // 智能匹配邏輯
                                let bank = bankCodes.find(b => b.name.includes(bankName) || bankName.includes(b.name))

                                // 如果直接匹配失敗，嘗試更寬鬆的匹配
                                if (!bank) {
                                  // 移除常見後綴和替換常見縮寫
                                  const cleanedName = bankName
                                    .replace(/分行|分社|分會/g, '')
                                    .replace(/信合|信合社/g, '信用合作社')
                                    .replace(/一信|第一信/g, '第一信用合作社')
                                    .replace(/二信|第二信/g, '第二信用合作社')
                                    .replace(/三信|第三信/g, '第三信用合作社')

                                  console.log('🔎 使用關鍵字搜尋:', cleanedName)

                                  bank = bankCodes.find(b => {
                                    return b.name.includes(cleanedName) || cleanedName.includes(b.name)
                                  })
                                }

                                // 如果還是找不到，嘗試只用地區名稱匹配
                                if (!bank && bankName.length >= 2) {
                                  console.log('🔎 嘗試地區名稱匹配...')
                                  // 提取地區名（前面的中文字）
                                  const region = bankName.match(/^[\u4e00-\u9fff]+/)?.[0]
                                  if (region && region.length >= 2) {
                                    console.log('🔎 地區:', region)
                                    bank = bankCodes.find(b =>
                                      b.name.startsWith(region) &&
                                      (b.type === 'credit_union' || bankName.includes('信'))
                                    )
                                  }
                                }

                                console.log('✅ 找到銀行:', bank)

                                if (bank) {
                                  setFormData(prev => ({
                                    ...prev,
                                    bank_code: bank.code,
                                    bank_name: bank.name
                                  }))
                                  setOCRMessage(`✅ 已自動識別：${bank.name}`)
                                } else {
                                  console.warn('⚠️  未找到匹配的銀行，bankName:', bankName)
                                  setOCRMessage(`⚠️ 未能匹配銀行「${bankName}」，請手動選擇`)
                                }
                              } else {
                                console.warn('⚠️  OCR 未識別到銀行名稱')
                              }

                              // 填入其他識別的資料
                              if (branch) {
                                setFormData(prev => ({
                                  ...prev,
                                  bank_branch: branch
                                }))
                              }

                              if (accountName) {
                                setFormData(prev => ({
                                  ...prev,
                                  account_name: accountName
                                }))
                              }

                              if (accountNumber) {
                                // 清理帳號中的空格或破折號
                                const cleanedAccount = accountNumber.replace(/[\s\-]/g, '')
                                setFormData(prev => ({
                                  ...prev,
                                  bank_account: cleanedAccount
                                }))
                              }
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
                        分行（分會） <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bank_branch}
                        aria-label="分行（分會）"
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_branch: e.target.value }))}
                        placeholder="請輸入分行或分會名稱"
                        className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                          formData.bank_branch.trim()
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-default-300 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
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

            {/* 子步驟 4: 確認所有資料 */}
            {currentSubStep === 4 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">資料確認</h2>
                  <p className="text-sm text-default-500">請確認所有資料無誤後繼續</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  {/* 戶口名簿資料確認 */}
                  {householdData && (
                    <div className="bg-content2 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-semibold text-primary">戶口名簿資料</h3>
                        <div className="text-xs text-default-500">
                          📝 所有欄位可直接點擊修改
                        </div>
                      </div>

                      {/* 基本資料（可編輯）*/}
                      <div className="mb-6 pb-4 border-b border-default-200">
                        <h4 className="text-sm font-semibold mb-3 text-default-700">📋 基本資料</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-default-500 mb-1">戶號</label>
                            <input
                              type="text"
                              value={householdData.header?.householdNumber || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                header: { ...householdData.header, householdNumber: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">戶長統號</label>
                            <input
                              type="text"
                              value={householdData.header?.householdHeadIdNumber || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                header: { ...householdData.header, householdHeadIdNumber: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">戶別</label>
                            <input
                              type="text"
                              value={householdData.header?.householdType || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                header: { ...householdData.header, householdType: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-default-500 mb-1">戶籍地址</label>
                            <input
                              type="text"
                              value={householdData.header?.address || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                header: { ...householdData.header, address: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 戶長資料（可編輯）*/}
                      <div className="mb-6 pb-4 border-b border-default-200">
                        <h4 className="text-sm font-semibold mb-3 text-default-700">👤 戶長</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-default-500 mb-1">姓名</label>
                            <input
                              type="text"
                              value={householdData.householdHead?.name || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                householdHead: { ...householdData.householdHead, name: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">性別</label>
                            <input
                              type="text"
                              value={householdData.householdHead?.gender || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                householdHead: { ...householdData.householdHead, gender: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">出生日期</label>
                            <input
                              type="text"
                              value={householdData.householdHead?.birthDate || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                householdHead: { ...householdData.householdHead, birthDate: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-default-500 mb-1">身分證字號</label>
                            <input
                              type="text"
                              value={householdData.householdHead?.idNumber || ''}
                              onChange={(e) => setHouseholdData({
                                ...householdData,
                                householdHead: { ...householdData.householdHead, idNumber: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 成員資料（可編輯）*/}
                      {householdData.members && householdData.members.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-default-700">
                            👥 家族成員（共 {householdData.members.length} 位）
                          </h4>
                          <div className="space-y-4">
                            {householdData.members.map((member: any, idx: number) => (
                              <div key={member.id} className="bg-default-100 rounded-lg p-3">
                                <div className="text-xs font-semibold text-default-600 mb-2">
                                  成員 {idx + 1}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-default-500 mb-1">姓名</label>
                                    <input
                                      type="text"
                                      value={member.name || ''}
                                      onChange={(e) => {
                                        const newMembers = [...householdData.members]
                                        newMembers[idx] = { ...newMembers[idx], name: e.target.value }
                                        setHouseholdData({ ...householdData, members: newMembers })
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-default-500 mb-1">性別</label>
                                    <input
                                      type="text"
                                      value={member.gender || ''}
                                      onChange={(e) => {
                                        const newMembers = [...householdData.members]
                                        newMembers[idx] = { ...newMembers[idx], gender: e.target.value }
                                        setHouseholdData({ ...householdData, members: newMembers })
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-default-500 mb-1">出生日期</label>
                                    <input
                                      type="text"
                                      value={member.birthDate || ''}
                                      onChange={(e) => {
                                        const newMembers = [...householdData.members]
                                        newMembers[idx] = { ...newMembers[idx], birthDate: e.target.value }
                                        setHouseholdData({ ...householdData, members: newMembers })
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-default-500 mb-1">身分證字號</label>
                                    <input
                                      type="text"
                                      value={member.idNumber || ''}
                                      onChange={(e) => {
                                        const newMembers = [...householdData.members]
                                        newMembers[idx] = { ...newMembers[idx], idNumber: e.target.value }
                                        setHouseholdData({ ...householdData, members: newMembers })
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="block text-xs text-default-500 mb-1">與戶長關係</label>
                                    <input
                                      type="text"
                                      value={member.relationship || ''}
                                      onChange={(e) => {
                                        const newMembers = [...householdData.members]
                                        newMembers[idx] = { ...newMembers[idx], relationship: e.target.value }
                                        setHouseholdData({ ...householdData, members: newMembers })
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-default-300 rounded bg-content1"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 受災者身份證資料確認 */}
                  <div className="bg-content2 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-semibold text-primary">受災者身份證資料</h3>
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

                  {/* 代理人身份證資料確認（如果有）*/}
                  {formData.has_agent && (
                    <div className="bg-content2 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-semibold text-primary">代理人身份證資料</h3>
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
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-default-500">姓名：</span>
                          <span className="text-sm font-medium">{formData.agent_name || '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-default-500">身分證字號：</span>
                          <span className="text-sm font-medium">{formData.agent_id_number || '未填寫'}</span>
                        </div>
                        <div>
                          <span className="text-sm text-default-500">戶籍地址：</span>
                          <p className="text-sm font-medium mt-1">{formData.agent_address || '未填寫'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 銀行資料確認 */}
                  <div className="bg-content2 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-semibold text-primary">銀行存摺資料</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        color="primary"
                        onPress={() => setCurrentSubStep(2)}
                        className="min-w-unit-20"
                      >
                        修改
                      </Button>
                    </div>
                    {/* 銀行資料 */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">銀行代碼：</span>
                        <span className="text-sm font-medium">{formData.bank_code ? `${formData.bank_code} - ${formData.bank_name}` : '未填寫'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">分行（分會）：</span>
                        <span className="text-sm font-medium">{formData.bank_branch || '未填寫'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">銀行帳號：</span>
                        <span className="text-sm font-medium">{formData.bank_account || '未填寫'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">戶名：</span>
                        <span className="text-sm font-medium">{formData.account_name || '未填寫'}</span>
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
                      onSave={(signature) => {
                        setFormData(prev => ({ ...prev, signature }))
                      }}
                      width={300}
                      height={150}
                      currentSignature={formData.signature}
                    />
                    <p className="text-xs text-default-500 mt-2">
                      * 長者或行動不便者可選擇不簽名
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 子步驟 5: 聯絡電話 */}
            {currentSubStep === 5 && (
              <ContactPhoneInput
                householdHeadName={householdData?.householdHead?.name}
                householdHeadPhone={formData.householdHeadPhone}
                onHouseholdHeadPhoneChange={(phone) => setFormData({...formData, householdHeadPhone: phone})}
                hasAgent={formData.has_agent}
                agentName={formData.agent_name}
                agentPhone={formData.agentPhone}
                onAgentPhoneChange={(phone) => setFormData({...formData, agentPhone: phone})}
              />
            )}

            {/* 舊的選項卡片已刪除 */}

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
              color={currentSubStep === 5 ? 'success' : 'primary'}
              size="lg"
              onClick={() => {
                if (currentSubStep < 5) {
                  setCurrentSubStep(currentSubStep + 1)
                } else {
                  // 進入步驟三：附加檔案上傳
                  setCurrentStep('document-upload')
                }
              }}
              isLoading={isSubmitting}
              isDisabled={
                isSubmitting ||
                // 子步驟 1: 戶口名簿驗證（必須點擊完成掃描）
                (currentSubStep === 1 && !householdScanStarted) ||
                // 子步驟 2: 身分證資料驗證（含代理人驗證）
                (currentSubStep === 2 && !(
                  formData.victim_name.trim() &&
                  /^[A-Z][0-9]{9}$/.test(formData.id_number) &&
                  formData.address.trim() &&
                  // 如果有代理人，也需要驗證代理人資料
                  (!formData.has_agent || (
                    formData.agent_name.trim() &&
                    /^[A-Z][0-9]{9}$/.test(formData.agent_id_number) &&
                    formData.agent_address.trim()
                  ))
                )) ||
                // 子步驟 3: 銀行資料驗證
                (currentSubStep === 3 && !(
                  formData.bank_code &&
                  formData.bank_branch.trim() &&
                  formData.bank_account &&
                  /^[0-9]{5,20}$/.test(formData.bank_account) &&
                  formData.account_name.trim()
                )) ||
                // 子步驟 5: 聯絡電話驗證（至少一個）
                (currentSubStep === 5 && !formData.householdHeadPhone && !formData.agentPhone)
              }
              className="px-6 md:px-8 py-2 md:py-3"
            >
              {isSubmitting ? t('application.submitting') : (currentSubStep === 5 ? '進入附加檔案上傳' : t('application.nextStep'))}
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

        {/* OCR 資料不一致確認對話框 */}
        {showOCRConfirmModal && ocrMismatchData && (
          <Modal
            isOpen={true}
            onClose={() => {
              // 點擊背景或按 Esc 關閉時，清除照片並重置狀態
              setFormData(prev => ({ ...prev, front_id_photo: undefined }))
              handleCloseOcrConfirmModal()
            }}
            size="lg"
            isDismissable={true}
          >
            <ModalContent>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="orange">
                    <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                  </svg>
                  <span className="text-warning">資料不一致，請確認</span>
                </div>
              </ModalHeader>
              <ModalBody className="space-y-4 pb-6">
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                  <p className="text-sm text-warning-800 font-medium mb-2">
                    ⚠️ 身分證 OCR 識別結果與戶口名簿資料不符
                  </p>
                  <p className="text-xs text-warning-700">
                    請確認您拍攝/上傳的是否為戶長的身份證正面？
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 戶口名簿資料 */}
                  <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                    <p className="text-xs text-success-700 font-semibold mb-2">
                      ✓ 戶口名簿資料（正確）
                    </p>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-default-500">姓名：</span>
                        <span className="font-medium text-success-800">{ocrMismatchData.householdName}</span>
                      </div>
                      <div>
                        <span className="text-default-500">身分證：</span>
                        <span className="font-medium text-success-800">{ocrMismatchData.householdIdNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* OCR 識別結果 */}
                  <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                    <p className="text-xs text-danger-700 font-semibold mb-2">
                      ⚠️ 身分證 OCR 結果
                    </p>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-default-500">姓名：</span>
                        <span className="font-medium text-danger-800">{ocrMismatchData.ocrName}</span>
                      </div>
                      <div>
                        <span className="text-default-500">身分證：</span>
                        <span className="font-medium text-danger-800">{ocrMismatchData.ocrIdNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <p className="text-sm text-primary-800 font-medium mb-3">
                    請確認您拍攝/上傳的身份證是否為戶長本人？
                  </p>
                  <div className="space-y-2">
                    <Button
                      color="success"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        // 選「是」→ 使用戶口名簿資料校正
                        setFormData(prev => ({
                          ...prev,
                          victim_name: ocrMismatchData.householdName,
                          id_number: ocrMismatchData.householdIdNumber
                        }))
                        handleCloseOcrConfirmModal()
                      }}
                    >
                      ✓ 是，這是戶長身份證（使用戶口名簿資料校正）
                    </Button>
                    <Button
                      color="danger"
                      variant="flat"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        // 選「否」→ 清除照片，重新拍攝
                        setFormData(prev => ({ ...prev, front_id_photo: undefined }))
                        handleCloseOcrConfirmModal()
                      }}
                    >
                      ✗ 否，拍錯了（重新拍攝）
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-center text-default-500">
                  💡 提示：如果確認是戶長身份證，系統將以戶口名簿資料為準進行校正
                </p>
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </>
    )
  }

  // 第三步：其他文件上傳
  if (currentStep === 'document-upload') {

    const documentTypes = [
      { value: 'lease', label: '租賃契約' },
      { value: 'household-registration', label: '戶籍謄本' },
      { value: 'property-ownership', label: '房屋所有權狀' },
      { value: 'other', label: '其他' }
    ]

    // 新增空白上傳區塊
    const handleAddDocument = () => {
      const newDoc = {
        id: Date.now().toString(),
        type: 'lease',  // 預設選擇租賃契約
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
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-background border-b border-divider p-3 md:p-4">
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">發放訪視個資收集申請</h1>
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
              <h1 className="text-lg font-bold">發放訪視個資收集申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">其他文件上傳</p>
                <span className="text-xs text-default-400">3/3</span>
              </div>
              <Progress value={100} color="primary" size="sm" aria-label="進度 100%" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
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
                          {doc.type === 'other' && (
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
                              doc.type === 'other' && doc.customType
                                ? doc.customType
                                : documentTypes.find(t => t.value === doc.type)?.label || '文件'
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
                // 上傳附加檔案（如果有）
                const validDocuments = uploadedDocuments.filter(doc => doc.file !== null)

                if (validDocuments.length > 0) {
                  // TODO: 上傳附加檔案到 Supabase Storage
                  console.log('上傳附加檔案:', validDocuments)
                }

                // 提交申請
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