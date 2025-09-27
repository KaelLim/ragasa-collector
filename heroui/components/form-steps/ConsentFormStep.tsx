'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Checkbox } from '@heroui/checkbox'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

interface ConsentFormStepProps {
  onNext: () => void
  onBack: () => void
}

export default function ConsentFormStep({ onNext, onBack }: ConsentFormStepProps) {
  const { i18n } = useTranslation()
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasReachedBottom, setHasReachedBottom] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true)
      try {
        const fileName = i18n.language === 'zh-TW' ? 'consent-form-zh-TW.md' : 'consent-form-en.md'
        const response = await fetch(`/content/${fileName}`)
        const markdown = await response.text()
        setContent(markdown)
      } catch (error) {
        console.error('Error loading consent form:', error)
        setContent(i18n.language === 'zh-TW' ? '載入失敗' : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }

    loadContent()
  }, [i18n.language])

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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>{i18n.language === 'zh-TW' ? '載入中...' : 'Loading...'}</p>
      </div>
    )
  }

  return (
    <>
      {/* Container - 使用 70% 高度 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-4 md:p-8 h-full">
        <div className="h-full flex flex-col gap-4">
          {/* 滾動內容區 - 80% */}
          <Card className="shadow-2xl flex-1">
            <CardBody className="p-0 h-full">
              <div
                ref={scrollRef}
                className="h-full overflow-y-scroll p-6 prose prose-sm max-w-none dark:prose-invert prose-headings:text-primary prose-p:text-foreground prose-strong:text-primary"
                onScroll={handleScroll}
              >
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </CardBody>
          </Card>

          {/* Checkbox 區 - 20% */}
          <Card className="shadow-lg">
            <CardBody className="p-4">
              {!hasReachedBottom && (
                <div className="text-center mb-2">
                  <p className="text-xs text-warning animate-pulse">
                    {i18n.language === 'zh-TW' ? '請滾動閱讀完整內容' : 'Please scroll to read full content'}
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
                  {i18n.language === 'zh-TW'
                    ? '我已詳細閱讀上述個資授權同意書內容，並同意慈濟基金會依上述目的蒐集、處理及利用我的個人資料'
                    : 'I have read the consent form and agree to data collection'
                  }
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
            {i18n.language === 'zh-TW' ? '上一步' : 'Previous'}
          </Button>

          <Button
            color="primary"
            size="lg"
            onClick={handleContinue}
            isDisabled={!hasReachedBottom || !isAgreed}
            className="px-6 md:px-8 py-3"
          >
            {i18n.language === 'zh-TW' ? '同意並繼續' : 'Agree and Continue'}
          </Button>
        </div>
      </div>
    </>
  )
}