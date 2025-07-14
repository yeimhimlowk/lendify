import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { 
  handleAPIError, 
  handleAuthError, 
  handleValidationError 
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  updateProfileSchema,
  userQuerySchema,
  type UpdateProfileInput 
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileWithStats = Profile & {
  _stats?: {
    total_listings: number
    active_listings: number
    total_bookings: number
    completed_bookings: number
    avg_rating: number
    review_count: number
  }
}

/**
 * GET /api/users/profile - Get current user's profile
 */
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_USER_PROFILE')

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    // Filter out null values to prevent Zod coercion errors
    const params = {
      include_stats: searchParams.get('include_stats'),
      include_reviews: searchParams.get('include_reviews')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query = userQuerySchema.parse(cleanParams)

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      throw new Error('Profile not found')
    }

    let profileWithStats: ProfileWithStats = profile

    // Include statistics if requested
    if (query.include_stats) {
      const [listingsStats, bookingsStats, reviewStats] = await Promise.all([
        // Listings statistics
        Promise.all([
          supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id),
          supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id)
            .eq('status', 'active')
        ]),

        // Bookings statistics
        Promise.all([
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('renter_id', user.id),
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('renter_id', user.id)
            .eq('status', 'completed')
        ]),

        // Review statistics
        Promise.all([
          supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', user.id),
          supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewee_id', user.id)
        ])
      ])

      const totalListings = listingsStats[0].count || 0
      const activeListings = listingsStats[1].count || 0
      const totalBookings = bookingsStats[0].count || 0
      const completedBookings = bookingsStats[1].count || 0
      const reviews = reviewStats[0].data || []
      const reviewCount = reviewStats[1].count || 0

      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

      profileWithStats._stats = {
        total_listings: totalListings,
        active_listings: activeListings,
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        review_count: reviewCount
      }
    }

    const response = NextResponse.json(
      createSuccessResponse(profileWithStats)
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
 * PUT /api/users/profile - Update current user's profile
 */
async function handlePUT(request: NextRequest) {
  try {
    logAPIRequest(request, 'UPDATE_USER_PROFILE')

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
    const validatedData: UpdateProfileInput = updateProfileSchema.parse(body)

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

    // Update the profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    // Also update the auth user metadata if full_name changed
    if (validatedData.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: validatedData.full_name }
      })
    }

    logAPIRequest(request, 'UPDATE_USER_PROFILE_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        updatedProfile,
        'Profile updated successfully'
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
 * OPTIONS /api/users/profile - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.authenticated(), handleGET)
export const PUT = withMiddleware(apiMiddleware.authenticated(), handlePUT)