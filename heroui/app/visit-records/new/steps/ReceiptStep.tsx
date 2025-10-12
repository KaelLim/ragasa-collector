'use client'

import { useState, useRef } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { useTranslation } from 'react-i18next'
import type { VisitRecordData } from '@/lib/visit-record-types'
import SignatureCanvas from '@/components/SignatureCanvas'

interface ReceiptStepProps {
  formData: Partial<VisitRecordData>
  applicationData: any  // 個資主檔資料
  setFormData: React.Dispatch<React.SetStateAction<Partial<VisitRecordData>>>
  onNext: () => void
  onPrev: () => void
}

export default function ReceiptStep({
  formData,
  applicationData,
  setFormData,
  onNext,
  onPrev
}: ReceiptStepProps) {
  const { i18n } = useTranslation()

  const [amount, setAmount] = useState<number>(
    formData.receipt?.amount || 10000
  )
  const [receiptDate, setReceiptDate] = useState<string>(
    formData.receipt?.receiptDate || new Date().toISOString().split('T')[0]
  )
  const [signature, setSignature] = useState<string>(
    formData.receipt?.signature || ''
  )

  // 從個資主檔提取資料
  const victimName = applicationData?.application_data?.victim?.name || ''
  const idNumber = applicationData?.application_data?.victim?.idNumber || ''
  const address = applicationData?.application_data?.victim?.address || ''

  const handleNext = () => {
    // 驗證
    if (!signature) {
      alert(i18n.language === 'zh-TW' ? '請簽名後再繼續' : 'Please sign before continuing')
      return
    }

    // 更新表單資料
    setFormData(prev => ({
      ...prev,
      receipt: {
        amount,
        receiptDate,
        signature
      }
    }))

    onNext()
  }

  return (
    <Card>
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {i18n.language === 'zh-TW' ? '步驟 5: 電子簽收單' : 'Step 5: Electronic Receipt'}
          </h2>
          <p className="text-default-500 text-sm">
            {i18n.language === 'zh-TW'
              ? '填寫發放金額並請受災戶簽名確認'
              : 'Fill in distribution amount and request signature confirmation'}
          </p>
        </div>

        {/* 簽收單據範本 */}
        <div className="bg-default-50 rounded-lg p-6 border-2 border-default-200 space-y-4">
          <div className="text-center border-b-2 border-default-300 pb-3">
            <h3 className="text-xl font-bold text-default-900">
              {i18n.language === 'zh-TW' ? '慈濟基金會發放訪視簽收單' : 'Tzu Chi Foundation Distribution Receipt'}
            </h3>
          </div>

          <div className="space-y-3">
            {/* 受災戶資訊（從個資主檔帶入）*/}
            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <span className="text-default-600 font-medium">
                {i18n.language === 'zh-TW' ? '受災戶姓名：' : 'Recipient Name:'}
              </span>
              <span className="font-semibold text-default-900">
                {victimName}
              </span>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <span className="text-default-600 font-medium">
                {i18n.language === 'zh-TW' ? '身分證字號：' : 'ID Number:'}
              </span>
              <span className="font-mono text-default-900">
                {idNumber}
              </span>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
              <span className="text-default-600 font-medium pt-1">
                {i18n.language === 'zh-TW' ? '聯絡地址：' : 'Address:'}
              </span>
              <span className="text-default-900">
                {address}
              </span>
            </div>

            <div className="h-px bg-default-300 my-4"></div>

            {/* 發放金額（可編輯）*/}
            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <span className="text-default-600 font-medium">
                {i18n.language === 'zh-TW' ? '發放金額：' : 'Amount:'}
              </span>
              <Input
                type="number"
                value={amount.toString()}
                onValueChange={(value) => setAmount(parseInt(value) || 0)}
                startContent={
                  <span className="text-default-500">NT$</span>
                }
                classNames={{
                  inputWrapper: "bg-default-100"
                }}
              />
            </div>

            {/* 簽領日期（可選擇）*/}
            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <span className="text-default-600 font-medium">
                {i18n.language === 'zh-TW' ? '簽領日期：' : 'Receipt Date:'}
              </span>
              <Input
                type="date"
                value={receiptDate}
                onValueChange={setReceiptDate}
                classNames={{
                  inputWrapper: "bg-default-100"
                }}
              />
            </div>
          </div>
        </div>

        {/* 電子簽名 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            {i18n.language === 'zh-TW' ? '受領人簽名' : 'Recipient Signature'}
          </h3>
          <p className="text-sm text-default-500">
            {i18n.language === 'zh-TW'
              ? '請在下方簽名板簽名確認'
              : 'Please sign on the signature pad below to confirm'}
          </p>

          <SignatureCanvas
            onSave={(file) => {
              // 將 File 轉換為 Data URL
              const reader = new FileReader()
              reader.onloadend = () => {
                const dataUrl = reader.result as string
                setSignature(dataUrl)
                console.log('✍️ 簽名已更新')
              }
              reader.readAsDataURL(file)
            }}
            label={i18n.language === 'zh-TW' ? '受領人簽名' : 'Recipient Signature'}
            currentSignature={signature || null}
          />

          {signature && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-3">
              <p className="text-sm text-success-800 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                </svg>
                {i18n.language === 'zh-TW' ? '簽名已完成' : 'Signature completed'}
              </p>
            </div>
          )}
        </div>

        {/* 說明提示 */}
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary-600 flex-shrink-0 mt-0.5">
              <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
            </svg>
            <div className="text-sm text-primary-800">
              <p className="font-semibold mb-1">
                {i18n.language === 'zh-TW' ? '注意事項' : 'Important Notes'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>{i18n.language === 'zh-TW' ? '請核對受災戶資訊是否正確' : 'Please verify recipient information'}</li>
                <li>{i18n.language === 'zh-TW' ? '發放金額可根據實際情況調整' : 'Distribution amount can be adjusted as needed'}</li>
                <li>{i18n.language === 'zh-TW' ? '簽名後可使用「清除重簽」重新簽名' : 'Use "Clear" to re-sign if needed'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex justify-between mt-8">
          <Button variant="flat" onClick={onPrev}>
            {i18n.language === 'zh-TW' ? '上一步' : 'Previous'}
          </Button>
          <Button
            color="warning"
            onClick={handleNext}
            isDisabled={!signature}
          >
            {i18n.language === 'zh-TW' ? '下一步' : 'Next'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
