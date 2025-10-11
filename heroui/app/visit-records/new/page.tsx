'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/logo'
import {
  VisitRecordData,
  Interviewee,
  detectVillageFromAddress,
  generateVisitCode,
  extractDateFromUUID7,
  getNextSequenceNumber
} from '@/lib/visit-record-types'
import { useVisitRecord } from '@/hooks/useVisitRecord'

// 步驟定義
type VisitStep = 'basic-info' | 'household-needs' | 'status-marks' | 'visit-notes' | 'receipt' | 'confirmation'

function VisitRecordFormContent() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get('applicationId')

  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<VisitStep>('basic-info')
  const [applicationData, setApplicationData] = useState<any>(null)
  const [visitCode, setVisitCode] = useState<string>('')
  const [visitDate, setVisitDate] = useState<string>('')

  // 表單資料狀態
  const [formData, setFormData] = useState<Partial<VisitRecordData>>({
    basic: {
      village: '',
      visitDate: '',
      victimName: '',
      contactAddress: '',
      interviewees: []
    },
    household: {
      specialNotes: [],
      followUpNeeds: [],
      welfareStatus: '無'
    },
    status: {
      isReceived: true,
      isDonatedBack: false,
      isReported: false
    },
    visit: {
      notes: '',
      interactionPhotos: [],
      otherPhotos: []
    },
    receipt: {
      amount: 10000, // 預設金額
      receiptDate: '',
      signature: ''
    }
  })

  const { fetchVisitRecords } = useVisitRecord()

  useEffect(() => {
    if (!applicationId) {
      router.push('/visit-records')
      return
    }

    loadApplicationData()
  }, [applicationId])

  const loadApplicationData = async () => {
    try {
      setLoading(true)

      // 載入個資主檔
      const { data: application, error } = await supabase
        .from('disaster_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (error) throw error

      setApplicationData(application)

      // 提取資料
      const victimName = application.application_data?.victim?.name || ''
      const address = application.application_data?.victim?.address || ''
      const householdHeadName = application.application_data?.household?.householdHead?.name || victimName

      // 自動判讀村名
      const detectedVillage = detectVillageFromAddress(address)

      // 生成訪視編號
      const allRecords = await fetchVisitRecords()
      const existingCodes = allRecords.map(r => r.visit_code)
      const sequenceNumber = getNextSequenceNumber(existingCodes, detectedVillage)
      const generatedVisitCode = generateVisitCode(applicationId!, detectedVillage, sequenceNumber)

      setVisitCode(generatedVisitCode)

      // 從 UUID7 提取日期
      const extractedDate = extractDateFromUUID7(applicationId!)
      setVisitDate(extractedDate)

      // 初始化表單資料
      setFormData(prev => ({
        ...prev,
        basic: {
          village: detectedVillage,
          visitDate: extractedDate,
          victimName: victimName,
          contactAddress: address,
          interviewees: [
            {
              name: householdHeadName,
              relationship: '戶長'
            }
          ]
        },
        receipt: {
          ...prev.receipt!,
          receiptDate: extractedDate
        }
      }))

      setLoading(false)
    } catch (error) {
      console.error('Failed to load application data:', error)
      alert(i18n.language === 'zh-TW' ? '載入申請資料失敗' : 'Failed to load application data')
      router.push('/visit-records')
    }
  }

  // 步驟切換
  const handleNextStep = () => {
    const steps: VisitStep[] = ['basic-info', 'household-needs', 'status-marks', 'visit-notes', 'receipt', 'confirmation']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
      window.scrollTo(0, 0)
    }
  }

  const handlePrevStep = () => {
    const steps: VisitStep[] = ['basic-info', 'household-needs', 'status-marks', 'visit-notes', 'receipt', 'confirmation']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
      window.scrollTo(0, 0)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>{i18n.language === 'zh-TW' ? '載入中...' : 'Loading...'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Logo width={48} height={48} clickable={true} />
          <Button
            variant="light"
            onClick={() => router.push('/visit-records')}
          >
            {i18n.language === 'zh-TW' ? '返回列表' : 'Back to List'}
          </Button>
        </div>

        {/* 進度條 */}
        <Card className="mb-6">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              {[
                { key: 'basic-info', label: i18n.language === 'zh-TW' ? '基本資訊' : 'Basic Info', step: 1 },
                { key: 'household-needs', label: i18n.language === 'zh-TW' ? '家戶資料' : 'Household', step: 2 },
                { key: 'status-marks', label: i18n.language === 'zh-TW' ? '狀態標記' : 'Status', step: 3 },
                { key: 'visit-notes', label: i18n.language === 'zh-TW' ? '訪視記錄' : 'Visit Notes', step: 4 },
                { key: 'receipt', label: i18n.language === 'zh-TW' ? '電子簽收' : 'E-Receipt', step: 5 },
                { key: 'confirmation', label: i18n.language === 'zh-TW' ? '確認送出' : 'Confirm', step: 6 }
              ].map((stepInfo, index) => (
                <div key={stepInfo.key} className="flex items-center">
                  <div className={`flex flex-col items-center ${index > 0 ? 'ml-2' : ''}`}>
                    <div
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all ${
                        currentStep === stepInfo.key
                          ? 'bg-warning text-white scale-110'
                          : 'bg-default-200 text-default-600'
                      }`}
                    >
                      {stepInfo.step}
                    </div>
                    <span className={`text-xs md:text-sm mt-1 ${
                      currentStep === stepInfo.key ? 'text-warning font-semibold' : 'text-default-500'
                    }`}>
                      {stepInfo.label}
                    </span>
                  </div>
                  {index < 5 && (
                    <div className="w-8 md:w-16 h-1 bg-default-200 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* 表單內容 */}
        {currentStep === 'basic-info' && (
          <BasicInfoStep
            visitCode={visitCode}
            visitDate={visitDate}
            formData={formData}
            setFormData={setFormData}
            onNext={handleNextStep}
          />
        )}

        {currentStep === 'household-needs' && (
          <Card>
            <CardBody className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {i18n.language === 'zh-TW' ? '步驟 2: 家戶資料與需求' : 'Step 2: Household Data'}
              </h2>
              <p className="text-default-500">步驟 2 開發中...</p>
              <div className="flex justify-between mt-6">
                <Button variant="flat" onClick={handlePrevStep}>
                  {i18n.language === 'zh-TW' ? '上一步' : 'Previous'}
                </Button>
                <Button color="warning" onClick={handleNextStep}>
                  {i18n.language === 'zh-TW' ? '下一步' : 'Next'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 其他步驟佔位... */}
      </div>
    </div>
  )
}

// 步驟 1: 基本資訊確認組件
function BasicInfoStep({
  visitCode,
  visitDate,
  formData,
  setFormData,
  onNext
}: {
  visitCode: string
  visitDate: string
  formData: Partial<VisitRecordData>
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
}) {
  const { i18n } = useTranslation()
  const [village, setVillage] = useState(formData.basic?.village || '')
  const [interviewees, setInterviewees] = useState<Interviewee[]>(formData.basic?.interviewees || [])

  // 導入常數
  const VILLAGE_OPTIONS = [
    '大安村', '大馬村', '大平村', '大華村', '大同村', '東富村', '其他'
  ]

  const RELATIONSHIP_OPTIONS = [
    '戶長', '配偶', '子女', '父母', '其他親屬', '鄰居', '村里長', '其他'
  ]

  const handleAddInterviewee = () => {
    setInterviewees([
      ...interviewees,
      { name: '', relationship: '其他' }
    ])
  }

  const handleRemoveInterviewee = (index: number) => {
    if (interviewees.length <= 1) {
      alert(i18n.language === 'zh-TW' ? '至少需要一位受訪視者' : 'At least one interviewee required')
      return
    }
    setInterviewees(interviewees.filter((_, i) => i !== index))
  }

  const handleIntervieweeChange = (index: number, field: keyof Interviewee, value: string) => {
    const updated = [...interviewees]
    updated[index] = { ...updated[index], [field]: value }
    setInterviewees(updated)
  }

  const handleNext = () => {
    // 驗證
    if (!village) {
      alert(i18n.language === 'zh-TW' ? '請選擇村名' : 'Please select village')
      return
    }

    const hasEmptyInterviewee = interviewees.some(i => !i.name.trim())
    if (hasEmptyInterviewee) {
      alert(i18n.language === 'zh-TW' ? '請填寫所有受訪視者姓名' : 'Please fill in all interviewee names')
      return
    }

    // 更新表單資料
    setFormData(prev => ({
      ...prev,
      basic: {
        ...prev.basic!,
        village,
        interviewees
      }
    }))

    onNext()
  }

  return (
    <Card>
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {i18n.language === 'zh-TW' ? '步驟 1: 基本資訊確認' : 'Step 1: Basic Information'}
          </h2>
          <p className="text-default-500 text-sm">
            {i18n.language === 'zh-TW'
              ? '確認訪視基本資訊，並新增受訪視者'
              : 'Confirm visit basic information and add interviewees'}
          </p>
        </div>

        {/* 訪視基本資訊 */}
        <div className="bg-default-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-lg mb-3">
            {i18n.language === 'zh-TW' ? '訪視基本資訊' : 'Visit Basic Information'}
          </h3>

          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <span className="text-default-600 w-28">
                {i18n.language === 'zh-TW' ? '華加沙編碼' : 'Kava-Kasha Code'}:
              </span>
              <span className="font-mono text-sm bg-default-100 px-3 py-1 rounded">
                {visitCode}
              </span>
              <span className="text-xs text-default-400">🔒</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-default-600 w-28">
                {i18n.language === 'zh-TW' ? '紀錄日期' : 'Record Date'}:
              </span>
              <span className="font-semibold">
                {visitDate.split('-').join('/')}
              </span>
              <span className="text-xs text-default-400">🔒</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-default-600 w-28">
                {i18n.language === 'zh-TW' ? '受災鄉親' : 'Victim'}:
              </span>
              <span className="font-semibold">
                {formData.basic?.victimName}
              </span>
              <span className="text-xs text-default-400">🔒</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-default-600 w-28 pt-1">
                {i18n.language === 'zh-TW' ? '聯絡地址' : 'Address'}:
              </span>
              <span className="flex-1">
                {formData.basic?.contactAddress}
              </span>
              <span className="text-xs text-default-400 pt-1">🔒</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-default-600 w-28">
                {i18n.language === 'zh-TW' ? '村名' : 'Village'}:
              </span>
              <select
                className="flex-1 px-3 py-2 rounded-lg border border-default-300 bg-white"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              >
                {VILLAGE_OPTIONS.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <span className="text-xs text-warning">✏️</span>
            </div>
          </div>
        </div>

        {/* 受訪視者管理 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">
              {i18n.language === 'zh-TW' ? '受訪視者' : 'Interviewees'}
            </h3>
            <Button
              size="sm"
              color="warning"
              variant="flat"
              onClick={handleAddInterviewee}
              startContent={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
              }
            >
              {i18n.language === 'zh-TW' ? '新增受訪視者' : 'Add Interviewee'}
            </Button>
          </div>

          <div className="space-y-3">
            {interviewees.map((interviewee, index) => (
              <div key={index} className="border-2 border-default-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-default-700">
                    {i18n.language === 'zh-TW' ? '受訪者' : 'Interviewee'} {index + 1}
                  </span>
                  {interviewees.length > 1 && (
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      isIconOnly
                      onClick={() => handleRemoveInterviewee(index)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                      </svg>
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {i18n.language === 'zh-TW' ? '姓名' : 'Name'} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-default-300"
                      value={interviewee.name}
                      onChange={(e) => handleIntervieweeChange(index, 'name', e.target.value)}
                      placeholder={i18n.language === 'zh-TW' ? '請輸入姓名' : 'Enter name'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {i18n.language === 'zh-TW' ? '關係' : 'Relationship'}
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-default-300 bg-white"
                      value={interviewee.relationship}
                      onChange={(e) => handleIntervieweeChange(index, 'relationship', e.target.value)}
                    >
                      {RELATIONSHIP_OPTIONS.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex justify-between mt-8">
          <Button
            variant="flat"
            onClick={() => router.push('/visit-records')}
          >
            {i18n.language === 'zh-TW' ? '取消' : 'Cancel'}
          </Button>
          <Button color="warning" onClick={handleNext}>
            {i18n.language === 'zh-TW' ? '下一步' : 'Next'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export default function VisitRecordNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VisitRecordFormContent />
    </Suspense>
  )
}
