import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth'
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
  priceSuggestionSchema,
  type PriceSuggestionInput 
} from '@/lib/api/schemas'

interface PricingSuggestion {
  suggested_price: number
  confidence_score: number
  price_range: {
    min: number
    max: number
  }
  market_analysis: {
    average_price: number
    median_price: number
    price_distribution: {
      low: number
      medium: number
      high: number
    }
    comparable_count: number
  }
  factors_considered: string[]
  recommendations: string[]
  seasonal_adjustments?: {
    current_modifier: number
    peak_season: string
    low_season: string
  }
}

/**
 * POST /api/ai/price-suggestions - Get AI-powered pricing suggestions
 */
export async function POST(request: NextRequest) {
  try {
    logAPIRequest(request, 'AI_PRICE_SUGGESTIONS')

    // Require authentication
    const user = await requireAuth(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: PriceSuggestionInput = priceSuggestionSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Get category information
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('name, slug')
      .eq('id', validatedData.category_id as any)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      )
    }

    // Analyze market data
    const marketData = await analyzeMarketPricing(supabase, validatedData)
    
    // Generate AI-powered pricing suggestion
    const pricingSuggestion = await generatePricingSuggestion(
      validatedData,
      marketData,
      (category as any).name
    )

    // Log pricing analysis for analytics
    const { error: logError } = await (supabase as any)
      .from('ai_usage_logs')
      .insert({
        user_id: user.id,
        action: 'price_suggestion',
        metadata: {
          category_id: validatedData.category_id,
          condition: validatedData.condition,
          suggested_price: pricingSuggestion.suggested_price
        },
        success: true,
        created_at: new Date().toISOString()
      })
    
    if (logError) {
      console.error('Failed to log AI price suggestion:', logError)
    }

    logAPIRequest(request, 'AI_PRICE_SUGGESTIONS_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        {
          category: {
            id: validatedData.category_id,
            name: (category as any).name,
            slug: (category as any).slug
          },
          condition: validatedData.condition,
          location: validatedData.location,
          pricing: pricingSuggestion
        },
        'Pricing suggestions generated successfully'
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
 * Analyze market pricing data for the given parameters
 */
async function analyzeMarketPricing(supabase: any, data: PriceSuggestionInput) {
  // Get comparable listings in the same category
  let query = supabase
    .from('listings')
    .select('price_per_day, condition, created_at, location')
    .eq('category_id', data.category_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100)

  // Filter by condition if specified
  if (data.condition) {
    query = query.eq('condition', data.condition)
  }

  const { data: comparableListings } = await query

  // Get specific comparable listings if provided
  let specificComparables = []
  if (data.comparable_listings && data.comparable_listings.length > 0) {
    const { data: specifics } = await supabase
      .from('listings')
      .select('price_per_day, condition, title')
      .in('id', data.comparable_listings)
      .eq('status', 'active')

    specificComparables = specifics || []
  }

  return {
    comparable_listings: comparableListings || [],
    specific_comparables: specificComparables,
    total_count: (comparableListings || []).length
  }
}

/**
 * Generate AI-powered pricing suggestion
 */
async function generatePricingSuggestion(
  data: PriceSuggestionInput,
  marketData: any,
  categoryName: string
): Promise<PricingSuggestion> {
  const { comparable_listings, specific_comparables } = marketData

  // Calculate market statistics
  const prices = comparable_listings.map((listing: any) => listing.price_per_day)
  
  if (prices.length === 0) {
    // No comparable data - use fallback pricing
    return generateFallbackPricing(data, categoryName)
  }

  const averagePrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length
  const sortedPrices = [...prices].sort((a, b) => a - b)
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)]

  // Price distribution
  const priceDistribution = {
    low: sortedPrices[Math.floor(sortedPrices.length * 0.25)],
    medium: medianPrice,
    high: sortedPrices[Math.floor(sortedPrices.length * 0.75)]
  }

  // Condition multipliers
  const conditionMultipliers = {
    'new': 1.2,
    'like_new': 1.1,
    'good': 1.0,
    'fair': 0.85,
    'poor': 0.7
  }

  const conditionMultiplier = conditionMultipliers[data.condition] || 1.0

  // Calculate base suggested price
  let suggestedPrice = Math.round(averagePrice * conditionMultiplier)

  // Adjust based on specific comparables if provided
  if (specific_comparables.length > 0) {
    const specificPrices = specific_comparables.map((listing: any) => listing.price_per_day)
    const specificAverage = specificPrices.reduce((sum: number, price: number) => sum + price, 0) / specificPrices.length
    suggestedPrice = Math.round((suggestedPrice + specificAverage) / 2)
  }

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(prices.length, data)

  // Generate price range
  const priceRange = {
    min: Math.round(suggestedPrice * 0.8),
    max: Math.round(suggestedPrice * 1.25)
  }

  // Factors considered
  const factorsConsidered = [
    `${prices.length} comparable listings analyzed`,
    `Condition: ${data.condition}`,
    'Market average pricing',
    'Category-specific factors'
  ]

  if (specific_comparables.length > 0) {
    factorsConsidered.push(`${specific_comparables.length} specifically selected comparables`)
  }

  // Generate recommendations
  const recommendations = generatePricingRecommendations(
    suggestedPrice,
    averagePrice,
    data.condition,
    confidenceScore
  )

  // Seasonal adjustments (mock implementation)
  const seasonalAdjustments = getSeasonalAdjustments(categoryName)

  return {
    suggested_price: suggestedPrice,
    confidence_score: confidenceScore,
    price_range: priceRange,
    market_analysis: {
      average_price: Math.round(averagePrice),
      median_price: Math.round(medianPrice),
      price_distribution: {
        low: Math.round(priceDistribution.low),
        medium: Math.round(priceDistribution.medium),
        high: Math.round(priceDistribution.high)
      },
      comparable_count: prices.length
    },
    factors_considered: factorsConsidered,
    recommendations,
    seasonal_adjustments: seasonalAdjustments
  }
}

