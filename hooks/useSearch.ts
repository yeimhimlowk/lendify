"use client"

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchFilters {
  query?: string
  minPrice?: string
  maxPrice?: string
  categories?: string[]
  location?: string
  availableFrom?: string
  availableTo?: string
  sortBy?: string
}

interface SearchResult {
  id: string
  title: string
  photos: string[]
  price_per_day: number
  address?: string
  rating?: number
  rating_count?: number
  category?: string
  owner?: {
    full_name: string
  }
}

interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  page: number
  pageSize: number
}

export function useSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Parse filters from URL
  const filters: SearchFilters = {
    query: searchParams.get('q') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    categories: searchParams.get('categories')?.split(',').filter(Boolean),
    location: searchParams.get('location') || undefined,
    availableFrom: searchParams.get('from') || undefined,
    availableTo: searchParams.get('to') || undefined,
    sortBy: searchParams.get('sort') || undefined,
  }
  
  const debouncedQuery = useDebounce(filters.query, 300)
  
  // Fetch search results
  const fetchResults = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      
      if (debouncedQuery) params.append('query', debouncedQuery)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.categories?.length) params.append('category', filters.categories.join(','))
      if (filters.location) params.append('location', filters.location)
      if (filters.availableFrom) params.append('available_from', filters.availableFrom)
      if (filters.availableTo) params.append('available_to', filters.availableTo)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      
      const response = await fetch(`/api/search?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Search failed: ${response.status}`)
      }
      
      const data: SearchResponse = await response.json()
      setResults(data.results || [])
      setTotalCount(data.totalCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, filters.minPrice, filters.maxPrice, filters.categories, filters.location, filters.availableFrom, filters.availableTo, filters.sortBy])
  
  // Update URL with new filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key === 'query' ? 'q' : key)
      } else if (key === 'query') {
        params.set('q', value as string)
      } else if (key === 'categories' && Array.isArray(value)) {
        if (value.length > 0) {
          params.set('categories', value.join(','))
        } else {
          params.delete('categories')
        }
      } else if (key === 'availableFrom') {
        params.set('from', value as string)
      } else if (key === 'availableTo') {
        params.set('to', value as string)
      } else if (key === 'sortBy') {
        params.set('sort', value as string)
      } else {
        params.set(key, value as string)
      }
    })
    
    router.push(`/search?${params.toString()}`)
  }, [searchParams, router])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    router.push('/search')
  }, [router])
  
  // Fetch results when filters change
  useEffect(() => {
    fetchResults()
  }, [fetchResults])
  
  return {
    results,
    totalCount,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
  }
}