"use client"

import { Skeleton } from "@/components/ui/skeleton"
import ListingCard from "@/components/listings/ListingCard"
import { Search, Package } from "lucide-react"

export interface Listing {
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

export interface SearchResultsProps {
  listings: Listing[]
  isLoading: boolean
  totalCount?: number
  className?: string
}

function ListingCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No items found</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        We couldn&apos;t find any items matching your search criteria. Try adjusting your filters or search terms.
      </p>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Try different keywords
        </p>
        <p className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Check your spelling
        </p>
        <p className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Use more general terms
        </p>
      </div>
    </div>
  )
}

export default function SearchResults({
  listings,
  isLoading,
  totalCount,
  className,
}: SearchResultsProps) {
  return (
    <div className={className}>
      {/* Results count */}
      {!isLoading && totalCount !== undefined && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {totalCount === 0
              ? "No results found"
              : totalCount === 1
              ? "1 result found"
              : `${totalCount} results found`}
          </p>
        </div>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ease-in-out">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 12 }).map((_, index) => (
            <ListingCardSkeleton key={index} />
          ))
        ) : listings.length > 0 ? (
          // Listing cards
          listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        ) : (
          // Empty state
          <EmptyState />
        )}
      </div>
    </div>
  )
}