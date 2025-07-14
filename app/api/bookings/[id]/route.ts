import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { 
  handleAPIError, 
  handleAuthError, 
  handleAuthorizationError,
  handleNotFoundError,
  handleValidationError,
  handleConflictError
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  updateBookingSchema,
  uuidSchema,
  type UpdateBookingInput 
} from '@/lib/api/schemas'
// import type { Database } from '@/lib/supabase/types'

// type BookingWithDetails = Database['public']['Tables']['bookings']['Row'] & {
//   listing?: Database['public']['Tables']['listings']['Row'] & {
//     category?: Database['public']['Tables']['categories']['Row']
//   }
//   renter?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
//   owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
// }

/**
 * GET /api/bookings/[id] - Get single booking details
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'GET_BOOKING')

    // Require authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate UUID format
    uuidSchema.parse(id)

    // Get booking with related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        listing:listings(
          id,
          title,
          description,
          price_per_day,
          photos,
          address,
          owner_id,
          category:categories(*)
        ),
        renter:profiles!bookings_renter_id_fkey(id, full_name, avatar_url, rating, verified),
        owner:profiles!bookings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .eq('id', id as any)
      .single()

    if (error || !booking) {
      return handleNotFoundError('Booking')
    }

    // Check if user has permission to view this booking
    const hasPermission = user.id === (booking as any).renter_id || user.id === (booking as any).owner_id
    if (!hasPermission) {
      return handleAuthorizationError('You can only view your own bookings')
    }

    const response = NextResponse.json(
      createSuccessResponse(booking as any)
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
 * PUT /api/bookings/[id] - Update booking status and details
 */
async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'UPDATE_BOOKING')

    // Require authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate UUID format
    uuidSchema.parse(id)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: UpdateBookingInput = updateBookingSchema.parse(body)

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id as any)
      .single()

    if (fetchError || !existingBooking) {
      return handleNotFoundError('Booking')
    }

    // Check permissions based on the operation
    const isRenter = user.id === (existingBooking as any).renter_id
    const isOwner = user.id === (existingBooking as any).owner_id

    if (!isRenter && !isOwner) {
      return handleAuthorizationError('You can only update your own bookings')
    }

    // Validate status transitions and permissions
    if (validatedData.status) {
      const currentStatus = (existingBooking as any).status
      const newStatus = validatedData.status

      // Define allowed status transitions
      const allowedTransitions: { [key: string]: { allowed: string[], roles: string[] } } = {
        'pending': {
          allowed: ['confirmed', 'cancelled'],
          roles: ['owner', 'renter'] // Owner can confirm, both can cancel
        },
        'confirmed': {
          allowed: ['active', 'cancelled'],
          roles: ['owner', 'renter'] // Owner can mark active, both can cancel
        },
        'active': {
          allowed: ['completed', 'cancelled'],
          roles: ['owner', 'renter'] // Both can complete or cancel
        },
        'completed': {
          allowed: [], // No transitions from completed
          roles: []
        },
        'cancelled': {
          allowed: [], // No transitions from cancelled
          roles: []
        }
      }

      const transition = allowedTransitions[currentStatus || 'pending']
      
      if (!transition || !transition.allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        )
      }

      // Check role-based permissions for specific transitions
      if (newStatus === 'confirmed' && !isOwner) {
        return handleAuthorizationError('Only the listing owner can confirm bookings')
      }

      if (newStatus === 'active' && !isOwner) {
        return handleAuthorizationError('Only the listing owner can mark bookings as active')
      }
    }

    // Validate date changes
    if (validatedData.start_date || validatedData.end_date) {
      // Only allow date changes for pending bookings
      if ((existingBooking as any).status !== 'pending') {
        return NextResponse.json(
          { error: 'Dates can only be changed for pending bookings' },
          { status: 400 }
        )
      }

      // Only renter can change dates
      if (!isRenter) {
        return handleAuthorizationError('Only the renter can change booking dates')
      }

      const startDate = validatedData.start_date || (existingBooking as any).start_date
      const endDate = validatedData.end_date || (existingBooking as any).end_date

      // Check for conflicts with other bookings
      const { data: conflictingBookings, error: conflictError } = await supabase
        .from('bookings')
        .select('id')
        .eq('listing_id', (existingBooking as any).listing_id)
        .neq('id', id as any) // Exclude current booking
        .in('status', ['confirmed', 'active'] as any)
        .or(`
          and(start_date.lte.${startDate},end_date.gte.${startDate}),
          and(start_date.lte.${endDate},end_date.gte.${endDate}),
          and(start_date.gte.${startDate},end_date.lte.${endDate})
        `)

      if (conflictError) {
        throw new Error(`Failed to check booking conflicts: ${conflictError.message}`)
      }

      if (conflictingBookings && conflictingBookings.length > 0) {
        return handleConflictError('Listing is not available for the selected dates')
      }

      // Recalculate total price if dates changed
      if (validatedData.start_date || validatedData.end_date) {
        const { data: listing } = await supabase
          .from('listings')
          .select('price_per_day')
          .eq('id', (existingBooking as any).listing_id)
          .single()

        if (listing) {
          const daysDiff = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
          )
          validatedData.total_price = daysDiff * (listing as any).price_per_day
        }
      }
    }

    // Update the booking
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update(updateData as any)
      .eq('id', id as any)
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
      throw new Error(`Failed to update booking: ${error.message}`)
    }

    // TODO: Send notifications for status changes
    // TODO: Send emails for important status updates

    logAPIRequest(request, 'UPDATE_BOOKING_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        updatedBooking,
        'Booking updated successfully'
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
 * DELETE /api/bookings/[id] - Cancel/delete booking
 */
async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'DELETE_BOOKING')

    // Require authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate UUID format
    uuidSchema.parse(id)

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id as any)
      .single()

    if (fetchError || !existingBooking) {
      return handleNotFoundError('Booking')
    }

    // Check permissions
    const isRenter = user.id === (existingBooking as any).renter_id
    const isOwner = user.id === (existingBooking as any).owner_id

    if (!isRenter && !isOwner) {
      return handleAuthorizationError('You can only cancel your own bookings')
    }

    // Check if booking can be cancelled
    if ((existingBooking as any).status === 'completed') {
      return NextResponse.json(
        { error: 'Completed bookings cannot be cancelled' },
        { status: 400 }
      )
    }

    if ((existingBooking as any).status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    // Update booking status to cancelled instead of deleting
    const { data: cancelledBooking, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id as any)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`)
    }

    // TODO: Send cancellation notifications
    // TODO: Handle refund logic if applicable

    logAPIRequest(request, 'DELETE_BOOKING_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        cancelledBooking,
        'Booking cancelled successfully'
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
 * OPTIONS /api/bookings/[id] - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.authenticated(), handleGET)
export const PUT = withMiddleware(apiMiddleware.authenticated(), handlePUT)
export const DELETE = withMiddleware(apiMiddleware.authenticated(), handleDELETE)