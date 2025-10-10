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
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col items-start space-y-2">
        <h2 className="text-lg font-bold">聯絡電話</h2>
        <p className="text-sm text-default-500">請提供聯絡電話，以便接收申請進度通知</p>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* 戶長手機號 */}
        {householdHeadName && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">
              戶長 {householdHeadName} 的手機號碼
            </label>
            <input
              type="tel"
              value={householdHeadPhone}
              onChange={(e) => onHouseholdHeadPhoneChange(e.target.value)}
              placeholder="09XXXXXXXX"
              maxLength={10}
              className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {householdHeadPhone && !/^09\d{8}$/.test(householdHeadPhone) && (
              <p className="text-xs text-danger">請輸入有效的手機號碼（09開頭，共10位數字）</p>
            )}
          </div>
        )}

        {/* 代理人手機號（如果有）*/}
        {hasAgent && agentName && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">
              代理人 {agentName} 的手機號碼（選填）
            </label>
            <input
              type="tel"
              value={agentPhone}
              onChange={(e) => onAgentPhoneChange(e.target.value)}
              placeholder="09XXXXXXXX"
              maxLength={10}
              className="w-full px-3 py-2 border border-default-300 rounded-lg bg-content1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {agentPhone && !/^09\d{8}$/.test(agentPhone) && (
              <p className="text-xs text-danger">請輸入有效的手機號碼（09開頭，共10位數字）</p>
            )}
          </div>
        )}

        <div className="bg-primary-50 rounded-lg p-3">
          <p className="text-xs text-primary-700">
            💡 至少需要提供一個聯絡電話
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
