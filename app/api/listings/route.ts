import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { authenticateRequest, requireAuth } from '@/lib/api/auth'
import { handleAPIError, handleAuthError, handleValidationError } from '@/lib/api/errors'
import { 
  createSuccessResponse, 
  createPaginatedResponse, 
  extractPagination,
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
export async function GET(request: NextRequest) {
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

    const supabase = await createServerSupabaseClient()
    
    // Build the query
    let dbQuery = supabase
      .from('listings')
      .select(`
        *,
        category:categories(id, name, slug, icon),
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

    // Geographic filtering
    if (query.latitude && query.longitude) {
      // Using PostGIS ST_DWithin for radius search
      const radiusInMeters = query.radius * 1000 // Convert km to meters
      dbQuery = dbQuery.rpc('listings_within_radius', {
        lat: query.latitude,
        lng: query.longitude,
        radius_meters: radiusInMeters
      })
    }

    // Sorting
    const sortMapping = {
      'created_at': 'created_at',
      'price_per_day': 'price_per_day', 
      'title': 'title',
      'updated_at': 'updated_at'
    }
    
    const sortColumn = sortMapping[query.sortBy] || 'created_at'
    dbQuery = dbQuery.order(sortColumn, { ascending: query.sortOrder === 'asc' })

    // Get total count for pagination
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .match(dbQuery as any) // Apply same filters for count

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: listings, error } = await dbQuery

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Create response with cache headers for public listings
    const response = NextResponse.json(
      createPaginatedResponse(
        listings as ListingWithDetails[],
        { page: query.page, limit: query.limit },
        count || 0
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
export async function POST(request: NextRequest) {
  try {
    logAPIRequest(request, 'CREATE_LISTING')

    // Require authentication
    const user = await requireAuth(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: CreateListingInput = createListingSchema.parse(body)

    const supabase = await createServerSupabaseClient()

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
    const listingData = {
      ...validatedData,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Convert location to PostGIS point format
      location: `POINT(${validatedData.location.lng} ${validatedData.location.lat})`
    }

    // Remove the plain location object as we've converted it to PostGIS format
    const { location, ...dataWithoutLocation } = validatedData
    
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        ...dataWithoutLocation,
        owner_id: user.id,
        location: `POINT(${location.lng} ${location.lat})`
      })
      .select(`
        *,
        category:categories(id, name, slug, icon),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .single()

    if (error) {
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
    if (error.message.includes('Authentication')) {
      return handleAuthError(error.message)
    }
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