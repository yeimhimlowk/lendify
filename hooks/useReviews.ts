'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createReviewSchema } from '@/lib/api/schemas'
import type { ReviewWithDetails } from '@/lib/supabase/types'

interface UseReviewsReturn {
  submitReview: (data: z.infer<typeof createReviewSchema>) => Promise<ReviewWithDetails>
  isSubmitting: boolean
  error: string | null
  clearError: () => void
}

export function useReviews(): UseReviewsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitReview = async (data: z.infer<typeof createReviewSchema>): Promise<ReviewWithDetails> => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }

      const result = await response.json()
      return result.data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review'
      setError(errorMessage)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    submitReview,
    isSubmitting,
    error,
    clearError
  }
}