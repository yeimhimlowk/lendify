'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onRatingChange?: (rating: number) => void
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  className
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starRating = index + 1
        const isFilled = starRating <= rating
        const isPartiallyFilled = rating > index && rating < starRating

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleStarClick(starRating)}
            disabled={!interactive}
            className={cn(
              'relative',
              interactive && 'hover:scale-110 transition-transform cursor-pointer',
              !interactive && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                interactive && 'hover:text-yellow-400'
              )}
            />
            {isPartiallyFilled && (
              <Star
                className={cn(
                  'absolute top-0 left-0 fill-yellow-400 text-yellow-400',
                  sizeClasses[size]
                )}
                style={{
                  clipPath: `inset(0 ${100 - ((rating - index) * 100)}% 0 0)`
                }}
              />
            )}
          </button>
        )
      })}
      {typeof rating === 'number' && (
        <span className="ml-2 text-sm text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}