/**
 * Generate fallback pricing when no market data is available
 */
function generateFallbackPricing(data: PriceSuggestionInput, categoryName: string): PricingSuggestion {
  // Base pricing by category (mock data)
  const categoryBasePrices: { [key: string]: number } = {
    'tools': 15,
    'electronics': 25,
    'furniture': 20,
    'vehicles': 45,
    'sporting-goods': 18,
    'musical-instruments': 30,
    'cameras': 35,
    'kitchen': 12,
    'outdoor': 22,
    'gaming': 20
  }

  const basePrice = categoryBasePrices[categoryName.toLowerCase()] || 20

  const conditionMultipliers = {
    'new': 1.3,
    'like_new': 1.15,
    'good': 1.0,
    'fair': 0.8,
    'poor': 0.6
  }

  const suggestedPrice = Math.round(basePrice * (conditionMultipliers[data.condition] || 1.0))

  return {
    suggested_price: suggestedPrice,
    confidence_score: 3, // Low confidence due to lack of data
    price_range: {
      min: Math.round(suggestedPrice * 0.7),
      max: Math.round(suggestedPrice * 1.4)
    },
    market_analysis: {
      average_price: basePrice,
      median_price: basePrice,
      price_distribution: {
        low: Math.round(basePrice * 0.7),
        medium: basePrice,
        high: Math.round(basePrice * 1.3)
      },
      comparable_count: 0
    },
    factors_considered: [
      'Category baseline pricing',
      `Condition: ${data.condition}`,
      'Industry standard multipliers'
    ],
    recommendations: [
      'Limited market data available - consider researching competitor pricing',
      'Start with suggested price and adjust based on demand',
      'Monitor booking requests to optimize pricing'
    ]
  }
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidenceScore(comparableCount: number, data: PriceSuggestionInput): number {
  let score = 0

  // Base score from comparable count
  if (comparableCount >= 20) score += 4
  else if (comparableCount >= 10) score += 3
  else if (comparableCount >= 5) score += 2
  else if (comparableCount >= 1) score += 1

  // Bonus for having photos (better condition assessment)
  if (data.photos && data.photos.length > 0) score += 1

  // Bonus for having description
  if (data.description && data.description.length > 50) score += 1

  // Bonus for specific comparables
  if (data.comparable_listings && data.comparable_listings.length > 0) score += 1

  return Math.min(10, Math.max(1, score))
}

/**
 * Generate pricing recommendations based on analysis
 */
function generatePricingRecommendations(
  suggestedPrice: number,
  marketAverage: number,
  condition: string,
  confidence: number
): string[] {
  const recommendations = []

  if (suggestedPrice > marketAverage * 1.2) {
    recommendations.push('Price is above market average - consider highlighting unique features to justify premium pricing')
  } else if (suggestedPrice < marketAverage * 0.8) {
    recommendations.push('Price is below market average - you may be able to increase pricing for better returns')
  } else {
    recommendations.push('Price is well-aligned with market average')
  }

  if (condition === 'new' || condition === 'like_new') {
    recommendations.push('Premium condition allows for higher pricing - emphasize quality in your listing')
  } else if (condition === 'fair' || condition === 'poor') {
    recommendations.push('Competitive pricing recommended due to condition - highlight value proposition')
  }

  if (confidence < 5) {
    recommendations.push('Limited market data - monitor initial responses and adjust pricing accordingly')
  }

  recommendations.push('Consider offering weekly/monthly discounts to attract longer rentals')

  return recommendations
}

/**
 * Get seasonal pricing adjustments (mock implementation)
 */
function getSeasonalAdjustments(categoryName: string) {
  const currentMonth = new Date().getMonth()
  
  // Seasonal categories (simplified)
  const seasonalCategories: { [key: string]: any } = {
    'outdoor': {
      peak_months: [4, 5, 6, 7, 8], // May-Sep
      current_modifier: [4, 5, 6, 7, 8].includes(currentMonth) ? 1.15 : 0.9,
      peak_season: 'Summer (May-September)',
      low_season: 'Winter (October-April)'
    },
    'sporting-goods': {
      peak_months: [4, 5, 6, 7, 8],
      current_modifier: [4, 5, 6, 7, 8].includes(currentMonth) ? 1.1 : 0.95,
      peak_season: 'Spring/Summer',
      low_season: 'Fall/Winter'
    }
  }

  return seasonalCategories[categoryName.toLowerCase()] || {
    current_modifier: 1.0,
    peak_season: 'Year-round demand',
    low_season: 'Consistent pricing'
  }
}

/**
 * OPTIONS /api/ai/price-suggestions - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}