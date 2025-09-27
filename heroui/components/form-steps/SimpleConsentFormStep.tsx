'use client'

import { useState, useRef } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Checkbox } from '@heroui/checkbox'

interface SimpleConsentFormStepProps {
  onNext: () => void
  onBack: () => void
}

export default function SimpleConsentFormStep({ onNext, onBack }: SimpleConsentFormStepProps) {
  const [hasReachedBottom, setHasReachedBottom] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return

    const { scrollTop, scrollHeight, clientHeight } = element
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10

    if (isAtBottom && !hasReachedBottom) {
      setHasReachedBottom(true)
    }
  }

  const handleContinue = () => {
    if (hasReachedBottom && isAgreed) {
      onNext()
    }
  }

  const content = `
# 個人資料保護法告知暨同意書

## 一、機構名稱
財團法人佛教慈濟慈善事業基金會

## 二、蒐集之目的
為辦理天災急難救助慰問金發放作業，依個人資料保護法規定，向您蒐集、處理及利用個人資料。

## 三、個人資料之類別
姓名、身分證字號、聯絡電話、居住地址、銀行帳戶資訊、身分證明文件影像、銀行帳戶證明文件影像、親筆簽名。

## 四、個人資料利用之期間、地區、對象及方式
1. 期間：資料保存期間為發放作業完成後五年。
2. 地區：中華民國境內。
3. 對象：慈濟基金會及其委託之金融機構。
4. 方式：書面、電子文件、網際網路傳輸等方式。

## 五、您得行使之權利
依個人資料保護法規定，您得向本會行使下列權利：
1. 查詢或請求閱覽您的個人資料。
2. 請求製給複製本。
3. 請求補充或更正您的個人資料。
4. 請求停止蒐集、處理或利用您的個人資料。
5. 請求刪除您的個人資料。

## 六、不提供個人資料之影響
若您不同意提供個人資料，本會將無法進行慰問金發放作業。

本人已詳細閱讀上述告知事項，並瞭解相關權利義務，同意慈濟基金會依上述目的蒐集、處理及利用本人之個人資料。
  `

  return (
    <>
      {/* Container - 70% 高度 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-4 md:p-8 h-full">
        <div className="h-full flex flex-col gap-4">
          {/* 滾動內容區 - 80% */}
          <Card className="shadow-2xl" style={{ height: '80%' }}>
            <CardBody className="p-0 h-full">
              <div
                ref={scrollRef}
                className="h-full overflow-y-scroll p-6 text-foreground"
                onScroll={handleScroll}
              >
                <div className="whitespace-pre-line leading-relaxed">
                  {content}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Checkbox 區 - 20% */}
          <Card className="shadow-lg" style={{ height: '20%' }}>
            <CardBody className="p-4 flex flex-col justify-center">
              {!hasReachedBottom && (
                <div className="text-center mb-2">
                  <p className="text-xs text-warning animate-pulse">
                    請滾動閱讀完整內容
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox
                  isSelected={isAgreed}
                  onValueChange={setIsAgreed}
                  color="primary"
                  isDisabled={!hasReachedBottom}
                />
                <span className="text-xs md:text-sm text-foreground leading-relaxed">
                  我已詳細閱讀上述個資授權同意書內容，並同意慈濟基金會依上述目的蒐集、處理及利用我的個人資料
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Footer - 15% */}
      <div className="bg-background border-t border-divider px-4 md:px-8 py-4 md:py-6" style={{ height: '15%' }}>
        <div className="flex justify-between items-center w-full h-full">
          <Button
            variant="ghost"
            onClick={onBack}
            className="px-4 md:px-6 py-2 md:py-3"
          >
            上一步
          </Button>

          <Button
            color="primary"
            size="lg"
            onClick={handleContinue}
            isDisabled={!hasReachedBottom || !isAgreed}
            className="px-6 md:px-8 py-3"
          >
            同意並繼續
          </Button>
        </div>
      </div>
    </>
  )
}