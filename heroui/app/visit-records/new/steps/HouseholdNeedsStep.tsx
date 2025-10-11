'use client'

import { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Select, SelectItem } from '@heroui/select'
import { Checkbox, CheckboxGroup } from '@heroui/checkbox'
import { useTranslation } from 'react-i18next'
import type { VisitRecordData } from '@/lib/visit-record-types'
import {
  HOUSEHOLD_NOTE_OPTIONS,
  FOLLOW_UP_NEED_OPTIONS,
  WELFARE_STATUS_OPTIONS
} from '@/lib/visit-record-types'

interface HouseholdNeedsStepProps {
  formData: Partial<VisitRecordData>
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
  onPrev: () => void
}

export default function HouseholdNeedsStep({
  formData,
  setFormData,
  onNext,
  onPrev
}: HouseholdNeedsStepProps) {
  const { i18n } = useTranslation()

  const [specialNotes, setSpecialNotes] = useState<string[]>(
    formData.household?.specialNotes || []
  )
  const [followUpNeeds, setFollowUpNeeds] = useState<string[]>(
    formData.household?.followUpNeeds || []
  )
  const [welfareStatus, setWelfareStatus] = useState<string>(
    formData.household?.welfareStatus || '無'
  )

  const handleNext = () => {
    // 更新表單資料
    setFormData(prev => ({
      ...prev,
      household: {
        specialNotes,
        followUpNeeds,
        welfareStatus
      }
    }))

    onNext()
  }

  return (
    <Card>
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {i18n.language === 'zh-TW' ? '步驟 2: 家戶資料與需求' : 'Step 2: Household Data & Needs'}
          </h2>
          <p className="text-default-500 text-sm">
            {i18n.language === 'zh-TW'
              ? '記錄家戶特殊狀況與後續協助需求'
              : 'Record household special situations and follow-up needs'}
          </p>
        </div>

        {/* 家戶特殊註記 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            {i18n.language === 'zh-TW' ? '家戶特殊註記' : 'Household Special Notes'}
          </h3>
          <p className="text-sm text-default-500">
            {i18n.language === 'zh-TW' ? '可複選（選填）' : 'Multiple selections allowed (optional)'}
          </p>
          <CheckboxGroup
            value={specialNotes}
            onValueChange={setSpecialNotes}
            classNames={{
              wrapper: "gap-3"
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {HOUSEHOLD_NOTE_OPTIONS.map(note => (
                <Checkbox
                  key={note}
                  value={note}
                  classNames={{
                    wrapper: "after:bg-warning after:border-warning"
                  }}
                >
                  {note}
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        </div>

        {/* 後續需求項目 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            {i18n.language === 'zh-TW' ? '後續需求項目' : 'Follow-up Needs'}
          </h3>
          <p className="text-sm text-default-500">
            {i18n.language === 'zh-TW' ? '可複選（選填）' : 'Multiple selections allowed (optional)'}
          </p>
          <CheckboxGroup
            value={followUpNeeds}
            onValueChange={setFollowUpNeeds}
            classNames={{
              wrapper: "gap-3"
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FOLLOW_UP_NEED_OPTIONS.map(need => (
                <Checkbox
                  key={need}
                  value={need}
                  classNames={{
                    wrapper: "after:bg-warning after:border-warning"
                  }}
                >
                  {need}
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        </div>

        {/* 福利身分 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            {i18n.language === 'zh-TW' ? '福利身分' : 'Welfare Status'}
          </h3>
          <Select
            label={i18n.language === 'zh-TW' ? '福利身分' : 'Welfare Status'}
            aria-label="福利身分選擇"
            selectedKeys={[welfareStatus]}
            onSelectionChange={(keys) => setWelfareStatus(Array.from(keys)[0] as string)}
            classNames={{
              trigger: "bg-default-100"
            }}
          >
            {WELFARE_STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </Select>
        </div>

        {/* 按鈕 */}
        <div className="flex justify-between mt-8">
          <Button variant="flat" onClick={onPrev}>
            {i18n.language === 'zh-TW' ? '上一步' : 'Previous'}
          </Button>
          <Button color="warning" onClick={handleNext}>
            {i18n.language === 'zh-TW' ? '下一步' : 'Next'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
