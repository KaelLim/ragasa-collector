'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/language-switcher'
import ThemeSwitcher from '@/components/theme-switcher'
import Logo from '@/components/logo'

export default function RegisterPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const defaultPassword = '94800552'

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email) ? true : 'Please enter a valid email address'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!validateEmail(email)) {
      setError(t('auth.emailRequired'))
      setIsLoading(false)
      return
    }

    if (!name.trim()) {
      setError(t('auth.nameRequired'))
      setIsLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: defaultPassword,
        options: {
          data: {
            full_name: name.trim(),
          },
          emailRedirectTo: undefined, // 不需要郵件驗證
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError(t('auth.emailAlreadyExists'))
        } else {
          setError(t('auth.registerError') + authError.message)
        }
      } else if (data.user) {
        // 調用 PHP API 自動確認用戶
        try {
          const response = await fetch('/api/confirm-user.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
          })

          const result = await response.json()

          if (!response.ok) {
            console.log('Auto confirm failed:', result.error)
          } else {
            console.log('User confirmed successfully:', result.message)
          }
        } catch (confirmError) {
          console.log('Auto confirm request failed:', confirmError)
        }

        setSuccess(t('auth.registrationSuccess'))
        // 3秒後自動跳轉到登入頁面
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err) {
      setError(t('auth.authError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-3 items-center pb-6">
            <Logo className="mb-2" />
            <p className="text-small text-default-500">{t('auth.registerSubtitle')}</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="text"
                label={t('auth.name')}
                placeholder={t('auth.namePlaceholder')}
                value={name}
                onValueChange={setName}
                isRequired
                variant="bordered"
                size="lg"
                className="w-full"
              />

              <Input
                type="email"
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onValueChange={setEmail}
                isRequired
                validate={validateEmail}
                errorMessage={t('auth.emailRequired')}
                variant="bordered"
                size="lg"
                className="w-full"
              />

              <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                <p className="text-sm text-primary-700">
                  <strong>{t('auth.defaultPassword')}</strong> 94800552
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  {t('auth.defaultPasswordNote')}
                </p>
              </div>

              {error && (
                <div className="text-danger text-sm text-center bg-danger-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-success text-sm text-center bg-success-50 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                color="success"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                isDisabled={!!success}
              >
                {success ? t('auth.redirecting') : t('auth.registerButton')}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-primary text-sm">
                  {t('auth.hasAccount')}
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}