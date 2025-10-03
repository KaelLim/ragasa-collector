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
import VillageSelector from '@/components/VillageSelector'
import { supabase, type BankCode } from '@/lib/supabase'
import { ocrClient } from '@/lib/ocr-client'
import { ragicClient } from '@/lib/ragic-client'
import { getRagicImageUrl } from '@/lib/ragic-utils'
import { useCountdown } from '@/hooks/useCountdown'

type FormStep = 'consent-form' | 'application-form' | 'document-upload' | 'data-confirmation' | 'completed'

const steps = [
  { key: 'consent-form', title: '個資收集同意聲明', titleEn: 'Privacy Consent Declaration' },
  { key: 'application-form', title: '基本資料與證件拍照', titleEn: 'Basic Info & Document Photos' },
  { key: 'document-upload', title: '其他文件上傳', titleEn: 'Additional Documents Upload' },
  { key: 'data-confirmation', title: '資料確認', titleEn: 'Data Confirmation' },
]

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ragicId } = use(params)
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<FormStep>('application-form')
  const [isAgreed, setIsAgreed] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [currentSubStep, setCurrentSubStep] = useState(1) // 第三步的子步驟
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [villageExistsInRagic, setVillageExistsInRagic] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // 表單資料
  const [formData, setFormData] = useState({
    village: '',  // 大村欄位
    victim_name: '',
    id_number: '',
    phone_number: '',
    // 身分證背面地址
    id_city_district: '', // 縣市行政區
    id_village_li: '',    // 村/里
    id_address: '',       // 地址
    // 戶籍謄本地址
    household_city_district: '', // 縣市行政區
    household_village_li: '',    // 村/里
    household_address: '',       // 地址
    bank_code: '',
    bank_name: '',
    branch_code: '',
    bank_branch: '',
    bank_account: '',
    account_name: '',
    contactOption: '' as '' | 'provide' | 'skip',
    signature: null as string | null,
    front_id_photo: null as string | null,
    back_id_photo: null as string | null,
    household_doc_photo: null as string | null,  // 戶籍謄本照片
    bank_photo: '' as string
  })

  // 數字鍵盤狀態
  const [showNumberPad, setShowNumberPad] = useState(false)
  const [tempPhoneNumber, setTempPhoneNumber] = useState('')

  // 檔案資料
  const [fileData, setFileData] = useState({
    frontIdPhoto: null as File | null,
    backIdPhoto: null as File | null,
    householdDoc: null as File | null,  // 戶籍謄本
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
    customName: string  // 使用者自訂的文件名稱
    file: File | null
    preview: string | null
  }>>([])

  // 倒數計時器 Hook - 必須在頂層調用，不能在條件內
  const { timeLeft, isComplete, percentage } = useCountdown(5, {
    autoStart: currentStep === 'consent-form'
  })

  // 載入 Ragic 資料
  useEffect(() => {
    const loadRagicData = async () => {
      try {
        // 檢查登入
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }

        // 從 Ragic 讀取資料
        const response = await fetch(`/api/ragic-detail?id=${ragicId}`)

        if (!response.ok) {
          throw new Error('無法載入資料')
        }

        const result = await response.json()

        if (result.success) {
          const data = result.data

          // 預填表單資料
          setFormData({
            village: data.village || '',
            victim_name: data.name || '',
            id_number: data.idNumber || '',
            phone_number: '',
            id_city_district: data.cityDistrict || '',
            id_village_li: data.villageLi || '',
            id_address: data.address || '',
            household_city_district: data.cityDistrict2 || '',
            household_village_li: data.villageLi2 || '',
            household_address: data.address2 || '',
            bank_code: '',
            bank_name: '',
            branch_code: '',
            bank_branch: '',
            bank_account: '',
            account_name: '',
            contactOption: '' as '' | 'provide' | 'skip',
            signature: '',
            front_id_photo: data.frontIdPhoto ? getRagicImageUrl(data.frontIdPhoto) || '' : '',
            back_id_photo: data.backIdPhoto ? getRagicImageUrl(data.backIdPhoto) || '' : '',
            household_doc_photo: data.householdDoc ? getRagicImageUrl(data.householdDoc) || '' : '',
            bank_photo: ''
          })

          // 處理其他佐證資料 (otherDocs 可能是字串或陣列)
          if (data.otherDocs) {
            console.log('🔍 原始 otherDocs:', data.otherDocs)

            // 統一轉換為陣列格式
            const otherDocsArray = Array.isArray(data.otherDocs) ? data.otherDocs : [data.otherDocs]
            console.log('📋 轉換後的陣列:', otherDocsArray)

            // 從 otherDocs 中提取簽名
            const signatureDoc = otherDocsArray.find((doc: any) => {
              if (!doc || doc === '') return false
              const filename = doc.split('@')[1] || ''
              return filename.toLowerCase().includes('signature')
            })

            if (signatureDoc) {
              // 設定簽名到 formData
              setFormData(prev => ({ ...prev, signature: getRagicImageUrl(signatureDoc) || null }))
              console.log('✅ 找到簽名:', signatureDoc)
            }

            // 過濾掉簽名，只保留其他佐證文件
            const docs = otherDocsArray
              .filter((doc: any) => {
                if (!doc || doc === '') return false
                // 過濾掉 signature.png（簽名單獨處理）
                const filename = doc.split('@')[1] || ''
                const shouldInclude = !filename.toLowerCase().includes('signature')
                console.log(`🔍 檔案 "${doc}" - 包含? ${shouldInclude}`)
                return shouldInclude
              })
              .map((doc: any, index: number) => {
                // 從 Ragic 檔名格式中提取自訂名稱
                // 格式: hash@customName.jpg
                const filename = doc.split('@')[1] || ''
                const customName = filename.replace(/\.(jpg|png)$/i, '')

                const docObj = {
                  id: `ragic-doc-${index}`,
                  customName: customName || `佐證資料 ${index + 1}`,
                  file: null,  // 從 Ragic 載入的是 URL，不是 File 物件
                  preview: getRagicImageUrl(doc)
                }
                console.log('📄 建立文件物件:', docObj)
                return docObj
              })

            console.log('✅ 最終文件列表:', docs)
            setUploadedDocuments(docs)
          } else {
            console.log('⚠️ 沒有 otherDocs 資料')
          }

          console.log('已載入 Ragic 資料:', data)
        }
      } catch (error) {
        console.error('載入資料失敗:', error)
        alert('無法載入申請資料')
        router.push('/applications')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadRagicData()
  }, [ragicId, router])

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
        // 身分證地址
        id_city_district: formData.id_city_district || null,
        id_village_li: formData.id_village_li || null,
        id_address: formData.id_address,
        // 戶籍謄本地址
        household_city_district: formData.household_city_district || null,
        household_village_li: formData.household_village_li || null,
        household_address: formData.household_address || null
      }

      // 檢查是否已存在相同 village 的記錄
      const { data: existingData } = await supabase
        .from('village_applications')
        .select('uuid')
        .eq('village', formData.village)
        .single()

      let newApplicationId: string

      if (existingData) {
        // 已存在，更新資料
        console.log('⚠️ 發現重複的樺加沙編號，將覆蓋舊資料:', formData.village)

        const { error: updateError } = await supabase
          .from('village_applications')
          .update({
            data: applicationData,
            updated_at: new Date().toISOString()
          })
          .eq('uuid', existingData.uuid)

        if (updateError) throw updateError

        newApplicationId = existingData.uuid
      } else {
        // 不存在，新增記錄
        const { data: insertedData, error: insertError } = await supabase
          .from('village_applications')
          .insert([{
            village: formData.village,
            data: applicationData
          }])
          .select()
          .single()

        if (insertError) throw insertError

        newApplicationId = insertedData.uuid
      }

      setApplicationId(newApplicationId)

      // 3. 更新到 Ragic（主要資料庫）- 直接上傳圖片
      console.log('🔄 開始更新到 Ragic...', ragicId)

      // 準備 FormData，包含所有資料和圖片
      const ragicFormData = new FormData()

      // 基本資料
      ragicFormData.append('ragicId', ragicId)
      ragicFormData.append('village', formData.village)
      ragicFormData.append('data', JSON.stringify(applicationData))

      // 圖片檔案（直接傳 File 物件）
      if (fileData.frontIdPhoto) {
        ragicFormData.append('front_id_photo', fileData.frontIdPhoto, 'front_id.jpg')
      }
      if (fileData.backIdPhoto) {
        ragicFormData.append('back_id_photo', fileData.backIdPhoto, 'back_id.jpg')
      }
      if (fileData.householdDoc) {
        ragicFormData.append('household_doc_photo', fileData.householdDoc, 'household.jpg')
      }
      if (fileData.signature) {
        ragicFormData.append('signature', fileData.signature, 'signature.png')
      }

      // 附加文件
      const validDocuments = uploadedDocuments.filter(doc => doc.file !== null && doc.customName.trim() !== '')
      validDocuments.forEach((doc, index) => {
        if (doc.file && doc.customName.trim()) {
          const filename = `${doc.customName}.jpg`
          ragicFormData.append(`addons_docs_${index}`, doc.file, filename)
          ragicFormData.append(`addons_docs_${index}_name`, doc.customName)
        }
      })

      const ragicResponse = await fetch('/api/ragic-sync', {
        method: 'POST',
        body: ragicFormData
      })

      if (ragicResponse.ok) {
        const ragicResult = await ragicResponse.json()
        if (ragicResult.success) {
          console.log('✅ Ragic 同步成功，Ragic ID:', ragicResult.ragicId)

          // 將 Ragic ID 儲存回 Supabase
          await supabase
            .from('village_applications')
            .update({
              data: {
                ...applicationData,
                ragic_id: ragicResult.ragicId
              }
            })
            .eq('uuid', newApplicationId)
        } else {
          console.error('❌ Ragic 同步失敗:', ragicResult.error)
          alert(`注意：資料已儲存到系統，但同步到 Ragic 時發生錯誤：${ragicResult.error}`)
        }
      } else {
        const errorData = await ragicResponse.json()
        console.error('❌ Ragic API 呼叫失敗:', errorData)
        alert(`注意：資料已儲存到系統，但同步到 Ragic 時發生錯誤：${errorData.error}`)
      }

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
      formData.id_address.trim() &&
      formData.bank_code &&
      formData.bank_account &&
      /^[0-9]{5,20}$/.test(formData.bank_account)
    )
  }

  const validatePhotos = () => {
    return fileData.frontIdPhoto && fileData.backIdPhoto && fileData.bankPhoto
  }

  // 簽名驗證已移除（不再需要電子簽名）

  // 編輯頁面不需要同意書流程，直接顯示表單
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
                  基本資料與證件拍照 (2/4)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={50} size="sm" className="w-24" color="success" aria-label="進度 50%" />
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
              <h1 className="text-lg font-bold">編輯申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">基本資料與證件拍照</p>
                <span className="text-xs text-default-400">2/4</span>
              </div>
              <Progress value={50} color="success" size="sm" aria-label="進度 50%" />
            </div>
          </div>
        </div>

        {/* Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full">
            {/* 樺加沙編號（編輯模式 - 唯讀）*/}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <h2 className="text-lg font-bold">樺加沙編號</h2>
              </CardHeader>
              <CardBody>
                <div className="bg-default-100 dark:bg-default-50/10 px-4 py-3 rounded-lg border border-default-200">
                  <span className="text-lg font-mono font-bold">{formData.village}</span>
                </div>
                <p className="text-xs text-default-400 mt-2">
                  ⚠️ 編輯模式：樺加沙編號無法修改
                </p>
              </CardBody>
            </Card>

                {/* 身份證拍照辨識 */}
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
                          onClear={() => {
                            setFormData(prev => ({ ...prev, front_id_photo: null }))
                            setFileData(prev => ({ ...prev, frontIdPhoto: null }))
                          }}
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
                          onClear={() => {
                            setFormData(prev => ({ ...prev, back_id_photo: null }))
                            setFileData(prev => ({ ...prev, backIdPhoto: null }))
                          }}
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
                                console.log('OCR 身分證背面結果:', result.data)

                                if (result.success && result.data) {
                                  // 解析地址欄位（填入身分證地址）
                                  const cityDistrict = result.data.縣市行政區 || result.data.cityDistrict || ''
                                  const villageLi = result.data.村里 || result.data.village || ''
                                  const address = result.data.地址 || result.data.address || ''

                                  setFormData(prev => ({
                                    ...prev,
                                    id_city_district: cityDistrict || prev.id_city_district,
                                    id_village_li: villageLi || prev.id_village_li,
                                    id_address: address || prev.id_address
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
                            縣市行政區
                          </label>
                          <input
                            type="text"
                            value={formData.id_city_district}
                            onChange={(e) => setFormData(prev => ({ ...prev, id_city_district: e.target.value }))}
                            placeholder="例：花蓮縣光復鄉"
                            aria-label="縣市行政區"
                            className="w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 border-default-300 focus:border-primary focus:ring-primary/20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            村/里
                          </label>
                          <input
                            type="text"
                            value={formData.id_village_li}
                            onChange={(e) => setFormData(prev => ({ ...prev, id_village_li: e.target.value }))}
                            placeholder="例：大同村"
                            aria-label="村/里"
                            className="w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 border-default-300 focus:border-primary focus:ring-primary/20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            地址 <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.id_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, id_address: e.target.value }))}
                            placeholder="例：3鄰中正路123號"
                            aria-label="地址"
                            className={`w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 ${
                              formData.id_address.trim()
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

              {/* 戶籍謄本 */}
              <Card className="shadow-lg mt-6">
                <CardHeader>
                  <h2 className="text-lg font-bold">戶籍謄本</h2>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 戶籍謄本照片 */}
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold text-primary">上傳戶籍謄本</h3>
                      <CameraCapture
                        label="戶籍謄本"
                        onClear={() => {
                          setFormData(prev => ({ ...prev, household_doc_photo: null }))
                          setFileData(prev => ({ ...prev, householdDoc: null }))
                        }}
                        onCapture={async (file) => {
                          const imageUrl = URL.createObjectURL(file)
                          setFormData(prev => ({ ...prev, household_doc_photo: imageUrl }))
                          setFileData(prev => ({ ...prev, householdDoc: file }))

                          // 呼叫後端 OCR API（使用與身分證背面相同的邏輯）
                          try {
                            setIsProcessingOCR(true)
                            setOCRMessage('AI 正在辨識戶籍謄本，請稍候...')

                            const formDataApi = new FormData()
                            formDataApi.append('image', file)
                            formDataApi.append('type', 'back')  // 使用 back 的 prompt（地址解析）

                            const response = await fetch('/api/ocr', {
                              method: 'POST',
                              body: formDataApi
                            })

                            if (response.ok) {
                              const result = await response.json()
                              console.log('OCR 戶籍謄本結果:', result.data)

                              if (result.success && result.data) {
                                const cityDistrict = result.data.縣市行政區 || result.data.cityDistrict || ''
                                const villageLi = result.data.村里 || result.data.village || ''
                                const address = result.data.地址 || result.data.address || ''

                                setFormData(prev => ({
                                  ...prev,
                                  household_city_district: cityDistrict || prev.household_city_district,
                                  household_village_li: villageLi || prev.household_village_li,
                                  household_address: address || prev.household_address
                                }))
                              }
                            }
                          } catch (error) {
                            console.error('OCR failed:', error)
                          } finally {
                            setIsProcessingOCR(false)
                          }
                        }}
                        currentImage={formData.household_doc_photo}
                      />
                    </div>

                    {/* 戶籍謄本地址欄位 */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          縣市行政區
                        </label>
                        <input
                          type="text"
                          value={formData.household_city_district}
                          onChange={(e) => setFormData(prev => ({ ...prev, household_city_district: e.target.value }))}
                          placeholder="例：花蓮縣光復鄉"
                          aria-label="戶籍謄本縣市行政區"
                          className="w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 border-default-300 focus:border-primary focus:ring-primary/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          村/里
                        </label>
                        <input
                          type="text"
                          value={formData.household_village_li}
                          onChange={(e) => setFormData(prev => ({ ...prev, household_village_li: e.target.value }))}
                          placeholder="例：大同村"
                          aria-label="戶籍謄本村/里"
                          className="w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 border-default-300 focus:border-primary focus:ring-primary/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          地址
                        </label>
                        <input
                          type="text"
                          value={formData.household_address}
                          onChange={(e) => setFormData(prev => ({ ...prev, household_address: e.target.value }))}
                          placeholder="例：3鄰中正路123號"
                          aria-label="戶籍謄本地址"
                          className="w-full px-3 py-2 border rounded-lg bg-content1 text-foreground focus:outline-none focus:ring-2 border-default-300 focus:border-primary focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </CardBody>
            </Card>

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
                          <p className="text-sm font-medium mt-1">{formData.id_address || '未填寫'}</p>
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

            {/* 子步驟 4: 聯絡方式選擇 - 已移除 */}
            {false && currentSubStep === 4 && (
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
          <div className="flex justify-end items-center max-w-6xl mx-auto">
            <Button
              color="primary"
              size="lg"
              onClick={() => setCurrentStep('document-upload')}
              isLoading={isSubmitting}
              isDisabled={
                isSubmitting ||
                !formData.village.match(/^(大安|大華|大同|其他)\d{3}$/) ||
                !formData.victim_name.trim() ||
                !/^[A-Z][0-9]{9}$/.test(formData.id_number) ||
                !formData.id_address.trim()
              }
              className="px-6 md:px-8 py-2 md:py-3"
            >
              下一步
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

    // 新增空白上傳區塊
    const handleAddDocument = () => {
      const newDoc = {
        id: Date.now().toString(),
        customName: '',  // 使用者自訂名稱
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

    const handleCustomNameChange = (id: string, customName: string) => {
      setUploadedDocuments(prev =>
        prev.map(doc => doc.id === id ? { ...doc, customName } : doc)
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
                <h1 className="text-xl font-bold">編輯申請</h1>
                <p className="text-sm text-default-500">其他文件上傳 (3/4)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={75} size="sm" className="w-24" aria-label="進度 75%" />
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
              <h1 className="text-lg font-bold">編輯申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">其他文件上傳</p>
                <span className="text-xs text-default-400">3/4</span>
              </div>
              <Progress value={75} color="primary" size="sm" aria-label="進度 75%" />
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
                        {/* 文件名稱輸入 */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">文件名稱 <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            value={doc.customName}
                            onChange={(e) => handleCustomNameChange(doc.id, e.target.value)}
                            placeholder="例如：租賃契約、房屋所有權狀"
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="文件名稱"
                          />
                        </div>

                        {/* 檔案上傳/拍照區域 */}
                        {!doc.file && !doc.preview ? (
                          <CameraCapture
                            label={doc.customName || '文件'}
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
              color="primary"
              size="lg"
              onClick={() => setCurrentStep('data-confirmation')}
              className="px-8 py-3"
            >
              下一步
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 第四步：資料確認
  if (currentStep === 'data-confirmation') {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Header */}
        <div className="bg-background border-b border-divider p-3 md:p-4 w-full">
          <div className="hidden md:flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold">編輯申請</h1>
                <p className="text-sm text-default-500">資料確認 (4/4)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={100} size="sm" className="w-24" color="success" aria-label="進度 100%" />
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>

          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <Logo width={32} height={32} />
              <MobileMenu showLogout={true} />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold">編輯申請</h1>
              <div className="flex justify-between items-center">
                <p className="text-sm text-default-500">資料確認</p>
                <span className="text-xs text-default-400">4/4</span>
              </div>
              <Progress value={100} color="success" size="sm" aria-label="進度 100%" />
            </div>
          </div>
        </div>

        {/* 資料確認內容 */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">請確認您填寫的資料</h2>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* 樺加沙編號 */}
                <div className="bg-content2 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-primary mb-3">樺加沙編號</h3>
                  <p className="text-lg font-mono">{formData.village}</p>
                </div>

                {/* 基本資料 */}
                <div className="bg-content2 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-primary mb-3">基本資料</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-default-500">姓名：</span>
                      <span className="ml-2 font-medium">{formData.victim_name}</span>
                    </div>
                    <div>
                      <span className="text-sm text-default-500">身分證字號：</span>
                      <span className="ml-2 font-mono">{formData.id_number}</span>
                    </div>
                    <div>
                      <span className="text-sm text-default-500">性別：</span>
                      <span className="ml-2">{getGender(formData.id_number)}</span>
                    </div>
                  </div>
                </div>

                {/* 身分證地址 */}
                <div className="bg-content2 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-primary mb-3">戶籍地址（身分證）</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-default-500">縣市行政區：</span>
                      <span className="ml-2">{formData.id_city_district || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-default-500">村/里：</span>
                      <span className="ml-2">{formData.id_village_li || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-default-500">地址：</span>
                      <span className="ml-2">{formData.id_address}</span>
                    </div>
                  </div>
                </div>

                {/* 戶籍謄本地址 */}
                {(formData.household_city_district || formData.household_village_li || formData.household_address) && (
                  <div className="bg-content2 rounded-lg p-4">
                    <h3 className="text-md font-semibold text-primary mb-3">戶籍地址（戶籍謄本）</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-default-500">縣市行政區：</span>
                        <span className="ml-2">{formData.household_city_district || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-default-500">村/里：</span>
                        <span className="ml-2">{formData.household_village_li || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-default-500">地址：</span>
                        <span className="ml-2">{formData.household_address || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 已上傳照片 */}
                {(formData.front_id_photo || formData.back_id_photo || formData.household_doc_photo || formData.signature) && (
                  <div className="bg-content2 rounded-lg p-4">
                    <h3 className="text-md font-semibold text-primary mb-3">已上傳照片</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.front_id_photo && (
                        <div className="text-center">
                          <img src={formData.front_id_photo} alt="身分證正面" className="w-full aspect-video object-contain bg-content1 mb-1" />
                          <p className="text-xs">身分證正面</p>
                        </div>
                      )}
                      {formData.back_id_photo && (
                        <div className="text-center">
                          <img src={formData.back_id_photo} alt="身分證背面" className="w-full aspect-video object-contain bg-content1 mb-1" />
                          <p className="text-xs">身分證背面</p>
                        </div>
                      )}
                      {formData.household_doc_photo && (
                        <div className="text-center">
                          <img src={formData.household_doc_photo} alt="戶籍謄本" className="w-full aspect-video object-contain bg-content1 mb-1" />
                          <p className="text-xs">戶籍謄本</p>
                        </div>
                      )}
                      {formData.signature && (
                        <div className="text-center">
                          <img src={formData.signature} alt="簽名" className="w-full aspect-video object-contain bg-content1 mb-1" />
                          <p className="text-xs">電子簽名</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 附加文件 */}
                {uploadedDocuments.filter(doc => doc.file || doc.preview).length > 0 && (
                  <div className="bg-content2 rounded-lg p-4">
                    <h3 className="text-md font-semibold text-primary mb-3">附加文件</h3>
                    <div className="space-y-2">
                      {uploadedDocuments.filter(doc => doc.file || doc.preview).map((doc, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm">• {doc.customName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 申請人簽名 */}
                <div className="bg-content2 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-semibold text-primary">申請人簽名（選填）</h3>
                    <span className="text-sm text-default-500">非必填項目</span>
                  </div>
                  {formData.signature ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={formData.signature}
                        alt="申請人簽名"
                        className="w-full max-w-md aspect-video object-contain bg-white dark:bg-gray-800 border rounded"
                      />
                      {/* 從 Ragic 載入的簽名（URL 包含 ragic.com）不可刪除 */}
                      {!formData.signature.includes('ragic.com') && (
                        <Button
                          size="sm"
                          variant="bordered"
                          color="primary"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, signature: null }))
                            setFileData(prev => ({ ...prev, signature: null }))
                          }}
                        >
                          清除簽名
                        </Button>
                      )}
                    </div>
                  ) : (
                    <SignatureCanvas
                      onSave={(signatureFile) => {
                        setFileData(prev => ({ ...prev, signature: signatureFile }))
                        const imageUrl = URL.createObjectURL(signatureFile)
                        setFormData(prev => ({ ...prev, signature: imageUrl }))
                      }}
                      label="電子簽名"
                      currentSignature={formData.signature}
                    />
                  )}
                  <p className="text-xs text-default-500 mt-2">
                    * 長者或行動不便者可選擇不簽名
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
              onClick={() => setCurrentStep('document-upload')}
              className="px-6 py-3"
            >
              上一步
            </Button>
            <Button
              color="success"
              size="lg"
              onClick={async () => {
                await handleFinalSubmit()
              }}
              isLoading={isSubmitting}
              className="px-8 py-3"
            >
              {isSubmitting ? '提交中...' : '確認並提交'}
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