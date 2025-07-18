import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
// import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { handleAPIError, handleValidationError } from '@/lib/api/errors'
import { 
  createPaginatedResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  searchQuerySchema,
  type SearchQuery 
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type SearchResult = Database['public']['Tables']['listings']['Row'] & {
  category?: Database['public']['Tables']['categories']['Row']
  owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
  _relevance?: number
  _distance?: number
}

/**
 * GET /api/search - Comprehensive search with filters and ranking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'SEARCH_LISTINGS')

    // Parse and validate search parameters
    // Filter out null values to prevent Zod coercion errors
    const params = {
      query: searchParams.get('query'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      category: searchParams.get('category'),
      location: searchParams.get('location'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      radius: searchParams.get('radius'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      condition: searchParams.get('condition'),
      tags: searchParams.get('tags'),
      available_from: searchParams.get('available_from'),
      available_to: searchParams.get('available_to'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query: SearchQuery = searchQuerySchema.parse(cleanParams)

    // Use server client for search operations
    const supabase = await createServerSupabaseClient()

    // Process category parameter early to convert slugs to UUIDs
    let categoryIds: string[] = []
    if (query.category) {
      const categories = query.category.split(',').map(c => c.trim())
      const uuids: string[] = []
      const slugs: string[] = []
      
      // Separate UUIDs and slugs
      for (const cat of categories) {
        if (cat.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
          uuids.push(cat)
        } else {
          slugs.push(cat)
        }
      }
      
      // Convert slugs to UUIDs
      categoryIds = [...uuids]
      if (slugs.length > 0) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .in('slug', slugs)
        
        if (categoryData) {
          categoryIds.push(...categoryData.map(c => c.id))
        }
      }
    }

    // Build base query - Note: We need to explicitly get location as GeoJSON
    let _dbQuery = supabase
      .from('listings')
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .eq('status', 'active')

    // Text search functionality
    if (query.query) {
      const searchTerms = query.query.trim().toLowerCase()
      
      // Use PostgreSQL full-text search on listing fields only
      // Note: Cannot search categories.name directly in or() filter
      _dbQuery = _dbQuery.or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%`)
      
      // Check if any tags contain the search term
      // Using contains for array search
      // _dbQuery = _dbQuery.contains('tags', [searchTerms])
    }

    // Category filter - use pre-processed categoryIds
    if (categoryIds.length > 0) {
      if (categoryIds.length === 1) {
        _dbQuery = _dbQuery.eq('category_id', categoryIds[0])
      } else {
        _dbQuery = _dbQuery.in('category_id', categoryIds)
      }
    }

    // Handle geographic search separately since RPC can't be chained
    let listings: any[] = []
    let useGeographicSearch = false
    
    if (query.latitude && query.longitude) {
      useGeographicSearch = true
      // We'll handle this after building the filters
    } else if (query.location) {
      // Text-based location search
      _dbQuery = _dbQuery.ilike('address', `%${query.location}%`)
    }

    // Price range filters
    if (query.minPrice) {
      _dbQuery = _dbQuery.gte('price_per_day', query.minPrice)
    }
    if (query.maxPrice) {
      _dbQuery = _dbQuery.lte('price_per_day', query.maxPrice)
    }

    // Condition filter
    if (query.condition) {
      _dbQuery = _dbQuery.eq('condition', query.condition)
    }

    // Tags filter
    if (query.tags) {
      const tags = query.tags.split(',').map(tag => tag.trim().toLowerCase())
      _dbQuery = _dbQuery.overlaps('tags', tags)
    }

    // Availability filter
    if (query.available_from && query.available_to) {
      // Check for availability conflicts with existing bookings
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('listing_id')
        .in('status', ['confirmed', 'active'])
        .or(`
          and(start_date.lte.${query.available_from},end_date.gte.${query.available_from}),
          and(start_date.lte.${query.available_to},end_date.gte.${query.available_to}),
          and(start_date.gte.${query.available_from},end_date.lte.${query.available_to})
        `)

      if (conflictingBookings && conflictingBookings.length > 0) {
        // Note: _dbQuery filtering not used in current implementation - using RPC instead
        // const _conflictingListingIds = conflictingBookings.map(b => b.listing_id)
      }
    }

    // Execute geographic search if needed
    if (useGeographicSearch) {
      const radiusInMeters = query.radius * 1000
      const { data: nearbyListings, error: rpcError } = await supabase
        .rpc('listings_within_radius', {
          lat: query.latitude!,
          lng: query.longitude!,
          radius_meters: radiusInMeters
        })
      
      if (rpcError) {
        throw new Error(`Location search error: ${rpcError.message}`)
      }
      
      // Apply other filters to geographic results
      listings = (nearbyListings || []).filter((listing: any) => {
        let match = listing.status === 'active'
        
        if (query.query) {
          const searchTerms = query.query.trim().toLowerCase()
          match = match && (
            listing.title?.toLowerCase().includes(searchTerms) ||
            listing.description?.toLowerCase().includes(searchTerms)
          )
        }
        
        if (categoryIds.length > 0) {
          // Check if listing category_id matches any of the provided category IDs
          match = match && categoryIds.includes(listing.category_id)
        }
        
        if (query.minPrice) {
          match = match && listing.price_per_day >= query.minPrice
        }
        
        if (query.maxPrice) {
          match = match && listing.price_per_day <= query.maxPrice
        }
        
        if (query.condition) {
          match = match && listing.condition === query.condition
        }
        
        if (query.tags) {
          const tags = query.tags.split(',').map(tag => tag.trim().toLowerCase())
          match = match && listing.tags?.some((tag: string) => tags.includes(tag.toLowerCase()))
        }
        
        return match
      })
      
      // Now fetch the full data with relationships
      if (listings.length > 0) {
        const listingIds = listings.map((l: any) => l.id)
        // Store the distance and location data from RPC
        const rpcDataMap = new Map(listings.map((l: any) => [l.id, { distance: l.distance, location: l.location }]))
        
        const { data: fullListings, error: fetchError } = await supabase
          .from('listings')
          .select(`
            *,
            category:categories(*),
            owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
          `)
          .in('id', listingIds)
        
        if (fetchError) {
          throw new Error(`Database error: ${fetchError.message}`)
        }
        
        // Merge the RPC data back into the full listings
        listings = (fullListings || []).map((listing: any) => {
          const rpcData = rpcDataMap.get(listing.id)
          return {
            ...listing,
            distance: rpcData?.distance,
            location: rpcData?.location || listing.location
          }
        })
      }
    } else {
      // Non-geographic query - use RPC to get location as GeoJSON
      const { data: rpcListings, error: rpcError } = await (supabase as any)
        .rpc('search_listings', {
          search_query: query.query || null,
          category_ids: categoryIds.length > 0 ? categoryIds : null,
          min_price: query.minPrice || null,
          max_price: query.maxPrice || null,
          condition_filter: query.condition || null,
          tags_filter: query.tags ? query.tags.split(',').map(t => t.trim()) : null,
          limit_count: 1000, // Get all for now, paginate later
          offset_count: 0
        })
      
      if (rpcError) {
        throw new Error(`Database error: ${rpcError.message}`)
      }
      
      // Now fetch the relationships
      if (rpcListings && rpcListings.length > 0) {
        const listingIds = rpcListings.map((l: any) => l.id)
        const { data: fullListings, error: fetchError } = await supabase
          .from('listings')
          .select(`
            id,
            category:categories(*),
            owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
          `)
          .in('id', listingIds)
        
        if (fetchError) {
          throw new Error(`Database error: ${fetchError.message}`)
        }
        
        // Merge the data
        const relationshipMap = new Map((fullListings || []).map((l: any) => [l.id, l]))
        listings = rpcListings.map((listing: any) => {
          const relationships = relationshipMap.get(listing.id) || {}
          return {
            ...listing,
            location: listing.location_geojson, // Use the GeoJSON format
            category: relationships.category,
            owner: relationships.owner
          }
        })
      } else {
        listings = []
      }
    }
    
    // Get total count for pagination (before sorting and limiting)
    const totalCount = listings.length
    
    // Handle availability filter for geographic results
    if (useGeographicSearch && query.available_from && query.available_to) {
      // Check for availability conflicts with existing bookings
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('listing_id')
        .in('status', ['confirmed', 'active'])
        .or(`
          and(start_date.lte.${query.available_from},end_date.gte.${query.available_from}),
          and(start_date.lte.${query.available_to},end_date.gte.${query.available_to}),
          and(start_date.gte.${query.available_from},end_date.lte.${query.available_to})
        `)

      if (conflictingBookings && conflictingBookings.length > 0) {
        const conflictingListingIds = conflictingBookings.map(b => b.listing_id)
        listings = listings.filter(l => !conflictingListingIds.includes(l.id))
      }
    }

    // Apply sorting
    const sortMapping: Record<string, string> = {
      'relevance': 'created_at',
      'price_low': 'price_per_day',
      'price_high': 'price_per_day',
      'newest': 'created_at',
      'rating': 'created_at', // Would need owner rating data
      'price_per_day': 'price_per_day',
      'created_at': 'created_at',
      'distance': 'created_at' // Fallback if no coordinates
    }
    const sortColumn = sortMapping[query.sortBy] || 'created_at'
    
    // Determine sort order based on sortBy value
    let sortOrder = query.sortOrder || 'desc'
    if (query.sortBy === 'price_low') sortOrder = 'asc'
    if (query.sortBy === 'price_high') sortOrder = 'desc'
    if (query.sortBy === 'newest') sortOrder = 'desc'
    
    listings.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    const paginatedListings = listings.slice(offset, offset + query.limit)

    // Enhance results with relevance scoring and distance calculation
    let enhancedResults: SearchResult[] = paginatedListings.map((listing) => {
        let relevanceScore = 0
        let distance: number | undefined

        // Calculate relevance score if there's a search query
        if (query.query) {
          const searchTerms = query.query.toLowerCase()
          const title = listing.title?.toLowerCase() || ''
          const description = listing.description?.toLowerCase() || ''
          const tags = listing.tags?.join(' ').toLowerCase() || ''

          // Title matches get highest score
          if (title.includes(searchTerms)) relevanceScore += 10
          // Description matches get medium score  
          if (description.includes(searchTerms)) relevanceScore += 5
          // Tag matches get medium score
          if (tags.includes(searchTerms)) relevanceScore += 5
          // Category name matches
          if (listing.category?.name.toLowerCase().includes(searchTerms)) relevanceScore += 7
        }

        // Extract location coordinates for frontend
        let locationCoords = null
        if (listing.location) {
          const coords = extractCoordinatesFromPostGIS(listing.location)
          if (coords) {
            locationCoords = coords
            
            // Calculate distance if search coordinates provided
            if (query.latitude && query.longitude) {
              distance = calculateDistance(query.latitude, query.longitude, coords.lat, coords.lng)
            }
          }
        }

        return {
          ...listing,
          location: locationCoords, // Override with extracted coordinates
          _relevance: relevanceScore,
          _distance: distance
        }
      })

    // Sort by relevance if that was requested
    if (query.sortBy === 'relevance' && query.query) {
      enhancedResults.sort((a, b) => (b._relevance || 0) - (a._relevance || 0))
    }

    // Log search for analytics
    if (query.query) {
      const logSearch = async () => {
        try {
          await supabase
            .from('search_analytics')
            .insert({
              query: query.query!,
              results_count: enhancedResults.length,
              filters: JSON.parse(JSON.stringify({
                category: query.category,
                location: query.location,
                price_range: query.minPrice || query.maxPrice ? [query.minPrice, query.maxPrice] : null,
                condition: query.condition
              })),
              created_at: new Date().toISOString()
            })
        } catch (error) {
          console.error('Failed to log search analytics:', error)
        }
      }
      
      logSearch() // Fire and forget
    }

    const response = NextResponse.json(
      createPaginatedResponse(
        enhancedResults,
        { page: query.page, limit: query.limit },
        totalCount
      )
    )

    // Add cache headers for search results
    const cacheHeaders = getCacheHeaders(180, 30) // 3 min cache, 30 sec revalidate
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/search - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

/**
 * Helper function to extract coordinates from PostGIS location data
 */
function extractCoordinatesFromPostGIS(location: any): { lat: number; lng: number } | null {
  if (!location) return null
  
  try {
    // If location is already an object with coordinates
    if (typeof location === 'object' && location.coordinates) {
      const [lng, lat] = location.coordinates
      return { lat, lng }
    }
    
    // If location is a string in WKT format like "POINT(-122.4194 37.7749)"
    if (typeof location === 'string' && location.startsWith('POINT')) {
      const match = location.match(/POINT\(([^)]+)\)/)
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number)
        return { lat, lng }
      }
    }
    
    // If location has lat/lng properties directly
    if (location.lat !== undefined && location.lng !== undefined) {
      return { lat: location.lat, lng: location.lng }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting coordinates:', error)
    return null
  }
}

/**
 * Helper function to calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}