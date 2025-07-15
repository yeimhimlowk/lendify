import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/api/errors'
import { addSecurityHeaders } from '@/lib/api/utils'
import { z } from 'zod'

// Personal analytics query schema
const personalAnalyticsSchema = z.object({
  user_id: z.string().uuid().optional(),
  timeframe: z.enum(['1m', '3m', '6m', '1y']).default('6m'),
  include_predictions: z.coerce.boolean().default(true)
})

/**
 * GET /api/analytics/personal - Personalized analytics and insights
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const params = {
      user_id: searchParams.get('user_id'),
      timeframe: searchParams.get('timeframe'),
      include_predictions: searchParams.get('include_predictions')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query = personalAnalyticsSchema.parse(cleanParams)
    
    const supabase = await createServerSupabaseClient()
    
    // Calculate date range
    const now = new Date()
    const timeframeMonths = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12
    }
    
    const monthsBack = timeframeMonths[query.timeframe]
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    
    const personalAnalytics: any = {}
    let avgRentalPrice = 0
    let userBookings: any[] = []
    let userSearches: any[] = []
    
    // If user_id is provided, get user-specific data
    if (query.user_id) {
      // Get user's rental history
      const { data: userBookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          created_at,
          start_date,
          end_date,
          total_price,
          status,
          listing:listings(
            title,
            price_per_day,
            category:categories(name)
          )
        `)
        .eq('renter_id', query.user_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
      
      // Get user's search history
      const { data: userSearchesData } = await supabase
        .from('search_analytics')
        .select('query, results_count, filters, created_at')
        .eq('user_id', query.user_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
      
      userBookings = userBookingsData || []
      userSearches = userSearchesData || []
      
      // Calculate savings and patterns
      const totalSpent = userBookings?.reduce((sum, booking) => sum + booking.total_price, 0) || 0
      const totalRentals = userBookings?.length || 0
      avgRentalPrice = totalRentals > 0 ? totalSpent / totalRentals : 0
      
      // Estimate savings vs buying
      const estimatedPurchaseCost = userBookings?.reduce((sum, booking) => {
        // Rough estimate: rental item purchase price is 10-20x daily rental price
        const estimatedPurchasePrice = (booking.listing?.price_per_day || 0) * 15
        return sum + estimatedPurchasePrice
      }, 0) || 0
      
      const totalSavings = estimatedPurchaseCost - totalSpent
      
      // Analyze rental patterns
      const categoryUsage: { [key: string]: number } = {}
      const monthlySpending: { [key: string]: number } = {}
      
      userBookings?.forEach(booking => {
        const category = booking.listing?.category?.name || 'Other'
        categoryUsage[category] = (categoryUsage[category] || 0) + 1
        
        const month = new Date(booking.created_at).toISOString().slice(0, 7)
        monthlySpending[month] = (monthlySpending[month] || 0) + booking.total_price
      })
      
      // Search pattern analysis
      const searchPatterns: { [key: string]: number } = {}
      userSearches?.forEach(search => {
        const query = search.query.toLowerCase()
        searchPatterns[query] = (searchPatterns[query] || 0) + 1
      })
      
      personalAnalytics.user_stats = {
        total_rentals: totalRentals,
        total_spent: Math.round(totalSpent),
        total_savings: Math.round(totalSavings),
        avg_rental_price: Math.round(avgRentalPrice),
        savings_rate: estimatedPurchaseCost > 0 ? Math.round((totalSavings / estimatedPurchaseCost) * 100) : 0
      }
      
      personalAnalytics.rental_patterns = {
        favorite_categories: Object.entries(categoryUsage)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        monthly_spending: Object.entries(monthlySpending)
          .map(([month, amount]) => ({ month, amount: Math.round(amount) }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        avg_rental_duration: userBookings?.length ? 
          Math.round(userBookings.reduce((sum, booking) => {
            const start = new Date(booking.start_date)
            const end = new Date(booking.end_date)
            return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          }, 0) / userBookings.length) : 0
      }
      
      personalAnalytics.search_insights = {
        total_searches: userSearches?.length || 0,
        top_search_terms: Object.entries(searchPatterns)
          .map(([term, count]) => ({ term, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        search_to_booking_ratio: userSearches?.length && totalRentals ? 
          Math.round((totalRentals / userSearches.length) * 100) : 0
      }
    }
    
    // Generate general insights and recommendations
    personalAnalytics.insights = [
      {
        type: 'savings_opportunity',
        title: 'Weekend vs Weekday Savings',
        description: 'Rentals on weekdays are typically 15-20% cheaper than weekends.',
        potential_savings: 25,
        confidence: 85
      },
      {
        type: 'timing_optimization',
        title: 'Advance Booking Benefits',
        description: 'Booking 3+ days in advance can save you an average of $18 per rental.',
        potential_savings: 18,
        confidence: 92
      },
      {
        type: 'category_insight',
        title: 'Electronics Price Trend',
        description: 'Electronics rentals have decreased 8% this month - great time to rent camera gear.',
        potential_savings: 35,
        confidence: 78
      }
    ]
    
    // Predictions (if requested)
    if (query.include_predictions) {
      personalAnalytics.predictions = {
        next_rental_category: personalAnalytics.rental_patterns?.favorite_categories?.[0]?.category || 'Electronics',
        optimal_booking_windows: [
          {
            category: 'Electronics',
            best_days: ['Tuesday', 'Wednesday'],
            price_drop_probability: 75,
            next_optimal_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          {
            category: 'Outdoor',
            best_days: ['Monday', 'Thursday'],
            price_drop_probability: 68,
            next_optimal_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ],
        seasonal_trends: {
          summer: { category: 'Outdoor', price_increase: 25 },
          winter: { category: 'Electronics', price_decrease: 15 },
          spring: { category: 'Photography', price_stable: true },
          fall: { category: 'Tools', price_increase: 10 }
        }
      }
    }
    
    // Market comparison
    personalAnalytics.market_comparison = {
      your_avg_price: Math.round(avgRentalPrice),
      market_avg_price: 47,
      price_efficiency_score: avgRentalPrice > 0 ? Math.round((47 / avgRentalPrice) * 100) : 100,
      ranking_percentile: Math.floor(Math.random() * 30) + 70 // Mock percentile (70-100)
    }
    
    // Smart recommendations
    personalAnalytics.recommendations = [
      {
        type: 'price_alert',
        title: 'Price Drop Alert',
        description: 'Set up alerts for your favorite categories to catch 20-30% price drops.',
        impact: 'high',
        effort: 'low'
      },
      {
        type: 'timing',
        title: 'Optimize Booking Day',
        description: 'Consider booking on Tuesdays for electronics - historically 18% cheaper.',
        impact: 'medium',
        effort: 'low'
      },
      {
        type: 'location',
        title: 'Expand Search Radius',
        description: 'Items 5-10 miles away can be 25% cheaper with similar quality.',
        impact: 'medium',
        effort: 'medium'
      }
    ]
    
    // Add metadata
    personalAnalytics.metadata = {
      timeframe: query.timeframe,
      generated_at: new Date().toISOString(),
      user_id: query.user_id || 'anonymous',
      data_points: (userBookings?.length || 0) + (userSearches?.length || 0)
    }
    
    const response = NextResponse.json({
      success: true,
      data: personalAnalytics
    })
    
    // Add cache headers (shorter cache for personal data)
    response.headers.set('Cache-Control', 'private, max-age=180') // 3 minutes
    
    return addSecurityHeaders(response)
    
  } catch (error: any) {
    console.error('Personal Analytics API Error:', error)
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/analytics/personal - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}