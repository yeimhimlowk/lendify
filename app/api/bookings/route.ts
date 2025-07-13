import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
import { 
  handleAPIError, 
  handleAuthError, 
  handleValidationError,
  handleConflictError
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  createPaginatedResponse,
  logAPIRequest,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  createBookingSchema,
  bookingQuerySchema,
  type CreateBookingInput,
  type BookingQuery 
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type Booking = Database['public']['Tables']['bookings']['Row']
type BookingWithDetails = Booking & {
  listing?: Database['public']['Tables']['listings']['Row'] & {
    category?: Database['public']['Tables']['categories']['Row']
  }
  renter?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
  owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
}

/**
 * GET /api/bookings - Get user's bookings with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_BOOKINGS')

    // Require authentication
    const user = await requireAuth(request)

    // Parse and validate query parameters
    // Filter out null values to prevent Zod coercion errors
    const params = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      listing_id: searchParams.get('listing_id'),
      renter_id: searchParams.get('renter_id'),
      owner_id: searchParams.get('owner_id'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query: BookingQuery = bookingQuerySchema.parse(cleanParams)

    const supabase = await createServerSupabaseClient()

    // Build query - user can see bookings where they are either renter or owner
    let dbQuery = supabase
      .from('bookings')
      .select(`
        *,
        listing:listings(
          id,
          title,
          price_per_day,
          photos,
          address,
          category:categories(*)
        ),
        renter:profiles!bookings_renter_id_fkey(id, full_name, avatar_url, rating, verified),
        owner:profiles!bookings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    if (query.start_date) {
      dbQuery = dbQuery.gte('start_date', query.start_date)
    }

    if (query.end_date) {
      dbQuery = dbQuery.lte('end_date', query.end_date)
    }

    if (query.listing_id) {
      dbQuery = dbQuery.eq('listing_id', query.listing_id)
    }

    // Additional filters (only allow if user has permission)
    if (query.renter_id && query.renter_id === user.id) {
      dbQuery = dbQuery.eq('renter_id', query.renter_id)
    }

    if (query.owner_id && query.owner_id === user.id) {
      dbQuery = dbQuery.eq('owner_id', query.owner_id)
    }

    // Get total count for pagination
    const countQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)

    // Apply same filters to count query
    if (query.status) countQuery.eq('status', query.status)
    if (query.start_date) countQuery.gte('start_date', query.start_date)
    if (query.end_date) countQuery.lte('end_date', query.end_date)
    if (query.listing_id) countQuery.eq('listing_id', query.listing_id)

    const { count } = await countQuery

    // Apply sorting
    const sortMapping = {
      'created_at': 'created_at',
      'start_date': 'start_date',
      'end_date': 'end_date',
      'total_price': 'total_price'
    }

    const sortColumn = sortMapping[query.sortBy] || 'created_at'
    dbQuery = dbQuery.order(sortColumn, { ascending: query.sortOrder === 'asc' })

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: bookings, error } = await dbQuery

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const response = NextResponse.json(
      createPaginatedResponse(
        bookings as BookingWithDetails[],
        { page: query.page, limit: query.limit },
        count || 0
      )
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
 * POST /api/bookings - Create a new booking
 */
export async function POST(request: NextRequest) {
  try {
    logAPIRequest(request, 'CREATE_BOOKING')

    // Require authentication
    const user = await requireAuth(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: CreateBookingInput = createBookingSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Get listing details and verify it exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, owner_id, price_per_day, status, title')
      .eq('id', validatedData.listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Listing is not available for booking' },
        { status: 400 }
      )
    }

    // Prevent users from booking their own listings
    if (listing.owner_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot book your own listing' },
        { status: 400 }
      )
    }

    // Check for booking conflicts
    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('id, start_date, end_date, status')
      .eq('listing_id', validatedData.listing_id)
      .in('status', ['confirmed', 'active'])
      .or(`
        and(start_date.lte.${validatedData.start_date},end_date.gte.${validatedData.start_date}),
        and(start_date.lte.${validatedData.end_date},end_date.gte.${validatedData.end_date}),
        and(start_date.gte.${validatedData.start_date},end_date.lte.${validatedData.end_date})
      `)

    if (conflictError) {
      throw new Error(`Failed to check booking conflicts: ${conflictError.message}`)
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return handleConflictError('Listing is not available for the selected dates')
    }

    // Validate the total price calculation
    const startDate = new Date(validatedData.start_date)
    const endDate = new Date(validatedData.end_date)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const expectedPrice = daysDiff * listing.price_per_day

    // Allow for small floating point differences
    if (Math.abs(validatedData.total_price - expectedPrice) > 0.01) {
      return NextResponse.json(
        { 
          error: 'Invalid total price calculation',
          details: {
            days: daysDiff,
            price_per_day: listing.price_per_day,
            expected_total: expectedPrice,
            provided_total: validatedData.total_price
          }
        },
        { status: 400 }
      )
    }

    // Create the booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        listing_id: validatedData.listing_id,
        renter_id: user.id,
        owner_id: listing.owner_id,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        total_price: validatedData.total_price,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        listing:listings(
          id,
          title,
          price_per_day,
          photos,
          address,
          category:categories(*)
        ),
        renter:profiles!bookings_renter_id_fkey(id, full_name, avatar_url, rating, verified),
        owner:profiles!bookings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .single()

    if (error) {
      throw new Error(`Failed to create booking: ${error.message}`)
    }

    // TODO: Send notification to listing owner
    // TODO: Send confirmation email to renter

    logAPIRequest(request, 'CREATE_BOOKING_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        booking,
        'Booking request created successfully'
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
 * OPTIONS /api/bookings - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}