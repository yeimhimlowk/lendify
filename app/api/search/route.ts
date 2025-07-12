import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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

    const supabase = await createServerSupabaseClient()

    // Build base query
    let dbQuery = supabase
      .from('listings')
      .select(`
        *,
        category:categories(id, name, slug, icon),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .eq('status', 'active')

    // Text search functionality
    if (query.query) {
      const searchTerms = query.query.trim().toLowerCase()
      
      // Use PostgreSQL full-text search on listing fields only
      // Note: Cannot search categories.name directly in or() filter
      dbQuery = dbQuery.or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%`)
      
      // Check if any tags contain the search term
      // Using contains for array search
      // dbQuery = dbQuery.contains('tags', [searchTerms])
    }

    // Category filter
    if (query.category) {
      if (query.category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        dbQuery = dbQuery.eq('category_id', query.category)
      } else {
        dbQuery = dbQuery.eq('categories.slug', query.category)
      }
    }

    // Location-based filtering
    if (query.latitude && query.longitude) {
      // Use PostGIS for geographic search
      const radiusInMeters = query.radius * 1000
      dbQuery = dbQuery.rpc('listings_within_radius', {
        lat: query.latitude,
        lng: query.longitude,
        radius_meters: radiusInMeters
      })
    } else if (query.location) {
      // Text-based location search
      dbQuery = dbQuery.ilike('address', `%${query.location}%`)
    }

    // Price range filters
    if (query.minPrice) {
      dbQuery = dbQuery.gte('price_per_day', query.minPrice)
    }
    if (query.maxPrice) {
      dbQuery = dbQuery.lte('price_per_day', query.maxPrice)
    }

    // Condition filter
    if (query.condition) {
      dbQuery = dbQuery.eq('condition', query.condition)
    }

    // Tags filter
    if (query.tags) {
      const tags = query.tags.split(',').map(tag => tag.trim().toLowerCase())
      dbQuery = dbQuery.overlaps('tags', tags)
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
        const conflictingListingIds = conflictingBookings.map(b => b.listing_id)
        dbQuery = dbQuery.not('id', 'in', `(${conflictingListingIds.join(',')})`)
      }
    }

    // Get total count for pagination (before sorting and limiting)
    const countQuery = supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query
    let countQueryWithFilters = countQuery.eq('status', 'active')
    
    if (query.query) {
      const searchTerms = query.query.trim().toLowerCase()
      countQueryWithFilters = countQueryWithFilters.or(`
        title.ilike.%${searchTerms}%,
        description.ilike.%${searchTerms}%,
        tags.cs.{${searchTerms}}
      `)
    }
    
    // Apply other filters to count query...
    if (query.category && query.category.match(/^[0-9a-f]{8}-/)) {
      countQueryWithFilters = countQueryWithFilters.eq('category_id', query.category)
    }
    if (query.minPrice) countQueryWithFilters = countQueryWithFilters.gte('price_per_day', query.minPrice)
    if (query.maxPrice) countQueryWithFilters = countQueryWithFilters.lte('price_per_day', query.maxPrice)
    if (query.condition) countQueryWithFilters = countQueryWithFilters.eq('condition', query.condition)

    const { count } = await countQueryWithFilters

    // Apply sorting
    if (query.sortBy === 'relevance' && query.query) {
      // For relevance sorting with text search, use ts_rank
      dbQuery = dbQuery.order('created_at', { ascending: false }) // Fallback ordering
    } else if (query.sortBy === 'distance' && query.latitude && query.longitude) {
      // Distance sorting will be handled by the RPC function
      dbQuery = dbQuery.order('created_at', { ascending: false }) // Fallback ordering
    } else {
      // Standard sorting
      const sortMapping = {
        'price_per_day': 'price_per_day',
        'created_at': 'created_at',
        'distance': 'created_at' // Fallback if no coordinates
      }
      const sortColumn = sortMapping[query.sortBy as keyof typeof sortMapping] || 'created_at'
      dbQuery = dbQuery.order(sortColumn, { ascending: query.sortOrder === 'asc' })
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: results, error } = await dbQuery

    if (error) {
      throw new Error(`Search error: ${error.message}`)
    }

    // Enhance results with relevance scoring and distance calculation
    let enhancedResults: SearchResult[] = results || []

    if (results) {
      enhancedResults = results.map((listing) => {
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

        // Calculate distance if coordinates provided
        if (query.latitude && query.longitude && listing.location) {
          // This would need to be calculated from the PostGIS location data
          // For now, we'll set it undefined and let the database handle it
        }

        return {
          ...listing,
          _relevance: relevanceScore,
          _distance: distance
        }
      })

      // Sort by relevance if that was requested
      if (query.sortBy === 'relevance' && query.query) {
        enhancedResults.sort((a, b) => (b._relevance || 0) - (a._relevance || 0))
      }
    }

    // Log search for analytics
    if (query.query) {
      supabase
        .from('search_analytics')
        .insert({
          query: query.query,
          results_count: enhancedResults.length,
          filters: {
            category: query.category,
            location: query.location,
            price_range: query.minPrice || query.maxPrice ? [query.minPrice, query.maxPrice] : null,
            condition: query.condition
          },
          created_at: new Date().toISOString()
        })
        .then(() => {}) // Fire and forget
        .catch(console.error)
    }

    const response = NextResponse.json(
      createPaginatedResponse(
        enhancedResults,
        { page: query.page, limit: query.limit },
        count || 0
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