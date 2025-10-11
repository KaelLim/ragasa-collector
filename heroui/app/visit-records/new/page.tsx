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
  detectVillageFromAddress,
  generateVisitCode,
  getNextSequenceNumber
} from '@/lib/visit-record-types'
import { useVisitRecord } from '@/hooks/useVisitRecord'
import BasicInfoStep from './steps/BasicInfoStep'
import HouseholdNeedsStep from './steps/HouseholdNeedsStep'
import StatusMarksStep from './steps/StatusMarksStep'
import VisitNotesStep from './steps/VisitNotesStep'

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

      console.log('🔍 載入申請資料，applicationId:', applicationId)

      // 載入個資主檔
      const { data: application, error } = await supabase
        .from('disaster_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (error) {
        console.error('❌ 資料庫查詢錯誤:', error)
        throw new Error(`資料庫查詢失敗: ${error.message || JSON.stringify(error)}`)
      }

      if (!application) {
        throw new Error('找不到申請資料')
      }

      console.log('✅ 申請資料載入成功:', application.id)
      setApplicationData(application)

      // 提取資料
      const victimName = application.application_data?.victim?.name || ''
      const address = application.application_data?.victim?.address || ''
      const householdHeadName = application.application_data?.household?.householdHead?.name || victimName

      console.log('📋 受災鄉親:', victimName)
      console.log('📍 地址:', address)

      // 自動判讀村名
      const detectedVillage = detectVillageFromAddress(address)
      console.log('🏘️ 判讀村名:', detectedVillage)

      // 生成訪視編號
      console.log('🔢 開始生成訪視編號...')
      const allRecords = await fetchVisitRecords()
      console.log('📊 現有訪視記錄數:', allRecords.length)

      const existingCodes = allRecords.map(r => r.visit_code)
      const sequenceNumber = getNextSequenceNumber(existingCodes, detectedVillage)
      console.log('🔢 計算流水號:', sequenceNumber)

      const generatedVisitCode = generateVisitCode(applicationId!, detectedVillage, sequenceNumber)
      console.log('✅ 訪視編號已生成:', generatedVisitCode)

      setVisitCode(generatedVisitCode)

      // 使用當前系統時間
      const currentDate = new Date().toISOString().split('T')[0]
      setVisitDate(currentDate)

      // 初始化表單資料
      setFormData(prev => ({
        ...prev,
        basic: {
          village: detectedVillage,
          visitDate: currentDate,
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
          receiptDate: currentDate
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
          <HouseholdNeedsStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {currentStep === 'status-marks' && (
          <StatusMarksStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {currentStep === 'visit-notes' && (
          <VisitNotesStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {/* 其他步驟佔位... */}
      </div>
    </div>
  )
}

export default function VisitRecordNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VisitRecordFormContent />
    </Suspense>
  )
}
