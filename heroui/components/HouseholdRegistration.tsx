'use client'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Select, SelectItem } from '@heroui/select'
import { Input } from '@heroui/input'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import CameraCapture from './CameraCapture'
import { useHouseholdUpload, type HouseholdDocument } from '@/hooks/useHouseholdUpload'

/**
 * 戶口名簿成員資料
 */
interface HouseholdMember {
  id: string
  name: string
  gender: '男' | '女' | ''
  birthDate: string
  idNumber: string
  relationship: string
}

/**
 * 戶口名簿表頭資料
 */
export interface HouseholdHeader {
  householdNumber?: string      // 戶號
  householdHeadIdNumber?: string // 戶長統號
  householdType?: string         // 戶別
  address?: string               // 戶籍地址
}

/**
 * 戶口名簿 JSONB 資料格式
 */
export interface HouseholdDataJSON {
  householdHead: HouseholdMember
  members: HouseholdMember[]
  header?: HouseholdHeader  // 表頭資料
}

interface HouseholdRegistrationProps {
  onDocumentsChange?: (documents: HouseholdDocument[]) => void
  onHouseholdDataChange?: (data: HouseholdDataJSON) => void  // 🆕 JSONB 資料回調
  mode?: 'upload' | 'form' // 上傳模式或表單模式
  initialData?: HouseholdDataJSON  // 🆕 初始資料（用於編輯）
}

