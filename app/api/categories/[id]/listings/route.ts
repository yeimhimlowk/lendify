import { NextRequest, NextResponse } from 'next/server'
// import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware' // Removed for auth cleanup
import { handleAPIError, handleNotFoundError, handleValidationError } from '@/lib/api/errors'
import { 
  createPaginatedResponse,
  extractPagination,
  extractSort,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { uuidSchema } from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type ListingWithDetails = Database['public']['Tables']['listings']['Row'] & {
  category?: Database['public']['Tables']['categories']['Row']
  owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
}

/**
 * GET /api/categories/[id]/listings - Get all listings in a specific category
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_CATEGORY_LISTINGS')

    // Validate category ID format
    const validationResult = uuidSchema.safeParse(id)
    if (!validationResult.success) {
      return handleValidationError(validationResult.error)
    }
    const categoryId = validationResult.data

    // Parse pagination and sorting parameters
    const pagination = extractPagination(searchParams)
    const sort = extractSort(searchParams)

    // Additional filters
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const condition = searchParams.get('condition')
    const location = searchParams.get('location')
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const radius = searchParams.get('radius') || '10'

    // TODO: Replace with direct database access - auth removed
    // const supabase = await createServerSupabaseClient()
    throw new Error('Database access temporarily disabled - authentication removed')

    // First verify that the category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('id', categoryId as any)
      .single()

    if (categoryError || !category) {
      return handleNotFoundError('Category')
    }

    // Build the listings query
    let query = supabase
      .from('listings')
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .eq('category_id', categoryId as any)
      .eq('status', 'active' as any)

    // Apply price filters
    if (minPrice) {
      const minPriceNum = parseFloat(minPrice)
      if (!isNaN(minPriceNum)) {
        query = query.gte('price_per_day', minPriceNum)
      }
    }

    if (maxPrice) {
      const maxPriceNum = parseFloat(maxPrice)
      if (!isNaN(maxPriceNum)) {
        query = query.lte('price_per_day', maxPriceNum)
      }
    }

    // Apply condition filter
    if (condition && ['new', 'like_new', 'good', 'fair', 'poor'].includes(condition)) {
      query = query.eq('condition', condition as any)
    }

    // Apply location filters
    if (location && !latitude && !longitude) {
      // Text-based location search
      query = query.ilike('address', `%${location}%`)
    }

    // Geographic filtering - we'll handle this separately since RPC functions can't be chained
    let listings: any[] = []
    
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      const radiusKm = parseFloat(radius)

      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radiusKm)) {
        const radiusInMeters = radiusKm * 1000
        
        // Use RPC function to get listings within radius
        const { data: nearbyListings, error: rpcError } = await supabase
          .rpc('listings_within_radius', {
            lat,
            lng,
            radius_meters: radiusInMeters
          })
        
        if (rpcError) {
          throw new Error(`Location search error: ${rpcError.message}`)
        }
        
        // Filter the nearby listings by category and other criteria
        listings = ((nearbyListings as any[]) || []).filter((listing: any) => {
          let match = listing.category_id === (categoryId as any) && listing.status === 'active'
          
          if (minPrice) {
            const minPriceNum = parseFloat(minPrice)
            if (!isNaN(minPriceNum)) {
              match = match && listing.price_per_day >= minPriceNum
            }
          }
          
          if (maxPrice) {
            const maxPriceNum = parseFloat(maxPrice)
            if (!isNaN(maxPriceNum)) {
              match = match && listing.price_per_day <= maxPriceNum
            }
          }
          
          if (condition && ['new', 'like_new', 'good', 'fair', 'poor'].includes(condition)) {
            match = match && listing.condition === condition
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
      }
    } else {
      // Non-geographic query - proceed with the existing query
      const { data, error } = await query
      
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

    const sortColumn = sortMapping[sort.sortBy as keyof typeof sortMapping] || 'created_at'
    listings.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      if (aValue < bValue) return sort.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Get total count before pagination
    const totalCount = listings.length

    // Apply pagination
    const offset = pagination.offset || 0
    const paginatedListings = listings.slice(offset, offset + pagination.limit)

    // Create response with category context
    const responseData = createPaginatedResponse(
      paginatedListings as ListingWithDetails[],
      { page: pagination.page, limit: pagination.limit },
      totalCount
    )

    // Add category information to the response
    const enhancedResponse = {
      ...responseData,
      category: {
        id: (category as any).id,
        name: (category as any).name,
        slug: (category as any).slug
      }
    }

    const response = NextResponse.json(enhancedResponse)

    // Cache category listings for better performance
    const cacheHeaders = getCacheHeaders(300, 60) // 5 min cache, 1 min revalidate
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
 * OPTIONS /api/categories/[id]/listings - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.public(), handleGET)