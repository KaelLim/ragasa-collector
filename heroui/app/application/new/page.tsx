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

type FormStep = 'comfort-letter' | 'consent-form' | 'application-form' | 'completed'

const steps = [
  { key: 'comfort-letter', title: '上人慰問信', titleEn: 'Comfort Letter' },
  { key: 'consent-form', title: '個資授權同意書', titleEn: 'Consent Form' },
  { key: 'application-form', title: '應急慰問金匯款資訊', titleEn: 'Relief Fund Application' },
]

export default function NewApplicationPage() {
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState<FormStep>('comfort-letter')
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
    bank_account: ''
  })

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

  const router = useRouter()

  // 載入銀行代碼
  useEffect(() => {
    const fetchBankCodes = async () => {
      const { data, error } = await supabase
        .from('bank_codes')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (data) {
        setBankCodes(data)
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

      // 2. 插入基本資料到資料庫
      const { data: applicationData, error: insertError } = await supabase
        .from('disaster_applications')
        .insert([{
          user_id: user.id,
          victim_name: formData.victim_name,
          id_number: formData.id_number,
          phone_number: formData.phone_number,
          address: formData.address,
          bank_code: formData.bank_code,
          bank_account: formData.bank_account
        }])
        .select()
        .single()

      if (insertError) throw insertError

      const newApplicationId = applicationData.id
      setApplicationId(newApplicationId)

      // 3. 上傳所有檔案
      const uploads: Promise<string>[] = []
      const updateData: any = {}

      if (fileData.frontIdPhoto) {
        uploads.push(uploadFileToStorage(fileData.frontIdPhoto, 'front_id', newApplicationId))
        updateData.front_id_photo = `front_id/${newApplicationId}.jpg`
      }

      if (fileData.backIdPhoto) {
        uploads.push(uploadFileToStorage(fileData.backIdPhoto, 'back_id', newApplicationId))
        updateData.back_id_photo = `back_id/${newApplicationId}.jpg`
      }

      if (fileData.bankPhoto) {
        uploads.push(uploadFileToStorage(fileData.bankPhoto, 'bank_account', newApplicationId))
        updateData.bank_photo = `bank_account/${newApplicationId}.jpg`
      }

      if (fileData.signature) {
        uploads.push(uploadFileToStorage(fileData.signature, 'signature', newApplicationId))
        updateData.signature = `signature/${newApplicationId}.png`
      }

      // 4. 執行所有檔案上傳
      if (uploads.length > 0) {
        await Promise.all(uploads)

        // 5. 更新資料庫記錄
        const { error: updateError } = await supabase
          .from('disaster_applications')
          .update(updateData)
          .eq('id', newApplicationId)

        if (updateError) throw updateError
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

  const validateSignature = () => {
    return fileData.signature
  }

  // 第一步：上人慰問信
  if (currentStep === 'comfort-letter') {
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
              <Progress value={33} size="sm" className="w-24" />
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
              <Progress value={33} color="primary" size="sm" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full flex flex-col gap-8 justify-center items-center">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              {/* Mobile: 001在上, Desktop: 002在左 */}
              <Card className="shadow-2xl cursor-pointer hover:shadow-3xl transition-shadow order-1 md:order-2">
                <CardBody className="p-0">
                  <img
                    src="/content/letter-page-1.jpg"
                    alt="上人慰問信 - 第一頁 (001)"
                    className="h-auto max-h-[50vh] md:max-h-[60vh] object-contain rounded-lg w-full"
                    onClick={() => setSelectedImage('/content/letter-page-1.jpg')}
                  />
                </CardBody>
              </Card>
              {/* Mobile: 002在下, Desktop: 001在右 */}
              <Card className="shadow-2xl cursor-pointer hover:shadow-3xl transition-shadow order-2 md:order-1">
                <CardBody className="p-0">
                  <img
                    src="/content/letter-page-2.jpg"
                    alt="上人慰問信 - 第二頁 (002)"
                    className="h-auto max-h-[50vh] md:max-h-[60vh] object-contain rounded-lg w-full"
                    onClick={() => setSelectedImage('/content/letter-page-2.jpg')}
                  />
                </CardBody>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-divider p-6">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <Button
              as="a"
              href="/content/comfort-letter.pdf"
              target="_blank"
              variant="ghost"
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              }
            >
{t('application.downloadPdf')}
            </Button>
            <Button color="primary" size="lg" onClick={handleNext} className="px-8 py-3">
              {t('application.readAndContinue')}
            </Button>
          </div>
        </div>

        {/* 全螢幕圖片 Modal */}
        <Modal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          size="full"
          classNames={{
            base: "bg-black/90",
            backdrop: "bg-black/50"
          }}
          isDismissable
          isKeyboardDismissDisabled={false}
        >
          <ModalContent>
            <ModalHeader className="text-white cursor-pointer" onClick={() => setSelectedImage(null)}>
              {selectedImage?.includes('page-1') ? '第一頁' : '第二頁'} （點擊任何地方關閉）
            </ModalHeader>
            <ModalBody
              className="flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setSelectedImage(null)}
            >
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="放大檢視"
                  className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </div>
    )
  }

  // 第二步：個資授權同意書
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
                <h1 className="text-xl font-bold">救災個資收集申請</h1>
                <p className="text-sm text-default-500">個資授權同意書 (2/3)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={66} size="sm" className="w-24" />
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
              <Progress value={66} color="primary" size="sm" />
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

  // 第三步：基本資料表單
  if (currentStep === 'application-form') {
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
              <Progress value={66 + (currentSubStep / 4) * 34} size="sm" className="w-24" color="success" />
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
              <Progress value={66 + (currentSubStep / 4) * 34} color="success" size="sm" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* 子步驟 1: 基本資料填寫 */}
            {currentSubStep === 1 && (
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

            {/* 子步驟 2: 證件拍照 */}
            {currentSubStep === 2 && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start space-y-2">
                  <h2 className="text-lg font-bold">{t('application.documentPhoto')}</h2>
                  <p className="text-sm text-default-500">{t('application.documentPhotoDesc')}</p>
                </CardHeader>
                <CardBody className="space-y-8">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-md font-semibold mb-4 text-primary">1. {t('application.idFront')}</h3>
                      <CameraCapture
                        label={t('application.idFront')}
                        onCapture={(file) => setFileData(prev => ({ ...prev, frontIdPhoto: file }))}
                        isRequired
                        currentImage={fileData.frontIdPhoto ? URL.createObjectURL(fileData.frontIdPhoto) : null}
                      />
                    </div>

                    <div>
                      <h3 className="text-md font-semibold mb-4 text-primary">2. {t('application.idBack')}</h3>
                      <CameraCapture
                        label={t('application.idBack')}
                        onCapture={(file) => setFileData(prev => ({ ...prev, backIdPhoto: file }))}
                        isRequired
                        currentImage={fileData.backIdPhoto ? URL.createObjectURL(fileData.backIdPhoto) : null}
                      />
                    </div>

                    <div>
                      <h3 className="text-md font-semibold mb-4 text-primary">3. {t('application.bankProof')}</h3>
                      <CameraCapture
                        label={t('application.bankProofDoc')}
                        onCapture={(file) => setFileData(prev => ({ ...prev, bankPhoto: file }))}
                        isRequired
                        currentImage={fileData.bankPhoto ? URL.createObjectURL(fileData.bankPhoto) : null}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 子步驟 3: 電子簽名 */}
            {currentSubStep === 3 && (
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
                  <p className="text-sm text-default-500">請確認所有資料無誤後提交申請</p>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 基本資料預覽 */}
                    <Card className="bg-content2">
                      <CardHeader>
                        <h3 className="font-semibold">基本資料</h3>
                      </CardHeader>
                      <CardBody className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-default-500">姓名：</span>
                          <span>{formData.victim_name || '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">身分證：</span>
                          <span>{formData.id_number || '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">電話：</span>
                          <span>{formData.phone_number || '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">地址：</span>
                          <span className="text-right text-xs">{formData.address || '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">銀行：</span>
                          <span className="text-xs">{formData.bank_code ? `${formData.bank_code} - ${formData.bank_name}` : '未填寫'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-default-500">帳號：</span>
                          <span>{formData.bank_account || '未填寫'}</span>
                        </div>
                      </CardBody>
                    </Card>

                    {/* 檔案預覽 */}
                    <Card className="bg-content2">
                      <CardHeader>
                        <h3 className="font-semibold">上傳檔案</h3>
                      </CardHeader>
                      <CardBody className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-default-500">身分證正面：</span>
                          <span className={fileData.frontIdPhoto ? 'text-success' : 'text-danger'}>
                            {fileData.frontIdPhoto ? '✓ 已上傳' : '✗ 未上傳'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500">身分證反面：</span>
                          <span className={fileData.backIdPhoto ? 'text-success' : 'text-danger'}>
                            {fileData.backIdPhoto ? '✓ 已上傳' : '✗ 未上傳'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500">銀行證明：</span>
                          <span className={fileData.bankPhoto ? 'text-success' : 'text-danger'}>
                            {fileData.bankPhoto ? '✓ 已上傳' : '✗ 未上傳'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-default-500">電子簽名：</span>
                          <span className={fileData.signature ? 'text-success' : 'text-danger'}>
                            {fileData.signature ? '✓ 已完成' : '✗ 未完成'}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

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
                  setCurrentSubStep(currentSubStep + 1)
                } else {
                  // 真正提交到 Supabase
                  handleFinalSubmit()
                }
              }}
              isLoading={isSubmitting}
              isDisabled={
                isSubmitting ||
                (currentSubStep === 1 && !validateBasicInfo()) ||
                (currentSubStep === 2 && !validatePhotos()) ||
                (currentSubStep === 3 && !validateSignature())
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