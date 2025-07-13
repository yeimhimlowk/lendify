import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'

/**
 * GET /api/listings/featured - Get featured listings
 * 
 * Featured listings are determined by:
 * 1. High rating (>= 4.5)
 * 2. High booking count
 * 3. Recent activity
 * 4. Owner verification status
 * 5. Complete listing information (photos, description, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_FEATURED_LISTINGS')

    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50)
    const category = searchParams.get('category')

    const supabase = await createServerSupabaseClient()

    // Build featured listings query with simpler criteria to avoid database errors
    let query = supabase
      .from('listings')
      .select(`
        *,
        category:categories(*),
        owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
      `)
      .eq('status', 'active')
      .not('photos', 'is', null)
      .not('description', 'is', null)

    // Filter by category if specified
    if (category) {
      if (category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        query = query.eq('category_id', category)
      } else {
        query = query.eq('categories.slug', category)
      }
    }

    // Get listings with quality criteria
    const { data: listings, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit * 3) // Get more to filter and rank

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!listings) {
      return NextResponse.json(createSuccessResponse([]))
    }

    // Calculate featured score for each listing
    const listingsWithScores = await Promise.all(
      listings.map(async (listing) => {
        // Get additional stats for scoring
        const [bookingStats, analyticsStats] = await Promise.all([
          // Get booking statistics
          supabase
            .from('bookings')
            .select('id, status')
            .eq('listing_id', listing.id)
            .in('status', ['completed', 'active', 'confirmed']),
          
          // Get analytics data
          supabase
            .from('listing_analytics')
            .select('views, clicks, bookings')
            .eq('listing_id', listing.id)
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
        ])

        const bookingCount = bookingStats.data?.length || 0
        const totalViews = analyticsStats.data?.reduce((sum, day) => sum + (day.views || 0), 0) || 0
        const totalClicks = analyticsStats.data?.reduce((sum, day) => sum + (day.clicks || 0), 0) || 0

        // Calculate featured score (0-100)
        let score = 0

        // Owner verification bonus (20 points)
        if (listing.owner?.verified) {
          score += 20
        }

        // Owner rating bonus (15 points max)
        if (listing.owner?.rating) {
          score += (listing.owner.rating / 5) * 15
        }

        // Booking activity bonus (25 points max)
        score += Math.min(bookingCount * 5, 25)

        // View activity bonus (15 points max) 
        score += Math.min(totalViews / 100, 15)

        // Click through rate bonus (10 points max)
        const ctr = totalViews > 0 ? totalClicks / totalViews : 0
        score += ctr * 10

        // Photo quality bonus (10 points max)
        const photoCount = listing.photos?.length || 0
        score += Math.min(photoCount * 2, 10)

        // Description quality bonus (10 points max)
        const descLength = listing.description?.length || 0
        score += Math.min(descLength / 100, 10)

        // Recency bonus (5 points max)
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(listing.created_at || '').getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceCreated <= 30) {
          score += Math.max(5 - (daysSinceCreated / 30) * 5, 0)
        }

        return {
          ...listing,
          _stats: {
            bookings_count: bookingCount,
            avg_rating: listing.owner?.rating || 0,
            view_count: totalViews
          },
          _featured_score: Math.round(score)
        }
      })
    )

    // Sort by featured score and take top results
    const featuredListings = listingsWithScores
      .sort((a, b) => b._featured_score - a._featured_score)
      .slice(0, limit)
      .map(({ _featured_score, ...listing }) => listing) // Remove internal score

    const response = NextResponse.json(
      createSuccessResponse(featuredListings, `Found ${featuredListings.length} featured listings`)
    )

    // Cache featured listings for better performance
    const cacheHeaders = getCacheHeaders(600, 120) // 10 min cache, 2 min revalidate
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return addSecurityHeaders(response)

  } catch (error: any) {
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/listings/featured - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}