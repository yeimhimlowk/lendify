import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { authenticateRequest } from '@/lib/api/auth'
import { 
  handleAPIError, 
  handleValidationError,
  handleAuthorizationError,
  handleConflictError
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  createReviewSchema,
  reviewQuerySchema
} from '@/lib/api/schemas'
// import type { ReviewWithDetails } from '@/lib/supabase/types' // Unused import

/**
 * POST /api/reviews - Create a new review
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'CREATE_REVIEW')

    // Authenticate the request
    const user = await authenticateRequest(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createReviewSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Verify the booking exists and user is part of it
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id, owner_id, status, listing:listings(title)')
      .eq('id', validatedData.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Reviews can only be created for completed bookings' },
        { status: 400 }
      )
    }

    // Check if user is part of the booking (renter or owner)
    const isRenter = booking.renter_id === user.id
    const isOwner = booking.owner_id === user.id
    
    if (!isRenter && !isOwner) {
      return handleAuthorizationError('You can only review bookings you were involved in')
    }

    // Verify reviewee_id is the other party in the booking
    const expectedRevieweeId = isRenter ? booking.owner_id : booking.renter_id
    if (validatedData.reviewee_id !== expectedRevieweeId) {
      return NextResponse.json(
        { error: 'Invalid reviewee for this booking' },
        { status: 400 }
      )
    }

    // Check if review already exists for this booking and reviewer
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', validatedData.booking_id)
      .eq('reviewer_id', user.id)
      .single()

    if (existingReview) {
      return handleConflictError('Review already exists for this booking')
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: validatedData.booking_id,
        reviewer_id: user.id,
        reviewee_id: validatedData.reviewee_id,
        rating: validatedData.rating,
        comment: validatedData.comment
      })
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(id, full_name, avatar_url),
        booking:bookings(id, start_date, end_date, listing:listings(title))
      `)
      .single()

    if (reviewError) {
      throw reviewError
    }

    // Update reviewee's average rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', validatedData.reviewee_id)

    if (allReviews && allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      
      await supabase
        .from('profiles')
        .update({ rating: Math.round(avgRating * 10) / 10 })
        .eq('id', validatedData.reviewee_id)
    }

    const response = NextResponse.json(
      createSuccessResponse(review, 'Review created successfully'),
      { status: 201 }
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
 * GET /api/reviews - Get reviews with filtering
 */
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_REVIEWS')

    // Parse query parameters
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      reviewer_id: searchParams.get('reviewer_id'),
      reviewee_id: searchParams.get('reviewee_id'),
      booking_id: searchParams.get('booking_id'),
      rating: searchParams.get('rating'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null)
    )
    
    const query = reviewQuerySchema.parse(cleanParams)

    const supabase = await createServerSupabaseClient()

    // Build the query
    let dbQuery = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(id, full_name, avatar_url),
        booking:bookings(id, start_date, end_date, listing:listings(title))
      `, { count: 'exact' })

    // Apply filters
    if (query.reviewer_id) {
      dbQuery = dbQuery.eq('reviewer_id', query.reviewer_id)
    }
    
    if (query.reviewee_id) {
      dbQuery = dbQuery.eq('reviewee_id', query.reviewee_id)
    }
    
    if (query.booking_id) {
      dbQuery = dbQuery.eq('booking_id', query.booking_id)
    }
    
    if (query.rating) {
      dbQuery = dbQuery.eq('rating', query.rating)
    }

    // Apply sorting
    dbQuery = dbQuery.order(query.sortBy, { ascending: query.sortOrder === 'asc' })

    // Apply pagination
    const from = (query.page - 1) * query.limit
    const to = from + query.limit - 1
    dbQuery = dbQuery.range(from, to)

    const { data: reviews, error, count } = await dbQuery

    if (error) {
      throw error
    }

    const response = NextResponse.json(
      createSuccessResponse({
        reviews: reviews || [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / query.limit)
        }
      })
    )

    // Cache reviews for better performance
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
 * OPTIONS /api/reviews - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const POST = withMiddleware(apiMiddleware.authenticated(), handlePOST)
export const GET = withMiddleware(apiMiddleware.public(), handleGET)