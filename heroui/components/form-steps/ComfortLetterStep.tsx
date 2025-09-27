'use client'

import { useState } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'
import { useTranslation } from 'react-i18next'

interface ComfortLetterStepProps {
  onNext: () => void
}

export default function ComfortLetterStep({ onNext }: ComfortLetterStepProps) {
  const { i18n } = useTranslation()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <>
      {/* Container - 書本攤開效果 (RWD) */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 md:p-8">
        <div className="h-full flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
          {/* 左頁 */}
          <Card className="shadow-2xl cursor-pointer hover:shadow-3xl transition-shadow w-full md:w-auto">
            <CardBody className="p-0">
              <img
                src="/content/letter-page-1.jpg"
                alt={i18n.language === 'zh-TW' ? '上人慰問信 - 第一頁' : 'Comfort Letter - Page 1'}
                className="w-full h-auto max-h-[40vh] md:max-h-[70vh] object-contain rounded-lg"
                onClick={() => setSelectedImage('/content/letter-page-1.jpg')}
              />
            </CardBody>
          </Card>

          {/* 右頁 */}
          <Card className="shadow-2xl cursor-pointer hover:shadow-3xl transition-shadow w-full md:w-auto">
            <CardBody className="p-0">
              <img
                src="/content/letter-page-2.jpg"
                alt={i18n.language === 'zh-TW' ? '上人慰問信 - 第二頁' : 'Comfort Letter - Page 2'}
                className="w-full h-auto max-h-[40vh] md:max-h-[70vh] object-contain rounded-lg"
                onClick={() => setSelectedImage('/content/letter-page-2.jpg')}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Footer - 按鈕和下載 (RWD) */}
      <div className="bg-background border-t border-divider px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <Button
            as="a"
            href="/content/comfort-letter.pdf"
            target="_blank"
            variant="ghost"
            size="sm"
            className="text-default-500 hover:text-primary w-full md:w-auto"
            startContent={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
            }
          >
            {i18n.language === 'zh-TW' ? '下載 PDF' : 'Download PDF'}
          </Button>

          <Button
            color="primary"
            size="lg"
            onClick={onNext}
            className="px-6 md:px-8 py-3 w-full md:w-auto"
          >
            {i18n.language === 'zh-TW' ? '我已閱讀，繼續下一步' : 'I have read it, continue'}
          </Button>
        </div>
      </div>

      {/* 圖片放大 Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="full"
        classNames={{
          base: "bg-black/90",
          backdrop: "bg-black/50"
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">
            {selectedImage?.includes('page-1')
              ? (i18n.language === 'zh-TW' ? '第一頁' : 'Page 1')
              : (i18n.language === 'zh-TW' ? '第二頁' : 'Page 2')
            }
          </ModalHeader>
          <ModalBody className="flex items-center justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="放大檢視"
                className="max-w-full max-h-full object-contain"
                onClick={() => setSelectedImage(null)}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}