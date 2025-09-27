'use client'

import { useState } from 'react'
import { Button } from '@heroui/button'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'

interface MobileMenuProps {
  showLogout?: boolean
}

export default function MobileMenu({
  showLogout = true
}: MobileMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    setIsOpen(false)
  }


  return (
    <>
      {/* Hamburger 按鈕 */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden p-2"
        onClick={() => setIsOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
        </svg>
      </Button>

      {/* 選單 Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="sm"
        placement="top"
        classNames={{
          backdrop: "bg-black/50",
          base: "mt-16 mx-4",
        }}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-bold">
              {t('dashboard.title')}
            </h3>
          </ModalHeader>
          <ModalBody className="space-y-4 pb-6">
            {/* Theme 和 Language */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {t('theme.light')}
                </span>
                <ThemeSwitcher />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {t('language.switchLanguage')}
                </span>
                <LanguageSwitcher />
              </div>
            </div>

            <div className="border-t border-divider pt-4 space-y-3">
              {/* 首頁按鈕 */}
              <Button
                variant="light"
                className="w-full justify-start"
                onClick={() => {
                  router.push('/dashboard')
                  setIsOpen(false)
                }}
                startContent={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
                  </svg>
                }
              >
                {t('dashboard.title')}
              </Button>

              {/* 登出按鈕 */}
              {showLogout && (
                <Button
                  color="danger"
                  variant="light"
                  className="w-full justify-start"
                  onClick={handleLogout}
                  startContent={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                    </svg>
                  }
                >
                  {t('common.logout')}
                </Button>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}