import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { 
  handleAPIError, 
  handleAuthError, 
  handleValidationError,
  createErrorResponse,
  ErrorCode
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  addSecurityHeaders
} from '@/lib/api/utils'
import { generateRentalAgreement } from '@/lib/ai/openrouter'
import { z } from 'zod'

// Schema for creating an agreement
const createAgreementSchema = z.object({
  booking_id: z.string().uuid(),
  custom_terms: z.string().optional()
})

type CreateAgreementInput = z.infer<typeof createAgreementSchema>

/**
 * GET /api/agreements - Get user's rental agreements
 */
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_AGREEMENTS')

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return handleAuthError('Authentication required')
    }

    const bookingId = searchParams.get('booking_id')

    let query = supabase
      .from('rental_agreements')
      .select(`
        *,
        booking:bookings(
          id,
          start_date,
          end_date,
          total_price,
          status,
          listing:listings(
            id,
            title,
            description,
            price_per_day,
            address,
            category:categories(name),
            condition
          ),
          renter:profiles!bookings_renter_id_fkey(id, full_name, email),
          owner:profiles!bookings_owner_id_fkey(id, full_name, email)
        )
      `)

    // Filter by booking if specified
    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: agreements, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const response = NextResponse.json(
      createSuccessResponse(agreements || [], 'Agreements retrieved successfully')
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.message.includes('Authentication')) {
      return handleAuthError(error.message)
    }
    return handleAPIError(error)
  }
}

/**
 * POST /api/agreements - Create a new rental agreement
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'CREATE_AGREEMENT')

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return handleAuthError('Authentication required')
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData: CreateAgreementInput = createAgreementSchema.parse(body)

    // Get booking details with all related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listing:listings(
          id,
          title,
          description,
          price_per_day,
          address,
          condition,
          category:categories(name)
        ),
        renter:profiles!bookings_renter_id_fkey(id, full_name, email),
        owner:profiles!bookings_owner_id_fkey(id, full_name, email)
      `)
      .eq('id', validatedData.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        createErrorResponse('Booking not found', 404, ErrorCode.NOT_FOUND),
        { status: 404 }
      )
    }

    // Verify user is the owner of the listing
    if (booking.owner_id !== user.id) {
      return NextResponse.json(
        createErrorResponse('Only the listing owner can create rental agreements', 403, ErrorCode.AUTHORIZATION_ERROR),
        { status: 403 }
      )
    }

    // Check if agreement already exists for this booking
    const { data: existingAgreement, error: existingError } = await supabase
      .from('rental_agreements')
      .select('id')
      .eq('booking_id', validatedData.booking_id)
      .single()

    if (existingAgreement && !existingError) {
      return NextResponse.json(
        createErrorResponse('An agreement already exists for this booking', 409, ErrorCode.CONFLICT),
        { status: 409 }
      )
    }

    // Generate the rental agreement using AI
    let agreementText: string
    try {
      agreementText = await generateRentalAgreement({
        renterName: booking.renter?.full_name || 'Renter',
        ownerName: booking.owner?.full_name || 'Owner',
        listingTitle: booking.listing?.title || 'Rental Item',
        listingDescription: booking.listing?.description || undefined,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalPrice: booking.total_price,
        pricePerDay: booking.listing?.price_per_day || 0,
        listingAddress: booking.listing?.address || undefined,
        category: booking.listing?.category?.name || undefined,
        condition: booking.listing?.condition || undefined,
        specialTerms: validatedData.custom_terms || undefined
      })
    } catch (error: any) {
      console.error('Failed to generate rental agreement:', error)
      return NextResponse.json(
        createErrorResponse(
          'Failed to generate rental agreement. Please try again.', 
          500, 
          ErrorCode.INTERNAL_ERROR
        ),
        { status: 500 }
      )
    }

    // Create the agreement in the database
    const { data: agreement, error: createError } = await supabase
      .from('rental_agreements')
      .insert({
        booking_id: validatedData.booking_id,
        agreement_text: agreementText,
        custom_terms: validatedData.custom_terms,
        status: 'draft',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Agreement creation error:', createError)
      throw new Error(`Failed to create agreement: ${createError.message}`)
    }

    // Update booking status to indicate agreement is pending
    await supabase
      .from('bookings')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString() 
      })
      .eq('id', validatedData.booking_id)

    logAPIRequest(request, 'CREATE_AGREEMENT_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        agreement,
        'Rental agreement created successfully'
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
 * OPTIONS /api/agreements - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.authenticated(), handleGET)
export const POST = withMiddleware(apiMiddleware.authenticated(), handlePOST)