export default function HouseholdRegistration({
  onDocumentsChange,
  onHouseholdDataChange,
  mode = 'upload',
  initialData
}: HouseholdRegistrationProps) {
  const { t } = useTranslation()
  const {
    documents,
    addDocument,
    updateDocument,
    removeDocument,
    validateDocuments,
  } = useHouseholdUpload()

  const [selectedType, setSelectedType] = useState<'household_registry' | 'household_transcript'>('household_registry')
  const [showCamera, setShowCamera] = useState(false)
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null)

  // 表單模式：戶口名簿資料 (戶長 + 5位成員)
  const [householdHead, setHouseholdHead] = useState<HouseholdMember>(
    initialData?.householdHead || {
      id: 'head',
      name: '',
      gender: '',
      birthDate: '',
      idNumber: '',
      relationship: '戶長'
    }
  )

  const [members, setMembers] = useState<HouseholdMember[]>(
    initialData?.members ||
    Array.from({ length: 5 }, (_, i) => ({
      id: `member-${i + 1}`,
      name: '',
      gender: '',
      birthDate: '',
      idNumber: '',
      relationship: ''
    }))
  )

  /**
   * 新增文件按鈕點擊
   */
  const handleAddDocument = () => {
    addDocument(selectedType)
  }

  /**
   * 打開相機拍照
   */
  const handleOpenCamera = (docId: string) => {
    setCurrentDocumentId(docId)
    setShowCamera(true)
  }

  /**
   * 相機拍照完成
   */
  const handleCameraCapture = (file: File, preview: string) => {
    if (currentDocumentId) {
      updateDocument(currentDocumentId, file, preview)
      onDocumentsChange?.(documents)
    }
    setShowCamera(false)
    setCurrentDocumentId(null)
  }

  /**
   * 檔案選擇器上傳
   */
  const handleFileUpload = (docId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const preview = URL.createObjectURL(file)
      updateDocument(docId, file, preview)
      onDocumentsChange?.(documents)
    }
  }

  /**
   * 取得文件類型中文名稱
   */
  const getDocumentTypeName = (type: 'household_registry' | 'household_transcript') => {
    return type === 'household_registry' ? '戶口名簿' : '戶籍謄本'
  }

  /**
   * 更新戶長資料
   */
  const handleUpdateHouseholdHead = (field: keyof HouseholdMember, value: string) => {
    setHouseholdHead(prev => {
      const updated = { ...prev, [field]: value }
      // 🆕 觸發 JSONB 資料回調
      onHouseholdDataChange?.({
        householdHead: updated,
        members
      })
      return updated
    })
  }

  /**
   * 更新成員資料
   */
  const handleUpdateMember = (index: number, field: keyof HouseholdMember, value: string) => {
    setMembers(prev => {
      const updated = prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
      // 🆕 觸發 JSONB 資料回調
      onHouseholdDataChange?.({
        householdHead,
        members: updated
      })
      return updated
    })
  }

  /**
   * 🆕 匯出為 JSONB 格式（手動呼叫）
   */
  const exportToJSON = (): HouseholdDataJSON => {
    return {
      householdHead,
      members
    }
  }

  /**
   * 🆕 驗證戶口名簿資料完整性
   */
  const validateHouseholdData = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 驗證戶長資料
    if (!householdHead.name.trim()) {
      errors.push('戶長姓名不可為空')
    }
    if (!householdHead.idNumber.match(/^[A-Z][0-9]{9}$/)) {
      errors.push('戶長身分證字號格式錯誤')
    }

    // 驗證已填寫的成員資料
    members.forEach((member, index) => {
      if (member.name.trim()) {
        if (!member.gender) {
          errors.push(`成員 ${index + 1} 已填寫姓名但未選擇性別`)
        }
        if (member.idNumber && !member.idNumber.match(/^[A-Z][0-9]{9}$/)) {
          errors.push(`成員 ${index + 1} 身分證字號格式錯誤`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 渲染成員資料列
   */
  const renderMemberRow = (member: HouseholdMember, index: number, isHead: boolean = false) => {
    const updateFn = isHead
      ? (field: keyof HouseholdMember, value: string) => handleUpdateHouseholdHead(field, value)
      : (field: keyof HouseholdMember, value: string) => handleUpdateMember(index, field, value)

    return (
      <div key={member.id} className={`grid grid-cols-5 gap-2 p-2 ${isHead ? 'bg-primary-50 font-semibold' : 'bg-default-50'} rounded-lg`}>
        <Input
          size="sm"
          label="姓名"
          value={member.name}
          onChange={(e) => updateFn('name', e.target.value)}
          variant="bordered"
        />
        <Select
          size="sm"
          label="性別"
          selectedKeys={member.gender ? [member.gender] : []}
          onChange={(e) => updateFn('gender', e.target.value as '男' | '女')}
          variant="bordered"
        >
          <SelectItem key="男" value="男">男</SelectItem>
          <SelectItem key="女" value="女">女</SelectItem>
        </Select>
        <Input
          size="sm"
          type="date"
          label="出生日期"
          value={member.birthDate}
          onChange={(e) => updateFn('birthDate', e.target.value)}
          variant="bordered"
        />
        <Input
          size="sm"
          label="身分證字號"
          value={member.idNumber}
          onChange={(e) => updateFn('idNumber', e.target.value.toUpperCase())}
          maxLength={10}
          variant="bordered"
        />
        <Input
          size="sm"
          label="與戶長關係"
          value={member.relationship}
          onChange={(e) => updateFn('relationship', e.target.value)}
          isReadOnly={isHead}
          variant="bordered"
        />
      </div>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col items-start space-y-2">
        <h2 className="text-lg font-bold">
          {mode === 'form' ? '戶口名簿資料' : t('householdRegistration.title')}
        </h2>
        <p className="text-sm text-default-500">
          {mode === 'form'
            ? '請填寫戶長及家庭成員資料（最多5位成員）'
            : t('householdRegistration.description')
          }
        </p>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* 表單模式：顯示戶口名簿表格 */}
        {mode === 'form' && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-default-700 mb-2">
              戶長資料（表頭）
            </div>
            {renderMemberRow(householdHead, 0, true)}

            <div className="text-sm font-medium text-default-700 mb-2 mt-4">
              家庭成員資料（最多5位）
            </div>
            {members.map((member, index) => renderMemberRow(member, index, false))}

            <div className="mt-4 p-3 bg-warning-50 rounded-lg">
              <p className="text-xs text-warning-700">
                ⚠️ 請確保所有資料填寫正確，特別是身分證字號格式（1個英文字母 + 9個數字）
              </p>
            </div>
          </div>
        )}

        {/* 上傳模式：原有的文件上傳功能 */}
        {mode === 'upload' && (
          <>
        {/* 選擇文件類型 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('householdRegistration.selectType')}</label>
          <Select
            label={t('householdRegistration.documentType')}
            selectedKeys={[selectedType]}
            onChange={(e) => setSelectedType(e.target.value as any)}
            aria-label="選擇戶籍文件類型"
          >
            <SelectItem key="household_registry" value="household_registry">
              {t('householdRegistration.householdRegistry')}
            </SelectItem>
            <SelectItem key="household_transcript" value="household_transcript">
              {t('householdRegistration.householdTranscript')}
            </SelectItem>
          </Select>
        </div>

        {/* 新增文件按鈕 */}
        <Button
          color="primary"
          variant="bordered"
          onClick={handleAddDocument}
          className="w-full"
        >
          {t('householdRegistration.addDocument')}
        </Button>

        {/* 已新增的文件列表 */}
        {documents.length > 0 && (
          <div className="space-y-4 mt-4">
            <h3 className="text-sm font-medium">{t('householdRegistration.uploadedDocuments')}</h3>
            {documents.map((doc) => (
              <Card key={doc.id} className="border-2 border-default-200">
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{getDocumentTypeName(doc.type)}</span>
                    <Button
                      color="danger"
                      size="sm"
                      variant="light"
                      onClick={() => removeDocument(doc.id)}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>

                  {/* 預覽圖片 */}
                  {doc.preview && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-default-100">
                      <img
                        src={doc.preview}
                        alt={getDocumentTypeName(doc.type)}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* 上傳按鈕 */}
                  {!doc.file && (
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        onClick={() => handleOpenCamera(doc.id)}
                        className="flex-1"
                      >
                        {t('common.takePhoto')}
                      </Button>
                      <label className="flex-1">
                        <Button
                          as="span"
                          color="secondary"
                          className="w-full cursor-pointer"
                        >
                          {t('common.uploadFile')}
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(doc.id, e)}
                        />
                      </label>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* 驗證提示 */}
        {documents.length === 0 && (
          <div className="text-center p-4 bg-warning-50 rounded-lg">
            <p className="text-sm text-warning-600">
              {t('householdRegistration.pleaseAddDocument')}
            </p>
          </div>
        )}

        {/* 相機模態框 */}
        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => {
              setShowCamera(false)
              setCurrentDocumentId(null)
            }}
          />
        )}
          </>
        )}
      </CardBody>
    </Card>
  )
}
