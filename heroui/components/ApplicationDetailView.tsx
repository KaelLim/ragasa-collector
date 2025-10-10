/**
 * 申請詳情顯示組件（支援 JSONB 格式）
 */

'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import type { ApplicationData } from '@/hooks/useApplicationDetail'

interface ApplicationDetailViewProps {
  application: ApplicationData
}

export default function ApplicationDetailView({ application }: ApplicationDetailViewProps) {
  const { application_data, status, created_at } = application
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)

  const statusColors = {
    submitted: 'warning',
    reviewed: 'primary',
    approved: 'success',
    rejected: 'danger'
  } as const

  const statusLabels = {
    submitted: '已提交',
    reviewed: '審核中',
    approved: '已核准',
    rejected: '已拒絕'
  }

  return (
    <div className="space-y-6">
      {/* 狀態資訊 */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-bold">申請狀態</h2>
          <Chip
            color={statusColors[status as keyof typeof statusColors] || 'default'}
            variant="flat"
            size="lg"
          >
            {statusLabels[status as keyof typeof statusLabels] || status}
          </Chip>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-default-500">
            提交時間：{new Date(created_at).toLocaleString('zh-TW')}
          </p>
        </CardBody>
      </Card>

      {/* 戶口名簿資料 */}
      {application_data.household && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">戶口名簿資料</h3>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid md:grid-cols-[1fr,200px] gap-6">
              <div className="space-y-6">
                {/* 基本資料 */}
                <div>
                  <h4 className="text-md font-semibold mb-3 text-primary">📋 基本資料</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-default-500">戶號：</span>
                      <span className="font-medium">{application_data.household.header.householdNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="text-default-500">戶長統號：</span>
                      <span className="font-medium">{application_data.household.header.householdHeadIdNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="text-default-500">戶別：</span>
                      <span className="font-medium">{application_data.household.header.householdType || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-default-500">戶籍地址：</span>
                      <span className="font-medium">{application_data.household.header.address || '-'}</span>
                    </div>
                  </div>
                </div>

            {/* 戶長資料 */}
            <div className="border-t pt-4">
              <h4 className="text-md font-semibold mb-3 text-primary">👤 戶長</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-default-500">姓名：</span>
                  <span className="font-medium">{application_data.household.householdHead.name || '-'}</span>
                </div>
                <div>
                  <span className="text-default-500">性別：</span>
                  <span className="font-medium">{application_data.household.householdHead.gender || '-'}</span>
                </div>
                <div>
                  <span className="text-default-500">出生日期：</span>
                  <span className="font-medium">{application_data.household.householdHead.birthDate || '-'}</span>
                </div>
                <div>
                  <span className="text-default-500">身分證字號：</span>
                  <span className="font-medium">{application_data.household.householdHead.idNumber || '-'}</span>
                </div>
              </div>
            </div>

            {/* 家族成員 */}
            {application_data.household.members && application_data.household.members.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-md font-semibold mb-3 text-primary">
                  👥 家族成員（共 {application_data.household.members.length} 位）
                </h4>
                <div className="space-y-3">
                  {application_data.household.members.map((member: any, idx: number) => (
                    <div key={idx} className="bg-default-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-default-600 mb-2">
                        成員 {idx + 1} - {member.relationship || ''}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-default-500">姓名：</span>
                          <span className="font-medium">{member.name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-default-500">性別：</span>
                          <span className="font-medium">{member.gender || '-'}</span>
                        </div>
                        <div>
                          <span className="text-default-500">出生日期：</span>
                          <span className="font-medium">{member.birthDate || '-'}</span>
                        </div>
                        <div>
                          <span className="text-default-500">身分證字號：</span>
                          <span className="font-medium">{member.idNumber || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>

              {/* 右側：圖片縮圖（真正的縮圖）*/}
              {application_data.media?.household && application_data.media.household.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {application_data.media.household.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer"
                      onClick={() => setEnlargedImage(url)}
                    >
                      <img
                        src={url}
                        alt={`戶口名簿第${idx+1}頁`}
                        className="w-20 h-24 object-cover border-2 border-default-300 rounded hover:border-primary transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <span className="text-white text-xs">點擊放大</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b">
                        第{idx+1}頁
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 聯絡電話 */}
      {application_data.contact?.phones && application_data.contact.phones.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">聯絡電話</h3>
          </CardHeader>
          <CardBody className="space-y-2">
            {application_data.contact.phones.map((phone: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-default-500">
                  {phone.owner === 'householdHead' ? '戶長' : '代理人'} {phone.ownerName}：
                </span>
                <span className="font-medium">{phone.number}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* 戶長身份證 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">戶長身份證資料</h3>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-[1fr,200px] gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-default-500">姓名：</span>
                <span className="font-medium">{application_data.victim.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-default-500">身分證字號：</span>
                <span className="font-medium">{application_data.victim.idNumber}</span>
              </div>
              <div className="text-sm">
                <span className="text-default-500">戶籍地址：</span>
                <p className="font-medium mt-1">{application_data.victim.address}</p>
              </div>
            </div>

            {/* 右側：身份證縮圖 */}
            {(application_data.media?.idFront || application_data.media?.idBack) && (
              <div className="flex gap-2">
                {application_data.media.idFront && (
                  <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(application_data.media.idFront)}>
                    <img
                      src={application_data.media.idFront}
                      alt="身份證正面"
                      className="w-24 h-16 object-cover border-2 border-default-300 rounded hover:border-primary"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                      <span className="text-white text-xs">放大</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b">
                      正面
                    </div>
                  </div>
                )}
                {application_data.media.idBack && (
                  <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(application_data.media.idBack)}>
                    <img
                      src={application_data.media.idBack}
                      alt="身份證背面"
                      className="w-24 h-16 object-cover border-2 border-default-300 rounded hover:border-primary"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                      <span className="text-white text-xs">放大</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b">
                      背面
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 代理人資料（如果有）*/}
      {application_data.agent.hasAgent && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">代理人身份證資料</h3>
          </CardHeader>
          <CardBody>
            <div className="grid md:grid-cols-[1fr,300px] gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-default-500">姓名：</span>
                  <span className="font-medium">{application_data.agent.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-default-500">身分證字號：</span>
                  <span className="font-medium">{application_data.agent.idNumber}</span>
                </div>
                <div className="text-sm">
                  <span className="text-default-500">戶籍地址：</span>
                  <p className="font-medium mt-1">{application_data.agent.address}</p>
                </div>
              </div>

              {/* 右側：代理人身份證縮圖 */}
              {(application_data.media?.agentIdFront || application_data.media?.agentIdBack) && (
                <div className="flex gap-2">
                  {application_data.media.agentIdFront && (
                    <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(application_data.media.agentIdFront)}>
                      <img
                        src={application_data.media.agentIdFront}
                        alt="代理人身份證正面"
                        className="w-24 h-16 object-cover border-2 border-default-300 rounded hover:border-primary"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <span className="text-white text-xs">放大</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b">
                        正面
                      </div>
                    </div>
                  )}
                  {application_data.media.agentIdBack && (
                    <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(application_data.media.agentIdBack)}>
                      <img
                        src={application_data.media.agentIdBack}
                        alt="代理人身份證背面"
                        className="w-24 h-16 object-cover border-2 border-default-300 rounded hover:border-primary"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <span className="text-white text-xs">放大</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b">
                        背面
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 銀行資料 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">銀行存摺資料</h3>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-[1fr,200px] gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-default-500">銀行代碼：</span>
                <span className="font-medium">{application_data.bank.code} - {application_data.bank.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-default-500">分行（分會）：</span>
                <span className="font-medium">{application_data.bank.branch || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-default-500">帳號：</span>
                <span className="font-medium">{application_data.bank.account}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-default-500">戶名：</span>
                <span className="font-medium">{application_data.bank.accountName || '-'}</span>
              </div>
            </div>

            {/* 右側：存摺縮圖 */}
            {application_data.media?.bankBook && (
              <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(application_data.media.bankBook)}>
                <img
                  src={application_data.media.bankBook}
                  alt="銀行存摺"
                  className="w-32 h-24 object-cover border-2 border-default-300 rounded hover:border-primary"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                  <span className="text-white text-xs">點擊放大</span>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 電子簽名（如果有）*/}
      {application_data.signature && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">申請人簽名</h3>
          </CardHeader>
          <CardBody>
            <div className="relative group cursor-pointer inline-block" onClick={() => setEnlargedImage(application_data.signature)}>
              <img
                src={application_data.signature}
                alt="申請人簽名"
                className="h-24 w-auto border-2 border-default-300 rounded hover:border-primary"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                <span className="text-white text-xs">點擊放大</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 附加檔案（如果有）*/}
      {application_data.additionalFiles && application_data.additionalFiles.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">附加檔案（{application_data.additionalFiles.length} 個）</h3>
          </CardHeader>
          <CardBody>
            <div className="flex gap-3 flex-wrap">
              {application_data.additionalFiles.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group cursor-pointer"
                  onClick={() => setEnlargedImage(url)}
                >
                  <img
                    src={url}
                    alt={`附加檔案${idx+1}`}
                    className="w-24 h-32 object-cover border-2 border-default-300 rounded hover:border-primary"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                    <span className="text-white text-xs">放大</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b">
                    檔案{idx+1}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 圖片放大預覽 */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            <img
              src={enlargedImage}
              alt="放大預覽"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              color="danger"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setEnlargedImage(null)}
            >
              ✕ 關閉
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
