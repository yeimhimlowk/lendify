import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { authenticateRequest, requireAuth, checkOwnership } from '@/lib/api/auth'
import { 
  handleAPIError, 
  handleAuthError, 
  handleAuthorizationError,
  handleNotFoundError,
  handleValidationError 
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  updateListingSchema,
  uuidSchema,
  type UpdateListingInput 
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']
type BookingPreview = {
  id: string
  start_date: string
  end_date: string
  status: string | null
  renter?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}
type ListingWithDetails = Listing & {
  category?: Database['public']['Tables']['categories']['Row']
  owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
  bookings?: BookingPreview[]
  _count?: {
    bookings: number
    reviews: number
  }
}

/**
 * GET /api/listings/[id] - Get single listing by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'GET_LISTING', undefined)

    // Validate UUID format
    const listingId = uuidSchema.parse(id)

    const supabase = await createServerSupabaseClient()

    // Get listing with related data
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified),
        bookings!bookings_listing_id_fkey(
          id, 
          start_date, 
          end_date, 
          status,
          renter:profiles!bookings_renter_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('id', listingId)
      .single()

    if (error || !listing) {
      return handleNotFoundError('Listing')
    }

    // Check if listing is active or if user is the owner
    const { user } = await authenticateRequest(request)
    const isOwner = user && listing.owner_id === user.id
    
    if (listing.status !== 'active' && !isOwner) {
      return handleNotFoundError('Listing')
    }

    // Add booking count and other stats
    const listingWithStats: ListingWithDetails = {
      ...listing,
      category: listing.category || undefined,
      owner: listing.owner || undefined,
      _count: {
        bookings: listing.bookings?.length || 0,
        reviews: 0 // TODO: Add reviews count when implemented
      }
    }

    // Remove sensitive booking information for non-owners
    if (!isOwner) {
      listingWithStats.bookings = listing.bookings?.map(booking => ({
        ...booking,
        renter: undefined // Hide renter info from non-owners
      }))
    }

    // Track view analytics (fire and forget)
    if (user && user.id !== listing.owner_id) {
      const trackView = async () => {
        try {
          await supabase
            .from('listing_analytics')
            .upsert({
              listing_id: listingId,
              date: new Date().toISOString().split('T')[0],
              views: 1
            }, {
              onConflict: 'listing_id,date',
              ignoreDuplicates: false
            })
          
          // Update views count
          await supabase.rpc('increment_listing_views', { listing_id: listingId })
        } catch (error) {
          console.error('Failed to track listing view:', error)
        }
      }
      
      trackView() // Fire and forget
    }

    const response = NextResponse.json(
      createSuccessResponse(listingWithStats)
    )

    // Cache public listings for better performance
    if (listing.status === 'active') {
      const cacheHeaders = getCacheHeaders(600, 120) // 10 min cache, 2 min revalidate
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * PUT /api/listings/[id] - Update listing
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'UPDATE_LISTING')

    // Require authentication
    const user = await requireAuth(request)

    // Validate UUID format
    const listingId = uuidSchema.parse(id)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: UpdateListingInput = updateListingSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Check if listing exists and user owns it
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('owner_id, status')
      .eq('id', listingId)
      .single()

    if (fetchError || !existingListing) {
      return handleNotFoundError('Listing')
    }

    // Check ownership
    if (!checkOwnership(user.id, existingListing.owner_id)) {
      return handleAuthorizationError('You can only update your own listings')
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // Convert location to PostGIS format if provided
    if (validatedData.location) {
      updateData.location = `POINT(${validatedData.location.lng} ${validatedData.location.lat})`
      delete updateData.location // Remove the object format
    }

    // Validate category if provided
    if (validatedData.category_id) {
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
    }

    // Update the listing
    const { data: updatedListing, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', listingId)
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update listing: ${error.message}`)
    }

    logAPIRequest(request, 'UPDATE_LISTING_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        updatedListing,
        'Listing updated successfully'
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
 * DELETE /api/listings/[id] - Delete listing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'DELETE_LISTING')

    // Require authentication
    const user = await requireAuth(request)

    // Validate UUID format
    const listingId = uuidSchema.parse(id)

    const supabase = await createServerSupabaseClient()

    // Check if listing exists and user owns it
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('owner_id, status')
      .eq('id', listingId)
      .single()

    if (fetchError || !existingListing) {
      return handleNotFoundError('Listing')
    }

    // Check ownership
    if (!checkOwnership(user.id, existingListing.owner_id)) {
      return handleAuthorizationError('You can only delete your own listings')
    }

    // Check for active bookings
    const { data: activeBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('listing_id', listingId)
      .in('status', ['confirmed', 'active'])

    if (bookingsError) {
      throw new Error(`Failed to check bookings: ${bookingsError.message}`)
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete listing with active bookings',
          details: 'Complete or cancel all active bookings before deleting'
        },
        { status: 409 }
      )
    }

    // Soft delete by setting status to archived
    const { error: updateError } = await supabase
      .from('listings')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId)

    if (updateError) {
      throw new Error(`Failed to delete listing: ${updateError.message}`)
    }

    logAPIRequest(request, 'DELETE_LISTING_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        null,
        'Listing deleted successfully'
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
 * OPTIONS /api/listings/[id] - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}