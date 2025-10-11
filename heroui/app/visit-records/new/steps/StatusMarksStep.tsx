'use client'

import { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Checkbox } from '@heroui/checkbox'
import { useTranslation } from 'react-i18next'
import type { VisitRecordData } from '@/lib/visit-record-types'

interface StatusMarksStepProps {
  formData: Partial<VisitRecordData>
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
  onPrev: () => void
}

export default function StatusMarksStep({
  formData,
  setFormData,
  onNext,
  onPrev
}: StatusMarksStepProps) {
  const { i18n } = useTranslation()

  const [isReceived, setIsReceived] = useState<boolean>(
    formData.status?.isReceived ?? true
  )
  const [isDonatedBack, setIsDonatedBack] = useState<boolean>(
    formData.status?.isDonatedBack ?? false
  )
  const [isReported, setIsReported] = useState<boolean>(
    formData.status?.isReported ?? false
  )

  const handleNext = () => {
    // 更新表單資料
    setFormData(prev => ({
      ...prev,
      status: {
        isReceived,
        isDonatedBack,
        isReported
      }
    }))

    onNext()
  }

  return (
    <Card>
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {i18n.language === 'zh-TW' ? '步驟 3: 狀態標記' : 'Step 3: Status Marks'}
          </h2>
          <p className="text-default-500 text-sm">
            {i18n.language === 'zh-TW'
              ? '記錄發放與後續處理狀態'
              : 'Record distribution and follow-up status'}
          </p>
        </div>

        {/* 狀態標記卡片 */}
        <div className="space-y-4">
          {/* 是否完成領取 */}
          <div className="bg-default-50 rounded-lg p-4">
            <Checkbox
              isSelected={isReceived}
              onValueChange={setIsReceived}
              classNames={{
                wrapper: "after:bg-success after:border-success"
              }}
            >
              <div className="ml-2">
                <span className="font-semibold text-lg">
                  {i18n.language === 'zh-TW' ? '是否完成領取' : 'Received'}
                </span>
                <p className="text-sm text-default-500 mt-1">
                  {i18n.language === 'zh-TW'
                    ? '受災戶已完成發放金額的領取'
                    : 'The victim has received the distribution amount'}
                </p>
              </div>
            </Checkbox>
          </div>

          {/* 是否回捐 */}
          <div className="bg-default-50 rounded-lg p-4">
            <Checkbox
              isSelected={isDonatedBack}
              onValueChange={setIsDonatedBack}
              classNames={{
                wrapper: "after:bg-primary after:border-primary"
              }}
            >
              <div className="ml-2">
                <span className="font-semibold text-lg">
                  {i18n.language === 'zh-TW' ? '是否回捐' : 'Donated Back'}
                </span>
                <p className="text-sm text-default-500 mt-1">
                  {i18n.language === 'zh-TW'
                    ? '受災戶選擇將發放金額回捐給慈濟'
                    : 'The victim chose to donate back to Tzu Chi'}
                </p>
              </div>
            </Checkbox>
          </div>

          {/* 是否轉提報 */}
          <div className="bg-default-50 rounded-lg p-4">
            <Checkbox
              isSelected={isReported}
              onValueChange={setIsReported}
              classNames={{
                wrapper: "after:bg-warning after:border-warning"
              }}
            >
              <div className="ml-2">
                <span className="font-semibold text-lg">
                  {i18n.language === 'zh-TW' ? '是否轉提報' : 'Reported'}
                </span>
                <p className="text-sm text-default-500 mt-1">
                  {i18n.language === 'zh-TW'
                    ? '將此案件轉報給相關單位進行後續追蹤'
                    : 'Refer this case to relevant units for follow-up'}
                </p>
              </div>
            </Checkbox>
          </div>
        </div>

        {/* 提示訊息 */}
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary-600 flex-shrink-0 mt-0.5">
              <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
            </svg>
            <div className="text-sm text-primary-800">
              <p className="font-semibold mb-1">
                {i18n.language === 'zh-TW' ? '提示' : 'Note'}
              </p>
              <p>
                {i18n.language === 'zh-TW'
                  ? '「是否完成領取」通常預設勾選，表示訪視時已完成發放。若受災戶回捐或需要轉報其他單位，請勾選對應選項。'
                  : '"Received" is typically checked by default, indicating distribution was completed during the visit. Check other options if the victim donated back or needs to be reported.'}
              </p>
            </div>
          </div>
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
