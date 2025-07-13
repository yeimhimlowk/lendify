import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/api/auth'
import { 
  handleAPIError, 
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
  uuidSchema,
  userQuerySchema
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type PublicProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified' | 'created_at'
> & {
  _stats?: {
    total_listings: number
    avg_rating: number
    review_count: number
    years_active: number
    response_rate?: number
  }
  recent_reviews?: Array<{
    id: string
    rating: number
    comment: string | null
    created_at: string | null
    reviewer: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }>
}

/**
 * GET /api/users/[id] - Get public user profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_PUBLIC_PROFILE')

    // Validate user ID format
    try {
      uuidSchema.parse(id)
    } catch (validationError) {
      return handleValidationError(validationError)
    }
    const userId = id // Use the validated ID

    // Parse query parameters
    // Filter out null values to prevent Zod coercion errors
    const queryParams = {
      include_stats: searchParams.get('include_stats'),
      include_reviews: searchParams.get('include_reviews')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null)
    )
    
    const query = userQuerySchema.parse(cleanParams)

    const supabase = await createServerSupabaseClient()

    // Get public profile data only
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, rating, verified, created_at')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return handleNotFoundError('User')
    }

    let publicProfile: PublicProfile = profile

    // Include statistics if requested
    if (query.include_stats) {
      const [listingsCount, reviewsData] = await Promise.all([
        // Active listings count
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .eq('status', 'active'),

        // Reviews for average rating and count
        supabase
          .from('reviews')
          .select('rating, created_at')
          .eq('reviewee_id', userId)
      ])

      const totalListings = listingsCount.count || 0
      const reviews = reviewsData.data || []
      const reviewCount = reviews.length

      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

      // Calculate years active
      const yearsActive = profile.created_at 
        ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)))
        : 0

      publicProfile._stats = {
        total_listings: totalListings,
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: reviewCount,
        years_active: yearsActive
      }

      // Calculate response rate if user is authenticated (for messaging purposes)
      const { user: currentUser } = await authenticateRequest(request)
      if (currentUser) {
        // Get response rate from messages (simplified calculation)
        const [sentMessages, repliedMessages] = await Promise.all([
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', userId),

          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', userId)
        ])

        const sent = sentMessages.count || 0
        const replied = repliedMessages.count || 0
        const responseRate = sent > 0 ? Math.round((replied / sent) * 100) : 100

        publicProfile._stats.response_rate = responseRate
      }
    }

    // Include recent reviews if requested
    if (query.include_reviews) {
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url)
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      publicProfile.recent_reviews = recentReviews?.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        reviewer: {
          id: review.reviewer?.id || '',
          full_name: review.reviewer?.full_name || null,
          avatar_url: review.reviewer?.avatar_url || null
        }
      })) || []
    }

    const response = NextResponse.json(
      createSuccessResponse(publicProfile)
    )

    // Cache public profiles for better performance
    const cacheHeaders = getCacheHeaders(600, 120) // 10 min cache, 2 min revalidate
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
 * OPTIONS /api/users/[id] - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}