'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Progress } from '@heroui/progress'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'
import { useTranslation } from 'react-i18next'
import { supabase, type BankCode } from '@/lib/supabase'
import CameraCapture from '@/components/CameraCapture'
import SignatureCanvas from '@/components/SignatureCanvas'
import BankSelector from '@/components/BankSelector'

interface ApplicationFormStepProps {
  onNext: () => void
  onBack: () => void
  applicationId: string | null
  setApplicationId: (id: string) => void
}

interface FormData {
  victim_name: string
  id_number: string
  phone_number: string
  address: string
  bank_code: string
  bank_name: string
  bank_account: string
}

interface FileData {
  frontIdPhoto: File | null
  backIdPhoto: File | null
  bankPhoto: File | null
  signature: File | null
}

export default function ApplicationFormStep({
  onNext,
  onBack,
  applicationId,
  setApplicationId
}: ApplicationFormStepProps) {
  const { i18n } = useTranslation()
  const [formData, setFormData] = useState<FormData>({
    victim_name: '',
    id_number: '',
    phone_number: '',
    address: '',
    bank_code: '',
    bank_name: '',
    bank_account: ''
  })
  const [bankCodes, setBankCodes] = useState<BankCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<'form' | 'photos' | 'signature' | 'uploading'>('form')
  const [fileData, setFileData] = useState<FileData>({
    frontIdPhoto: null,
    backIdPhoto: null,
    bankPhoto: null,
    signature: null
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchBankCodes()
  }, [])

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

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    return (
      formData.victim_name.trim() &&
      /^[A-Z][0-9]{9}$/.test(formData.id_number) &&
      /^[0-9#\-\+\(\)\s]+$/.test(formData.phone_number) &&
      formData.address.trim() &&
      formData.bank_code &&
      formData.bank_account.trim()
    )
  }

  const handleSubmitBasicInfo = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('disaster_applications')
        .insert([{
          user_id: user.id,
          ...formData
        }])
        .select()
        .single()

      if (error) throw error

      setApplicationId(data.id)
      setCurrentStep('photos')
    } catch (error) {
      console.error('Error creating application:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 表單步驟
  if (currentStep === 'form') {
    return (
      <>
        {/* Container - 表單內容 */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Input
                label={i18n.language === 'zh-TW' ? '受災戶姓名' : 'Victim Name'}
                placeholder={i18n.language === 'zh-TW' ? '請輸入受災戶姓名' : 'Enter victim name'}
                value={formData.victim_name}
                onValueChange={(value) => handleInputChange('victim_name', value)}
                isRequired
                variant="bordered"
                className="w-full"
              />

              <Input
                label={i18n.language === 'zh-TW' ? '身分證字號' : 'ID Number'}
                placeholder={i18n.language === 'zh-TW' ? 'A123456789' : 'A123456789'}
                value={formData.id_number}
                onValueChange={(value) => handleInputChange('id_number', value.toUpperCase())}
                isRequired
                variant="bordered"
                className="w-full"
                maxLength={10}
              />

              <Input
                label={i18n.language === 'zh-TW' ? '聯絡電話' : 'Phone Number'}
                placeholder={i18n.language === 'zh-TW' ? '09xxxxxxxx' : '09xxxxxxxx'}
                value={formData.phone_number}
                onValueChange={(value) => handleInputChange('phone_number', value)}
                isRequired
                variant="bordered"
                className="w-full"
              />

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
                label={i18n.language === 'zh-TW' ? '銀行代碼' : 'Bank Code'}
                placeholder={i18n.language === 'zh-TW' ? '請輸入或選擇銀行' : 'Enter or select bank'}
                isRequired
              />

              <Input
                label={i18n.language === 'zh-TW' ? '銀行帳號' : 'Bank Account'}
                placeholder={i18n.language === 'zh-TW' ? '請輸入銀行帳號' : 'Enter bank account number'}
                value={formData.bank_account}
                onValueChange={(value) => handleInputChange('bank_account', value)}
                isRequired
                variant="bordered"
                className="w-full"
              />
            </div>

            <Input
              label={i18n.language === 'zh-TW' ? '居住地址' : 'Address'}
              placeholder={i18n.language === 'zh-TW' ? '請輸入完整地址' : 'Enter complete address'}
              value={formData.address}
              onValueChange={(value) => handleInputChange('address', value)}
              isRequired
              variant="bordered"
              className="w-full"
            />
          </div>
        </div>

        {/* Footer - 按鈕區 */}
        <div className="bg-background border-t border-divider px-4 md:px-8 py-4 md:py-6">
          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              onClick={onBack}
              className="px-4 md:px-6 py-2 md:py-3"
            >
              {i18n.language === 'zh-TW' ? '上一步' : 'Previous'}
            </Button>

            <Button
              color="primary"
              size="lg"
              onClick={handleSubmitBasicInfo}
              isDisabled={!validateForm()}
              isLoading={isLoading}
              className="px-6 md:px-8 py-2 md:py-3"
            >
              {i18n.language === 'zh-TW' ? '繼續上傳文件' : 'Continue to Upload Documents'}
            </Button>
          </div>
        </div>
      </>
    )
  }

  // 其他步驟暫時簡化
  return (
    <div className="flex-1 flex items-center justify-center">
      <p>其他步驟開發中...</p>
    </div>
  )
}