import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_CATEGORY_LISTINGS')

    // Validate category ID format
    const categoryId = uuidSchema.parse(id)

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

    const supabase = await createServerSupabaseClient()

    // First verify that the category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('id', categoryId)
      .single()

    if (categoryError || !category) {
      return handleNotFoundError('Category')
    }

    // Build the listings query
    let query = supabase
      .from('listings')
      .select(`
        *,
        category:categories(id, name, slug, icon),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .eq('category_id', categoryId)
      .eq('status', 'active')

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
      query = query.eq('condition', condition)
    }

    // Apply location filters
    if (location && !latitude && !longitude) {
      // Text-based location search
      query = query.ilike('address', `%${location}%`)
    }

    // Geographic filtering
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      const radiusKm = parseFloat(radius)

      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radiusKm)) {
        const radiusInMeters = radiusKm * 1000
        query = query.rpc('listings_within_radius', {
          lat,
          lng,
          radius_meters: radiusInMeters
        })
      }
    }

    // Get total count for pagination
    const countQuery = supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('status', 'active')

    // Apply same filters to count query
    if (minPrice) {
      const minPriceNum = parseFloat(minPrice)
      if (!isNaN(minPriceNum)) {
        countQuery.gte('price_per_day', minPriceNum)
      }
    }
    
    if (maxPrice) {
      const maxPriceNum = parseFloat(maxPrice)
      if (!isNaN(maxPriceNum)) {
        countQuery.lte('price_per_day', maxPriceNum)
      }
    }
    
    if (condition && ['new', 'like_new', 'good', 'fair', 'poor'].includes(condition)) {
      countQuery.eq('condition', condition)
    }
    
    if (location && !latitude && !longitude) {
      countQuery.ilike('address', `%${location}%`)
    }

    const { count } = await countQuery

    // Apply sorting
    const sortMapping = {
      'created_at': 'created_at',
      'price_per_day': 'price_per_day',
      'title': 'title',
      'updated_at': 'updated_at'
    }

    const sortColumn = sortMapping[sort.sortBy as keyof typeof sortMapping] || 'created_at'
    query = query.order(sortColumn, { ascending: sort.sortOrder === 'asc' })

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)

    const { data: listings, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Create response with category context
    const responseData = createPaginatedResponse(
      listings as ListingWithDetails[],
      { page: pagination.page, limit: pagination.limit },
      count || 0
    )

    // Add category information to the response
    const enhancedResponse = {
      ...responseData,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug
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