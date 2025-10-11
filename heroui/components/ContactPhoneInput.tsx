/**
 * 聯絡電話輸入組件（支援戶長 + 代理人雙手機號）
 */

'use client'

import { Card, CardBody, CardHeader } from '@heroui/card'

interface ContactPhoneInputProps {
  householdHeadName?: string
  householdHeadPhone: string
  onHouseholdHeadPhoneChange: (phone: string) => void

  hasAgent: boolean
  agentName?: string
  agentPhone: string
  onAgentPhoneChange: (phone: string) => void
}

export default function ContactPhoneInput({
  householdHeadName,
  householdHeadPhone,
  onHouseholdHeadPhoneChange,
  hasAgent,
  agentName,
  agentPhone,
  onAgentPhoneChange
}: ContactPhoneInputProps) {
  // 檢查是否至少填了一個電話
  const hasAtLeastOnePhone = householdHeadPhone || agentPhone
  const isHouseholdPhoneValid = !householdHeadPhone || /^09\d{8}$/.test(householdHeadPhone)
  const isAgentPhoneValid = !agentPhone || /^09\d{8}$/.test(agentPhone)

  return (
    <div className="space-y-4">
      {/* 說明文字 */}
      <div className="bg-primary-50 rounded-lg p-4">
        <p className="text-sm text-primary-700 font-medium">
          💡 請提供聯絡電話（至少填寫一個門號）
        </p>
        <p className="text-xs text-primary-600 mt-1">
          用於接收申請進度通知
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 戶長手機號卡片 */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col items-start space-y-1 pb-3">
            <h3 className="text-md font-bold">戶長手機號</h3>
            {householdHeadName && (
              <p className="text-sm text-default-500">{householdHeadName}</p>
            )}
          </CardHeader>
          <CardBody className="space-y-2 pt-0">
            <input
              type="tel"
              value={householdHeadPhone}
              onChange={(e) => onHouseholdHeadPhoneChange(e.target.value)}
              placeholder="09XXXXXXXX"
              maxLength={10}
              className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {householdHeadPhone && !isHouseholdPhoneValid && (
              <p className="text-xs text-danger">請輸入有效的手機號碼（09開頭，共10位數字）</p>
            )}
            {!householdHeadPhone && !agentPhone && (
              <p className="text-xs text-warning">至少需填寫一個門號</p>
            )}
          </CardBody>
        </Card>

        {/* 代理人手機號卡片 */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col items-start space-y-1 pb-3">
            <h3 className="text-md font-bold">代理人手機號</h3>
            {agentName ? (
              <p className="text-sm text-default-500">{agentName}</p>
            ) : hasAgent ? (
              <p className="text-sm text-default-500">（請先填寫代理人資料）</p>
            ) : (
              <p className="text-sm text-default-500">（無代理人）</p>
            )}
          </CardHeader>
          <CardBody className="space-y-2 pt-0">
            <input
              type="tel"
              value={agentPhone}
              onChange={(e) => onAgentPhoneChange(e.target.value)}
              placeholder="09XXXXXXXX"
              maxLength={10}
              disabled={!hasAgent}
              className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {agentPhone && !isAgentPhoneValid && (
              <p className="text-xs text-danger">請輸入有效的手機號碼（09開頭，共10位數字）</p>
            )}
            {!householdHeadPhone && !agentPhone && (
              <p className="text-xs text-warning">至少需填寫一個門號</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
