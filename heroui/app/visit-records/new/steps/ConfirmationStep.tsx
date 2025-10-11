'use client'

import { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import type { VisitRecordData } from '@/lib/visit-record-types'
import { useVisitRecord } from '@/hooks/useVisitRecord'

interface ConfirmationStepProps {
  formData: Partial<VisitRecordData>
  applicationData: any
  visitCode: string
  onPrev: () => void
}

export default function ConfirmationStep({
  formData,
  applicationData,
  visitCode,
  onPrev
}: ConfirmationStepProps) {
  const { i18n } = useTranslation()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { createVisitRecord, uploadPhoto, uploadMultiplePhotos } = useVisitRecord()

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      console.log('📝 開始提交訪視記錄...')

      // 1. 上傳照片
      console.log('📤 上傳照片到 Storage...')
      const tempFiles = (formData as any)._tempFiles

      let interactionPhotoUrls: string[] = []
      let otherPhotoUrls: string[] = []

      if (tempFiles?.interactionPhotos?.length > 0) {
        console.log('   - 互動照片:', tempFiles.interactionPhotos.length, '張')
        interactionPhotoUrls = await uploadMultiplePhotos(
          tempFiles.interactionPhotos,
          'interactions'
        )
      }

      if (tempFiles?.otherPhotos?.length > 0) {
        console.log('   - 其他照片:', tempFiles.otherPhotos.length, '張')
        otherPhotoUrls = await uploadMultiplePhotos(
          tempFiles.otherPhotos,
          'others'
        )
      }

      console.log('✅ 照片上傳完成')

      // 2. 組合完整的訪視資料
      const completeVisitData: VisitRecordData = {
        basic: formData.basic!,
        household: formData.household!,
        status: formData.status!,
        visit: {
          notes: formData.visit?.notes || '',
          interactionPhotos: interactionPhotoUrls,
          otherPhotos: otherPhotoUrls
        },
        receipt: formData.receipt!
      }

      console.log('📦 訪視資料已組合')

      // 3. 建立訪視記錄
      const result = await createVisitRecord(
        applicationData.id,
        completeVisitData
      )

      console.log('✅ 訪視記錄建立成功！ID:', result.id)
      console.log('🎯 訪視編號:', result.visit_code)

      setSubmitSuccess(true)

    } catch (error) {
      console.error('❌ 提交失敗:', error)
      setErrorMessage(i18n.language === 'zh-TW'
        ? `提交失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
        : `Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 如果提交成功，顯示成功頁面
  if (submitSuccess) {
    return (
      <Card>
        <CardBody className="p-6 text-center space-y-6">
          <div className="flex justify-center">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-success">
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-success mb-2">
              {i18n.language === 'zh-TW' ? '訪視記錄提交成功！' : 'Visit Record Submitted!'}
            </h2>
            <p className="text-default-600">
              {i18n.language === 'zh-TW' ? '訪視編號：' : 'Visit Code:'}
              <span className="font-mono font-bold text-warning ml-2">
                {visitCode}
              </span>
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              color="primary"
              variant="flat"
              onClick={() => router.push('/visit-records')}
            >
              {i18n.language === 'zh-TW' ? '返回列表' : 'Back to List'}
            </Button>
            <Button
              color="warning"
              onClick={() => router.push(`/visit-records/${visitCode}`)}
            >
              {i18n.language === 'zh-TW' ? '查看記錄' : 'View Record'}
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  // 確認頁面
  return (
    <Card>
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {i18n.language === 'zh-TW' ? '步驟 6: 確認送出' : 'Step 6: Confirmation'}
          </h2>
          <p className="text-default-500 text-sm">
            {i18n.language === 'zh-TW'
              ? '請確認所有資料正確無誤後提交'
              : 'Please verify all information before submission'}
          </p>
        </div>

        {/* 錯誤訊息 */}
        {errorMessage && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
            <p className="text-sm text-danger-800">{errorMessage}</p>
          </div>
        )}

        {/* 基本資訊預覽 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b border-default-200 pb-2">
            {i18n.language === 'zh-TW' ? '基本資訊' : 'Basic Information'}
          </h3>
          <div className="bg-default-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-default-600">華加沙編碼：</span>
              <span className="font-mono font-semibold">{visitCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-600">村名：</span>
              <span className="font-semibold">{formData.basic?.village}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-600">受訪視者：</span>
              <div className="flex gap-1 flex-wrap">
                {formData.basic?.interviewees?.map((person, idx) => (
                  <Chip key={idx} size="sm" variant="flat">
                    {person.name}（{person.relationship}）
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 家戶資料預覽 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b border-default-200 pb-2">
            {i18n.language === 'zh-TW' ? '家戶資料' : 'Household Data'}
          </h3>
          <div className="bg-default-50 rounded-lg p-4 space-y-2">
            {formData.household?.specialNotes && formData.household.specialNotes.length > 0 && (
              <div>
                <span className="text-default-600">特殊註記：</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {formData.household.specialNotes.map((note, idx) => (
                    <Chip key={idx} size="sm" color="warning" variant="flat">{note}</Chip>
                  ))}
                </div>
              </div>
            )}
            {formData.household?.followUpNeeds && formData.household.followUpNeeds.length > 0 && (
              <div>
                <span className="text-default-600">後續需求：</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {formData.household.followUpNeeds.map((need, idx) => (
                    <Chip key={idx} size="sm" color="primary" variant="flat">{need}</Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-default-600">福利身分：</span>
              <span className="font-semibold">{formData.household?.welfareStatus}</span>
            </div>
          </div>
        </div>

        {/* 狀態標記預覽 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b border-default-200 pb-2">
            {i18n.language === 'zh-TW' ? '狀態標記' : 'Status Marks'}
          </h3>
          <div className="bg-default-50 rounded-lg p-4 space-y-2">
            <div className="flex gap-3">
              <Chip color={formData.status?.isReceived ? 'success' : 'default'} variant="flat">
                {formData.status?.isReceived ? '✓' : '✗'} 完成領取
              </Chip>
              <Chip color={formData.status?.isDonatedBack ? 'primary' : 'default'} variant="flat">
                {formData.status?.isDonatedBack ? '✓' : '✗'} 回捐
              </Chip>
              <Chip color={formData.status?.isReported ? 'warning' : 'default'} variant="flat">
                {formData.status?.isReported ? '✓' : '✗'} 轉提報
              </Chip>
            </div>
          </div>
        </div>

        {/* 訪視記錄預覽 */}
        {formData.visit?.notes && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b border-default-200 pb-2">
              {i18n.language === 'zh-TW' ? '訪視記錄' : 'Visit Notes'}
            </h3>
            <div className="bg-default-50 rounded-lg p-4">
              <p className="text-sm text-default-700 whitespace-pre-wrap">
                {formData.visit.notes}
              </p>
            </div>
          </div>
        )}

        {/* 電子簽收單預覽 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b border-default-200 pb-2">
            {i18n.language === 'zh-TW' ? '電子簽收單' : 'Electronic Receipt'}
          </h3>
          <div className="bg-default-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-default-600">發放金額：</span>
              <span className="font-bold text-lg text-success">
                NT$ {formData.receipt?.amount?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-600">簽領日期：</span>
              <span className="font-semibold">
                {formData.receipt?.receiptDate}
              </span>
            </div>
            {formData.receipt?.signature && (
              <div>
                <span className="text-default-600 block mb-2">受領人簽名：</span>
                <img
                  src={formData.receipt.signature}
                  alt="簽名"
                  className="border border-default-300 rounded max-h-24"
                />
              </div>
            )}
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex justify-between mt-8">
          <Button variant="flat" onClick={onPrev}>
            {i18n.language === 'zh-TW' ? '返回修改' : 'Back to Edit'}
          </Button>
          <Button
            color="warning"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            size="lg"
          >
            {isSubmitting
              ? (i18n.language === 'zh-TW' ? '提交中...' : 'Submitting...')
              : (i18n.language === 'zh-TW' ? '確認提交' : 'Confirm Submit')}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
