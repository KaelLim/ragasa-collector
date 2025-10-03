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

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email) ? true : 'Please enter a valid email address'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!validateEmail(email)) {
      setError(t('auth.emailRequired'))
      setIsLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(t('auth.loginError') + authError.message)
      } else if (data.user) {
        router.push('/dashboard')
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
            <p className="text-small text-default-500">{t('auth.loginSubtitle')}</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <Input
                type="password"
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onValueChange={setPassword}
                isRequired
                variant="bordered"
                size="lg"
                className="w-full"
              />

              {error && (
                <div className="text-danger text-sm text-center bg-danger-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                {t('auth.loginButton')}
              </Button>

            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}