'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/auth/use-auth'
import { FormInput } from '@/components/ui/form-input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Alert } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'

// Form validation schema
const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ResetFormData = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { resetPassword, loading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema)
  })

  const onSubmit = async (data: ResetFormData) => {
    try {
      setError(null)
      await resetPassword(data.email)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    }
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
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Back to login link */}
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>

          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Reset your password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Reset Form */}
          <div className="bg-white py-8 px-6 shadow-lg rounded-2xl">
            {success ? (
              <div className="text-center space-y-4">
                <Alert variant="success" title="Check your email">
                  We&apos;ve sent a password reset link to your email address. 
                  Please check your inbox and follow the instructions.
                </Alert>
                <Link 
                  href="/login"
                  className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Return to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="error">
                    {error}
                  </Alert>
                )}

                <FormInput
                  id="email"
                  type="email"
                  label="Email address"
                  placeholder="Enter your email"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <LoadingButton
                  type="submit"
                  loading={isSubmitting || loading}
                  className="w-full"
                >
                  Send reset link
                </LoadingButton>
              </form>
            )}
          </div>

          {/* Support link */}
          <p className="text-center text-xs text-gray-500">
            Need help?{' '}
            <Link href="/help" className="underline">
              Contact support
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}