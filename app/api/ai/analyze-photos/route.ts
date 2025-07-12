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
  analyzePhotosSchema,
  type AnalyzePhotosInput 
} from '@/lib/api/schemas'

interface PhotoAnalysisResult {
  description?: string
  condition_assessment?: {
    condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
    confidence: number
    details: string
  }
  price_suggestion?: {
    suggested_price: number
    price_range: {
      min: number
      max: number
    }
    reasoning: string
  }
  extracted_tags?: string[]
  safety_concerns?: string[]
  quality_score?: number
}

/**
 * POST /api/ai/analyze-photos - Analyze photos using AI for listing optimization
 */
export async function POST(request: NextRequest) {
  try {
    logAPIRequest(request, 'AI_ANALYZE_PHOTOS')

    // Require authentication
    const user = await requireAuth(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: AnalyzePhotosInput = analyzePhotosSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Check if we have cached analysis for this listing
    let cachedAnalysis = null
    if (validatedData.listing_id) {
      const { data: cache } = await supabase
        .from('ai_analysis_cache')
        .select('*')
        .eq('listing_id', validatedData.listing_id)
        .single()

      if (cache && cache.created_at) {
        const cacheAge = Date.now() - new Date(cache.created_at).getTime()
        // Use cache if less than 24 hours old
        if (cacheAge < 24 * 60 * 60 * 1000) {
          cachedAnalysis = cache
        }
      }
    }

    let analysisResult: PhotoAnalysisResult = {}

    if (cachedAnalysis) {
      // Return cached analysis
      analysisResult = (cachedAnalysis.claude_content as any) || {}
    } else {
      // Perform new AI analysis
      try {
        // Mock AI analysis - In production, you would integrate with actual AI services
        // like OpenAI GPT-4 Vision, Google Vision AI, or Claude-3 Vision
        
        analysisResult = await performPhotoAnalysis(validatedData)

        // Cache the results if we have a listing_id
        if (validatedData.listing_id) {
          await supabase
            .from('ai_analysis_cache')
            .upsert({
              listing_id: validatedData.listing_id,
              claude_content: analysisResult,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'listing_id'
            })
        }

      } catch (aiError) {
        console.error('AI Analysis Error:', aiError)
        
        // Fallback to basic analysis
        analysisResult = {
          description: 'Unable to perform detailed AI analysis at this time. Please ensure photos are clear and well-lit.',
          quality_score: 5,
          extracted_tags: ['item', 'rental'],
          safety_concerns: []
        }
      }
    }

    logAPIRequest(request, 'AI_ANALYZE_PHOTOS_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        {
          analysis: analysisResult,
          analysis_type: validatedData.analysis_type,
          photos_analyzed: validatedData.photos.length,
          cached: !!cachedAnalysis
        },
        'Photo analysis completed successfully'
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
 * Mock AI photo analysis function
 * In production, replace with actual AI service integration
 */
async function performPhotoAnalysis(data: AnalyzePhotosInput): Promise<PhotoAnalysisResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  const result: PhotoAnalysisResult = {}

  // Mock analysis based on analysis type
  switch (data.analysis_type) {
    case 'description':
      result.description = `High-quality item captured in ${data.photos.length} photo${data.photos.length > 1 ? 's' : ''}. The images show clear details and good lighting conditions. This appears to be a well-maintained item suitable for rental.`
      break

    case 'condition':
      result.condition_assessment = {
        condition: 'good',
        confidence: 0.85,
        details: 'Item shows normal wear consistent with age and use. No major damage or defects visible. Well-maintained overall.'
      }
      break

    case 'pricing':
      result.price_suggestion = {
        suggested_price: 25,
        price_range: {
          min: 20,
          max: 35
        },
        reasoning: 'Based on item condition, category standards, and market comparison. Price reflects good value for renters while ensuring fair return for owner.'
      }
      break

    case 'tags':
      result.extracted_tags = [
        'portable',
        'indoor-use',
        'good-condition',
        'clean',
        'ready-to-use'
      ]
      break

    default:
      // Comprehensive analysis
      result.description = `Well-presented item with clear, professional-quality photos. The lighting and angles effectively showcase the item's features and condition.`
      
      result.condition_assessment = {
        condition: 'good',
        confidence: 0.82,
        details: 'Item appears well-maintained with minimal wear. Good overall condition suitable for rental.'
      }
      
      result.price_suggestion = {
        suggested_price: 28,
        price_range: {
          min: 22,
          max: 38
        },
        reasoning: 'Competitive pricing based on condition assessment and market analysis.'
      }
      
      result.extracted_tags = [
        'well-maintained',
        'ready-to-rent',
        'good-value',
        'reliable'
      ]
      
      result.quality_score = 8.5
      result.safety_concerns = []
  }

  return result
}

/**
 * OPTIONS /api/ai/analyze-photos - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}