import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { handleAPIError, /* handleAuthError, */ handleValidationError } from '@/lib/api/errors'
import { 
  createSuccessResponse, 
  createPaginatedResponse, 
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  createListingSchema, 
  listingQuerySchema,
  type CreateListingInput,
  type ListingQuery 
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']
type ListingWithDetails = Listing & {
  category?: Database['public']['Tables']['categories']['Row']
  owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
  _count?: {
    bookings: number
  }
}

/**
 * GET /api/listings - Fetch listings with search, filtering, and pagination
 */
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_LISTINGS')

    // Parse and validate query parameters
    // Filter out null values to prevent Zod coercion errors
    const params = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      category: searchParams.get('category'),
      location: searchParams.get('location'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      condition: searchParams.get('condition'),
      tags: searchParams.get('tags'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      radius: searchParams.get('radius'),
      featured: searchParams.get('featured')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query: ListingQuery = listingQuerySchema.parse(cleanParams)

    // Get Supabase client for database queries
    const supabase = await createServerSupabaseClient()
    
    // Build the query
    let dbQuery = supabase
      .from('listings')
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)

    // Apply filters
    if (query.category) {
      if (query.category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        // UUID - filter by category ID
        dbQuery = dbQuery.eq('category_id', query.category)
      } else {
        // Slug - filter by category slug via join
        dbQuery = dbQuery.eq('categories.slug', query.category)
      }
    }

    if (query.minPrice) {
      dbQuery = dbQuery.gte('price_per_day', query.minPrice)
    }

    if (query.maxPrice) {
      dbQuery = dbQuery.lte('price_per_day', query.maxPrice)
    }

    if (query.condition) {
      dbQuery = dbQuery.eq('condition', query.condition)
    }

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    } else {
      // Default to active listings only
      dbQuery = dbQuery.eq('status', 'active')
    }

    if (query.tags) {
      const tags = query.tags.split(',').map(tag => tag.trim())
      dbQuery = dbQuery.overlaps('tags', tags)
    }

    if (query.location && !query.latitude && !query.longitude) {
      // Text-based location search
      dbQuery = dbQuery.ilike('address', `%${query.location}%`)
    }

    // Handle geographic search separately since RPC can't be chained
    let listings: any[] = []
    
    if (query.latitude && query.longitude) {
      // Using PostGIS ST_DWithin for radius search
      const radiusInMeters = query.radius * 1000 // Convert km to meters
      
      const { data: nearbyListings, error: rpcError } = await supabase
        .rpc('listings_within_radius', {
          lat: query.latitude,
          lng: query.longitude,
          radius_meters: radiusInMeters
        })
      
      if (rpcError) {
        throw new Error(`Location search error: ${rpcError.message}`)
      }
      
      // Get category ID if needed
      let categoryId: string | null = null
      if (query.category) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', query.category)
          .single()
        
        categoryId = categoryData?.id || null
      }
      
      // Filter the nearby listings by other criteria
      listings = (nearbyListings || []).filter((listing: any) => {
        let match = listing.status === 'active'
        
        if (categoryId) {
          match = match && listing.category_id === categoryId
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
        
        if (query.location) {
          match = match && listing.address?.toLowerCase().includes(query.location.toLowerCase())
        }
        
        return match
      })
      
      // Now fetch the full data with relationships for the filtered listings
      if (listings.length > 0) {
        const listingIds = listings.map(l => l.id)
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
        
        listings = fullListings || []
      }
    } else {
      // Non-geographic query - proceed normally
      const { data, error } = await dbQuery
      
      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }
      
      listings = data || []
    }

    // Apply sorting
    const sortMapping = {
      'created_at': 'created_at',
      'price_per_day': 'price_per_day', 
      'title': 'title',
      'updated_at': 'updated_at'
    }
    
    const sortColumn = sortMapping[query.sortBy] || 'created_at'
    listings.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      if (aValue < bValue) return query.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return query.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Get total count before pagination
    const totalCount = listings.length

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    const paginatedListings = listings.slice(offset, offset + query.limit)

    // Create response with cache headers for public listings
    const response = NextResponse.json(
      createPaginatedResponse(
        paginatedListings as ListingWithDetails[],
        { page: query.page, limit: query.limit },
        totalCount
      )
    )

    // Add cache headers for better performance
    const cacheHeaders = getCacheHeaders(300, 60) // 5 min cache, 1 min revalidate
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return addSecurityHeaders(response)

  } catch (error: any) {
    // Use the global error handler which now properly handles ZodError-like errors
    return handleAPIError(error)
  }
}

/**
 * POST /api/listings - Create a new listing
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'CREATE_LISTING')

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('Received listing data:', JSON.stringify(body, null, 2))
    
    let validatedData: CreateListingInput
    try {
      validatedData = createListingSchema.parse(body)
      console.log('Validation successful, processed data:', JSON.stringify(validatedData, null, 2))
    } catch (validationError) {
      console.error('Validation error details:', validationError)
      throw validationError
    }

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', validatedData.category_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      )
    }

    // Create listing data

    // Remove the plain location object as we've converted it to PostGIS format
    // Also remove photoData since it's frontend-only and not a database column
    const { location, availability, photoData: _photoData, ...dataWithoutLocation } = validatedData
    
    const insertData = {
      ...dataWithoutLocation,
      availability: availability ? JSON.parse(JSON.stringify(availability)) : {},
      owner_id: user.id,
      location: `POINT(${location.lng} ${location.lat})`
    }
    
    console.log('Data being inserted into database:', JSON.stringify(insertData, null, 2))
    
    const { data: listing, error } = await supabase
      .from('listings')
      .insert(insertData)
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .single()

    if (error) {
      console.error('Database insertion error:', error)
      throw new Error(`Failed to create listing: ${error.message}`)
    }

    logAPIRequest(request, 'CREATE_LISTING_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        listing,
        'Listing created successfully'
      ),
      { status: 201 }
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    // if (error.message.includes('Authentication')) {
    //   return handleAuthError(error.message)
    // } // Removed for auth cleanup
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/listings - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.public(), handleGET)
export const POST = withMiddleware(apiMiddleware.authenticated(), handlePOST)