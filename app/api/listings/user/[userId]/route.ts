import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { authenticateRequest, checkOwnership } from '@/lib/api/auth'
import { 
  handleAPIError, 
  handleNotFoundError,
  handleValidationError 
} from '@/lib/api/errors'
import { 
  createPaginatedResponse,
  extractPagination,
  logAPIRequest,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  uuidSchema,
  listingStatusSchema
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type ListingWithDetails = Database['public']['Tables']['listings']['Row'] & {
  category?: Database['public']['Tables']['categories']['Row']
  _count?: {
    bookings: number
    active_bookings: number
  }
}

/**
 * GET /api/listings/user/[userId] - Get listings by user ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_USER_LISTINGS')

    // Validate user ID format
    const validUserId = uuidSchema.parse(userId)

    // Parse pagination and filters
    const pagination = extractPagination(searchParams)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'updated_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Validate status if provided
    const validStatus = status ? listingStatusSchema.parse(status) : undefined

    const supabase = await createServerSupabaseClient()

    // Check if user exists
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', validUserId)
      .single()

    if (userError || !userProfile) {
      return handleNotFoundError('User')
    }

    // Check authentication and permissions
    const { user: currentUser } = await authenticateRequest(request)
    const isOwner = currentUser && checkOwnership(currentUser.id, validUserId)

    // Build query based on permissions
    let query = supabase
      .from('listings')
      .select(`
        *,
        category:categories(id, name, slug, icon)
      `)
      .eq('owner_id', validUserId)

    // Apply visibility filters
    if (!isOwner) {
      // Non-owners can only see active listings
      query = query.eq('status', 'active')
    } else if (validStatus) {
      // Owner can filter by specific status
      query = query.eq('status', validStatus)
    }

    // Apply category filter
    if (category) {
      if (category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        query = query.eq('category_id', category)
      } else {
        query = query.eq('categories.slug', category)
      }
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'updated_at', 'title', 'price_per_day', 'status']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updated_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Get total count for pagination
    const countQuery = supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', validUserId)

    if (!isOwner) {
      countQuery.eq('status', 'active')
    } else if (validStatus) {
      countQuery.eq('status', validStatus)
    }

    const { count } = await countQuery

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)

    const { data: listings, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Enhance listings with booking counts for owner
    let enhancedListings: ListingWithDetails[] = listings || []

    if (isOwner && listings) {
      enhancedListings = await Promise.all(
        listings.map(async (listing) => {
          // Get booking statistics
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('listing_id', listing.id)

          const totalBookings = bookings?.length || 0
          const activeBookings = bookings?.filter(
            b => ['confirmed', 'active'].includes(b.status || '')
          ).length || 0

          return {
            ...listing,
            _count: {
              bookings: totalBookings,
              active_bookings: activeBookings
            }
          }
        })
      )
    }

    const response = NextResponse.json(
      createPaginatedResponse(
        enhancedListings,
        { page: pagination.page, limit: pagination.limit },
        count || 0
      )
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/listings/user/[userId] - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}