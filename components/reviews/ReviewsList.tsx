'use client'

import { useState, useEffect, useCallback } from 'react'
import { ReviewCard } from './ReviewCard'
import { StarRating } from '@/components/ui/star-rating'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, Filter } from 'lucide-react'
import type { ReviewWithDetails } from '@/lib/supabase/types'

interface ReviewsListProps {
  userId?: string
  listingId?: string
  bookingId?: string
  showReviewee?: boolean
  showBooking?: boolean
  initialReviews?: ReviewWithDetails[]
  className?: string
}

interface ReviewsResponse {
  reviews: ReviewWithDetails[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function ReviewsList({
  userId,
  listingId,
  bookingId,
  showReviewee = false,
  showBooking = false,
  initialReviews,
  className
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>(initialReviews || [])
  const [loading, setLoading] = useState(!initialReviews)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<'created_at' | 'rating'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)

  const fetchReviews = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        sortBy,
        sortOrder
      })

      if (userId) params.set('reviewee_id', userId)
      if (listingId) params.set('listing_id', listingId)
      if (bookingId) params.set('booking_id', bookingId)
      if (ratingFilter) params.set('rating', ratingFilter.toString())

      const response = await fetch(`/api/reviews?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }

      const data: { data: ReviewsResponse } = await response.json()
      
      if (append) {
        setReviews(prev => [...prev, ...data.data.reviews])
      } else {
        setReviews(data.data.reviews)
      }

      setHasMore(data.data.pagination.page < data.data.pagination.totalPages)
      setPage(pageNum)

    } catch (err) {
      setError('Failed to load reviews. Please try again.')
      console.error('Error fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortOrder, ratingFilter, userId, listingId, bookingId])

  useEffect(() => {
    if (!initialReviews) {
      fetchReviews()
    }
  }, [fetchReviews, initialReviews])

  const handleLoadMore = () => {
    fetchReviews(page + 1, true)
  }

  const handleSortChange = (newSortBy: 'created_at' | 'rating') => {
    setSortBy(newSortBy)
    setPage(1)
  }

  const handleOrderChange = (newOrder: 'asc' | 'desc') => {
    setSortOrder(newOrder)
    setPage(1)
  }

  const handleRatingFilterChange = (rating: number | null) => {
    setRatingFilter(rating)
    setPage(1)
  }

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? Math.round((reviews.filter(r => r.rating === rating).length / reviews.length) * 100)
      : 0
  }))

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchReviews()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Reviews Summary */}
      {reviews.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Reviews ({reviews.length})
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={averageRating} size="sm" />
                <span className="text-sm text-gray-600">
                  {averageRating.toFixed(1)} out of 5
                </span>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="grid grid-cols-5 gap-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="text-center">
                <div className="text-xs text-gray-600 mb-1">{rating}★</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>
            
            <select
              value={ratingFilter || ''}
              onChange={(e) => handleRatingFilterChange(e.target.value ? Number(e.target.value) : null)}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'created_at' | 'rating')}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="created_at">Date</option>
              <option value="rating">Rating</option>
            </select>
            
            <select
              value={sortOrder}
              onChange={(e) => handleOrderChange(e.target.value as 'asc' | 'desc')}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="p-6 border rounded-lg">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showReviewee={showReviewee}
              showBooking={showBooking}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <StarRating rating={0} size="lg" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Reviews Yet
            </h3>
            <p className="text-gray-600">
              Be the first to leave a review!
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && reviews.length > 0 && (
        <div className="text-center">
          <Button
            onClick={handleLoadMore}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Load More Reviews
                <ChevronDown className="w-4 h-4" />
              </div>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}