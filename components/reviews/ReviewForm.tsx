'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createReviewSchema } from '@/lib/api/schemas'
import type { BookingWithDetails } from '@/lib/supabase/types'
import Image from 'next/image'

interface ReviewFormProps {
  booking: BookingWithDetails
  onSubmit: (data: z.infer<typeof createReviewSchema>) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function ReviewForm({ booking, onSubmit, onCancel, isSubmitting = false }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<z.infer<typeof createReviewSchema>>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      booking_id: booking.id,
      reviewee_id: '', // Will be set based on user role
      rating: 0
    }
  })

  // Determine who the user should review based on booking
  const isUserRenter = true // This should come from auth context
  const reviewee = isUserRenter ? booking.owner : booking.renter
  const revieweeType = isUserRenter ? 'owner' : 'renter'

  const handleRatingChange = (newRating: number) => {
    setRating(newRating)
    setValue('rating', newRating)
    setValue('reviewee_id', reviewee.id)
  }

  const onFormSubmit = async (data: z.infer<typeof createReviewSchema>) => {
    if (rating === 0) {
      return
    }
    
    await onSubmit({
      ...data,
      rating,
      reviewee_id: reviewee.id
    })
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Leave a Review
          </h3>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {reviewee.avatar_url ? (
                <Image
                  src={reviewee.avatar_url}
                  alt={reviewee.full_name || 'User'}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {reviewee.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {reviewee.full_name || 'Anonymous User'}
              </p>
              <p className="text-sm text-gray-600">
                Review your experience with this {revieweeType}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">
              Overall Rating *
            </Label>
            <div className="flex items-center gap-4">
              <StarRating
                rating={rating}
                interactive
                onRatingChange={handleRatingChange}
                size="lg"
              />
              {rating > 0 && (
                <span className="text-sm text-gray-600">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium text-gray-900">
              Your Review (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder={`Share your experience with ${reviewee.full_name || 'this user'}...`}
              className="min-h-[100px]"
              {...register('comment')}
            />
            {errors.comment && (
              <p className="text-sm text-red-600">{errors.comment.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Help other users by sharing specific details about your experience.
            </p>
          </div>

          {/* Booking details */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {booking.listing.title}
            </p>
            <p className="text-xs text-gray-600">
              {new Date(booking.start_date).toLocaleDateString()} - {' '}
              {new Date(booking.end_date).toLocaleDateString()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}