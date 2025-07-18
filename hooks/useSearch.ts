"use client"

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { useGeolocation } from '@/hooks/useGeolocation'

interface SearchFilters {
  query?: string
  minPrice?: string
  maxPrice?: string
  categories?: string[]
  condition?: string
  location?: string
  latitude?: string
  longitude?: string
  radius?: string
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
  const { getCurrentPosition, isLoading: isGettingLocation } = useGeolocation()
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>()
  
  // Parse filters from URL - memoized to prevent recreating on every render
  const filters = useMemo<SearchFilters>(() => ({
    query: searchParams.get('q') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    categories: searchParams.get('categories')?.split(',').filter(Boolean),
    condition: searchParams.get('condition') || undefined,
    location: searchParams.get('location') || undefined,
    latitude: searchParams.get('latitude') || undefined,
    longitude: searchParams.get('longitude') || undefined,
    radius: searchParams.get('radius') || undefined,
    availableFrom: searchParams.get('from') || undefined,
    availableTo: searchParams.get('to') || undefined,
    sortBy: searchParams.get('sort') || undefined,
  }), [searchParams])
  
  // Initialize coordinates from URL parameters
  useEffect(() => {
    if (filters.latitude && filters.longitude) {
      setCoordinates({
        lat: parseFloat(filters.latitude),
        lng: parseFloat(filters.longitude)
      })
    } else {
      setCoordinates(undefined)
    }
  }, [filters.latitude, filters.longitude])
  
  // Debounce only the query text, not other filters
  const debouncedQuery = useDebounce(filters.query, 300)
  
  // Fetch search results
  const fetchResults = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      
      // Use debounced query for text search
      if (debouncedQuery) params.append('query', debouncedQuery)
      
      // Add all other filters immediately (no debounce)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.categories?.length) params.append('category', filters.categories.join(','))
      if (filters.condition) params.append('condition', filters.condition)
      if (filters.location) params.append('location', filters.location)
      if (filters.latitude) params.append('latitude', filters.latitude)
      if (filters.longitude) params.append('longitude', filters.longitude)
      if (filters.radius) params.append('radius', filters.radius)
      if (filters.availableFrom) params.append('available_from', filters.availableFrom)
      if (filters.availableTo) params.append('available_to', filters.availableTo)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      
      const response = await fetch(`/api/search?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Search failed: ${response.status}`)
      }
      
      const data = await response.json()
      // Handle both old and new API response formats
      if (data.success && data.data) {
        // New format from search API
        setResults(data.data || [])
        setTotalCount(data.pagination?.total || 0)
      } else if (data.results) {
        // Old format
        setResults(data.results || [])
        setTotalCount(data.totalCount || 0)
      } else {
        // Fallback
        setResults([])
        setTotalCount(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [filters, debouncedQuery]) // Dependencies simplified - filters is memoized
  
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
      } else if (key === 'latitude' || key === 'longitude' || key === 'radius') {
        params.set(key, value as string)
      } else {
        params.set(key, value as string)
      }
    })
    
    router.push(`/search?${params.toString()}`)
  }, [searchParams, router])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    // Clear all URL parameters
    router.push('/search')
    // Clear local state
    setCoordinates(undefined)
    setError(null)
    // Results will be refetched automatically when URL changes
  }, [router])
  
  // Use current location for search
  const useMyLocation = useCallback(async () => {
    try {
      const position = await getCurrentPosition()
      setCoordinates(position)
      updateFilters({
        latitude: position.lat.toString(),
        longitude: position.lng.toString(),
        radius: '10' // Default radius
      })
    } catch (error) {
      console.error('Failed to get location:', error)
      // Could show a toast notification here
    }
  }, [getCurrentPosition, updateFilters])
  
  // Update coordinates
  const updateCoordinates = useCallback((newCoordinates: { lat: number; lng: number } | undefined) => {
    setCoordinates(newCoordinates)
    if (newCoordinates) {
      updateFilters({
        latitude: newCoordinates.lat.toString(),
        longitude: newCoordinates.lng.toString(),
        radius: filters.radius || '10'
      })
    } else {
      updateFilters({
        latitude: undefined,
        longitude: undefined,
        radius: undefined
      })
    }
  }, [updateFilters, filters.radius])
  
  // Update radius
  const updateRadius = useCallback((radius: number) => {
    updateFilters({
      radius: radius.toString()
    })
  }, [updateFilters])
  
  // Trigger search when non-query filters change immediately
  useEffect(() => {
    // Skip if only query is being typed (debounced separately)
    const hasNonQueryFilters = filters.minPrice || filters.maxPrice || 
      filters.categories?.length || filters.condition || filters.location ||
      filters.latitude || filters.longitude || filters.radius ||
      filters.availableFrom || filters.availableTo || filters.sortBy
    
    if (hasNonQueryFilters || !filters.query) {
      fetchResults()
    }
  }, [filters.minPrice, filters.maxPrice, filters.categories, filters.condition,
      filters.location, filters.latitude, filters.longitude, filters.radius,
      filters.availableFrom, filters.availableTo, filters.sortBy, fetchResults])
  
  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== undefined) {
      fetchResults()
    }
  }, [debouncedQuery, fetchResults])
  
  return {
    results,
    totalCount,
    isLoading,
    error,
    filters,
    coordinates,
    isGettingLocation,
    updateFilters,
    clearFilters,
    useMyLocation,
    updateCoordinates,
    updateRadius,
  }
}