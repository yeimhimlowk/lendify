'use client'

import { Card } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import type { ReviewWithDetails } from '@/lib/supabase/types'

interface ReviewCardProps {
  review: ReviewWithDetails | {
    id: string
    rating: number
    comment: string | null
    created_at: string | null
    reviewer: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
    reviewee?: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
    booking?: {
      id: string
      start_date: string
      end_date: string
      listing?: {
        title: string
      }
    }
  }
  showReviewee?: boolean
  showBooking?: boolean
  className?: string
}

export function ReviewCard({ 
  review, 
  showReviewee = false, 
  showBooking = false,
  className 
}: ReviewCardProps) {
  const formattedDate = review.created_at 
    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true })
    : 'Unknown date'

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header with reviewer info and rating */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {review.reviewer.avatar_url ? (
                <Image
                  src={review.reviewer.avatar_url}
                  alt={review.reviewer.full_name || 'User'}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {review.reviewer.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                {review.reviewer.full_name || 'Anonymous User'}
              </h4>
              <p className="text-sm text-gray-500">{formattedDate}</p>
            </div>
          </div>
          <StarRating rating={review.rating} size="sm" />
        </div>

        {/* Reviewee info (if showing) */}
        {showReviewee && review.reviewee && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Review for:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {review.reviewee.avatar_url ? (
                  <Image
                    src={review.reviewee.avatar_url}
                    alt={review.reviewee.full_name || 'User'}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-600">
                    {review.reviewee.full_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <span className="font-medium">
                {review.reviewee.full_name || 'Anonymous User'}
              </span>
            </div>
          </div>
        )}

        {/* Booking info (if showing) */}
        {showBooking && review.booking && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border">
              Booking
            </span>
            {(review.booking as any)?.listing?.title && (
              <span className="text-sm text-gray-600">
                {(review.booking as any).listing.title}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {new Date(review.booking.start_date).toLocaleDateString()} - {' '}
              {new Date(review.booking.end_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Review comment */}
        {review.comment && (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {review.comment}
            </p>
          </div>
        )}

        {/* Rating breakdown for display */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <StarRating rating={review.rating} size="sm" />
            <span>({review.rating}/5)</span>
          </div>
        </div>
      </div>
    </Card>
  )
}