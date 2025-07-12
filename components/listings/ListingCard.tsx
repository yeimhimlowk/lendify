"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Star } from "lucide-react"
import { useState } from "react"

interface ListingCardProps {
  listing: {
    id: string
    title: string
    photos: string[]
    price_per_day: number
    address?: string
    rating?: number
    rating_count?: number
    owner?: {
      full_name: string
    }
  }
}

export default function ListingCard({ listing }: ListingCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  return (
    <Link href={`/listings/${listing.id}`} className="group">
      <div className="relative">
        <div className="aspect-square rounded-xl overflow-hidden bg-gray-200">
          {!imageError ? (
            <Image
              src={listing.photos[0] || '/placeholder.jpg'}
              alt={listing.title}
              width={400}
              height={400}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-2 bg-gray-400 rounded-lg flex items-center justify-center">
                  📷
                </div>
                <p className="text-sm">Image unavailable</p>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.preventDefault()
            setIsFavorite(!isFavorite)
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition"
        >
          <Heart
            className={`h-5 w-5 ${
              isFavorite ? 'fill-[var(--primary)] text-[var(--primary)]' : 'text-[var(--black)]'
            }`}
          />
        </button>
      </div>
      
      <div className="mt-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--black)] line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-sm text-[var(--gray-dark)] mt-1">
              {listing.address || 'Location not specified'}
            </p>
          </div>
          {listing.rating && (
            <div className="flex items-center gap-1 ml-2">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-medium">{listing.rating}</span>
              {listing.rating_count && (
                <span className="text-sm text-[var(--gray-dark)]">
                  ({listing.rating_count})
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-2">
          <span className="font-semibold">${listing.price_per_day}</span>
          <span className="text-[var(--gray-dark)]"> / day</span>
        </div>
      </div>
    </Link>
  )
}