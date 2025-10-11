'use client'

import { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import type { VisitRecordData, Interviewee } from '@/lib/visit-record-types'

interface BasicInfoStepProps {
  visitCode: string
  visitDate: string
  formData: Partial<VisitRecordData>
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
}

export default function BasicInfoStep({
  visitCode,
  visitDate,
  formData,
  setFormData,
  onNext
}: BasicInfoStepProps) {
  const { i18n } = useTranslation()
  const router = useRouter()
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
              <div className="flex-1">
                <Select
                  aria-label="村名選擇"
                  selectedKeys={[village]}
                  onSelectionChange={(keys) => setVillage(Array.from(keys)[0] as string)}
                  classNames={{
                    trigger: "bg-default-100"
                  }}
                >
                  {VILLAGE_OPTIONS.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </Select>
              </div>
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
                  <Input
                    label={i18n.language === 'zh-TW' ? '姓名' : 'Name'}
                    placeholder={i18n.language === 'zh-TW' ? '請輸入姓名' : 'Enter name'}
                    value={interviewee.name}
                    onValueChange={(value) => handleIntervieweeChange(index, 'name', value)}
                    isRequired
                    classNames={{
                      inputWrapper: "bg-default-100"
                    }}
                  />

                  <Select
                    label={i18n.language === 'zh-TW' ? '關係' : 'Relationship'}
                    aria-label="關係選擇"
                    selectedKeys={[interviewee.relationship]}
                    onSelectionChange={(keys) => handleIntervieweeChange(index, 'relationship', Array.from(keys)[0] as string)}
                    classNames={{
                      trigger: "bg-default-100"
                    }}
                  >
                    {RELATIONSHIP_OPTIONS.map(rel => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </Select>
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
