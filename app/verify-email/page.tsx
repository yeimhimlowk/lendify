'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/lib/auth/auth-context'
import { LoadingButton } from '@/components/ui/loading-button'
import { Alert } from '@/components/ui/alert'
import { Mail, CheckCircle, ArrowRight } from 'lucide-react'

export default function VerifyEmailPage() {
  const { user, isEmailVerified, resendVerificationEmail, loading } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  // Redirect if already verified or not logged in
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login')
      } else if (isEmailVerified) {
        router.replace('/dashboard')
      }
    }
  }, [user, isEmailVerified, loading, router])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    try {
      setError(null)
      setSuccess(null)
      setResending(true)
      
      await resendVerificationEmail()
      
      setSuccess('Verification email sent! Please check your inbox.')
      setCountdown(60) // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    )
  }

  // Don't render content if redirecting
  if (!user || isEmailVerified) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-[var(--primary)]">
                Lendify
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Icon */}
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
              <Mail className="h-12 w-12 text-[var(--primary)]" />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white py-8 px-6 shadow-lg rounded-2xl text-center space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verify your email
              </h1>
              <p className="text-gray-600">
                We&apos;ve sent a verification email to:
              </p>
              <p className="font-medium text-gray-900 mt-1">
                {user.email}
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                Please check your inbox and click the verification link to complete your registration.
              </p>
              <p>
                If you don&apos;t see the email, check your spam folder.
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {success}
                </div>
              </Alert>
            )}

            {/* Resend Button */}
            <div className="space-y-4">
              <LoadingButton
                onClick={handleResendEmail}
                loading={resending}
                disabled={countdown > 0}
                variant="outline"
                className="w-full"
              >
                {countdown > 0
                  ? `Resend in ${countdown}s`
                  : 'Resend verification email'
                }
              </LoadingButton>

              <div className="text-sm text-gray-600">
                Wrong email?{' '}
                <button
                  onClick={() => {
                    // Sign out and redirect to signup
                    window.location.href = '/signup'
                  }}
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  Sign up with a different email
                </button>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Why verify your email?
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Secure your account and protect your data</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Enable password recovery options</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Receive important account notifications</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}