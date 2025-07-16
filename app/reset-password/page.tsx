'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/auth/use-auth'
import { getSupabaseClient } from '@/lib/supabase/client'
import { FormInput } from '@/components/ui/form-input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Alert } from '@/components/ui/alert'
import { Eye, EyeOff } from 'lucide-react'

// Form validation schema
const newPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type NewPasswordFormData = z.infer<typeof newPasswordSchema>

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { loading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema)
  })

  const onSubmit = async (data: NewPasswordFormData) => {
    try {
      setError(null)
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({
        password: data.password
      })
      
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
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
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Set new password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>

          {/* Password Form */}
          <div className="bg-white py-8 px-6 shadow-lg rounded-2xl">
            {success ? (
              <div className="text-center space-y-4">
                <Alert variant="success" title="Password updated">
                  Your password has been successfully updated. Redirecting to login...
                </Alert>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="error">
                    {error}
                  </Alert>
                )}

                <div className="relative">
                  <FormInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="New password"
                    placeholder="Enter your new password"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="relative">
                  <FormInput
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm new password"
                    placeholder="Confirm your new password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <LoadingButton
                  type="submit"
                  loading={isSubmitting || loading}
                  className="w-full"
                >
                  Update password
                </LoadingButton>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}