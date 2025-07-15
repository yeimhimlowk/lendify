'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReviewForm } from './ReviewForm'
import { useReviews } from '@/hooks/useReviews'
import { Star, CheckCircle, X } from 'lucide-react'
import type { BookingWithDetails } from '@/lib/supabase/types'
import { z } from 'zod'
import { createReviewSchema } from '@/lib/api/schemas'

interface ReviewPromptProps {
  booking: BookingWithDetails
  onReviewSubmitted?: () => void
  onDismiss?: () => void
}

export function ReviewPrompt({ booking, onReviewSubmitted, onDismiss }: ReviewPromptProps) {
  const [showForm, setShowForm] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { submitReview, isSubmitting, error, clearError } = useReviews()

  const handleSubmitReview = async (data: z.infer<typeof createReviewSchema>) => {
    try {
      await submitReview(data)
      setIsSubmitted(true)
      setTimeout(() => {
        onReviewSubmitted?.()
      }, 2000)
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  if (isSubmitted) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">Review Submitted!</h3>
            <p className="text-sm text-green-700">
              Thank you for sharing your experience.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
        
        <ReviewForm
          booking={booking}
          onSubmit={handleSubmitReview}
          onCancel={() => setShowForm(false)}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  return (
    <Card className="p-6 bg-blue-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Star className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">
              How was your experience?
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Your booking for <strong>{booking.listing.title}</strong> is complete. 
              Help others by sharing your experience!
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Leave a Review
              </Button>
              {onDismiss && (
                <Button
                  variant="outline"
                  onClick={onDismiss}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  Maybe Later
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}