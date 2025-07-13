'use client'

import { Suspense } from 'react'
import SearchFilters from '@/components/search/SearchFilters'
import SearchResults from '@/components/search/SearchResults'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { useSearch } from '@/hooks/useSearch'

// Categories fetched from API or config
const categories = [
  "Electronics",
  "Tools & Equipment", 
  "Sports & Outdoors",
  "Home & Garden",
  "Party & Events",
  "Photography",
  "Vehicles",
  "Musical Instruments",
]

function SearchContent() {
  const {
    results,
    totalCount,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
  } = useSearch()


  const handlePriceRangeChange = (range: [number, number]) => {
    updateFilters({
      minPrice: range[0].toString(),
      maxPrice: range[1].toString(),
    })
  }

  const handleCategoriesChange = (categories: string[]) => {
    updateFilters({ categories })
  }

  const handleLocationChange = (location: string) => {
    updateFilters({ location })
  }

  const handleAvailableDateChange = (date: Date | undefined) => {
    if (date) {
      updateFilters({ 
        availableFrom: date.toISOString().split('T')[0],
        availableTo: date.toISOString().split('T')[0],
      })
    } else {
      updateFilters({ availableFrom: undefined, availableTo: undefined })
    }
  }

  const handleSortByChange = (sortBy: string) => {
    updateFilters({ sortBy })
  }

  return (
    <div className="min-h-screen bg-[var(--gray-bg)]">
      <Header />
      
      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Filters Display - Moved here */}
        {(filters.categories?.length || filters.minPrice || filters.maxPrice || filters.availableFrom) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {filters.categories?.map(category => (
              <span key={category} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-[var(--gray-dark)]">
                {category}
                <button
                  onClick={() => handleCategoriesChange(filters.categories?.filter(c => c !== category) || [])}
                  className="ml-2 hover:text-[var(--primary)]"
                >
                  ×
                </button>
              </span>
            ))}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-[var(--gray-dark)]">
                ${filters.minPrice || '0'} - ${filters.maxPrice || '1000'}
                <button
                  onClick={() => updateFilters({ minPrice: undefined, maxPrice: undefined })}
                  className="ml-2 hover:text-[var(--primary)]"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Enhanced Design */}
          <aside className="lg:w-80">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--black)]">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Clear all
                </button>
              </div>
              
              <SearchFilters
                priceRange={[
                  parseInt(filters.minPrice || '0'),
                  parseInt(filters.maxPrice || '1000'),
                ]}
                onPriceRangeChange={handlePriceRangeChange}
                maxPrice={1000}
                categories={categories}
                selectedCategories={filters.categories || []}
                onCategoriesChange={handleCategoriesChange}
                location={filters.location || ''}
                onLocationChange={handleLocationChange}
                availableDate={filters.availableFrom ? new Date(filters.availableFrom) : undefined}
                onAvailableDateChange={handleAvailableDateChange}
                sortBy={filters.sortBy || 'relevance'}
                onSortByChange={handleSortByChange}
                onClearFilters={clearFilters}
              />
            </div>
          </aside>

          {/* Search Results - Enhanced Design */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-[var(--black)]">
                  {filters.query ? `Results for "${filters.query}"` : 'All Items'}
                </h1>
                <p className="text-[var(--gray-dark)] mt-1">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'} available
                </p>
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => handleSortByChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="relevance">Most Relevant</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {error ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="max-w-md mx-auto">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-[var(--black)] mb-2">Something went wrong</h3>
                  <p className="text-[var(--gray-dark)] mb-6">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-[var(--primary)] text-white px-6 py-2 rounded-full hover:bg-opacity-90 transition-all duration-200"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <SearchResults
                listings={results}
                isLoading={isLoading}
                totalCount={totalCount}
              />
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--gray-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
          <p className="mt-4 text-[var(--gray-dark)]">Loading search results...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}