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
  generateContentSchema,
  type GenerateContentInput 
} from '@/lib/api/schemas'

interface ContentGenerationResult {
  generated_content: string
  alternatives?: string[]
  word_count?: number
  tone_score?: number
  suggestions?: string[]
}

/**
 * POST /api/ai/generate-content - Generate AI-powered content for listings
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'AI_GENERATE_CONTENT')

    // Require authentication
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
    const validatedData: GenerateContentInput = generateContentSchema.parse(body)

    // Generate content based on type
    let result: ContentGenerationResult

    try {
      result = await generateAIContent(validatedData)
      
      // Log successful generation for analytics
      const { error: logError } = await (supabase as any)
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          action: 'generate_content',
          content_type: validatedData.type,
          success: true,
          created_at: new Date().toISOString()
        })
      
      if (logError) {
        console.error('Failed to log AI usage:', logError)
      }

    } catch (aiError) {
      console.error('AI Content Generation Error:', aiError)
      
      // Fallback to template-based content
      result = generateFallbackContent(validatedData)
      
      // Log failed generation
      const { error: logError } = await (supabase as any)
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          action: 'generate_content',
          content_type: validatedData.type,
          success: false,
          error_message: aiError instanceof Error ? aiError.message : 'Unknown error',
          created_at: new Date().toISOString()
        })
      
      if (logError) {
        console.error('Failed to log AI usage error:', logError)
      }
    }

    logAPIRequest(request, 'AI_GENERATE_CONTENT_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        {
          type: validatedData.type,
          tone: validatedData.tone,
          length: validatedData.length,
          ...result
        },
        'Content generated successfully'
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
 * AI content generation function using OpenRouter
 */
async function generateAIContent(data: GenerateContentInput): Promise<ContentGenerationResult> {
  const { type, context, tone, length } = data

  try {
    // Import OpenRouter functions
    const { createAIAssistant } = await import('@/lib/ai/openrouter')

    // Create appropriate prompt based on content type
    let prompt = ''
    
    switch (type) {
      case 'title':
        prompt = `Create a compelling rental listing title for a ${context.category || 'item'} in ${context.condition || 'good'} condition. 
        Tone: ${tone}. Make it engaging and clickable while being accurate.
        
        Context: ${JSON.stringify(context)}
        
        Return only the title, no explanations.`
        break

      case 'description':
        prompt = `Write a ${length} rental listing description for a ${context.category || 'item'} in ${context.condition || 'good'} condition.
        Tone: ${tone}. Include relevant details that would help renters make a decision.
        
        Context: ${JSON.stringify(context)}
        
        Make it compelling but honest. Focus on benefits and practical information.`
        break

      case 'tags':
        prompt = `Generate relevant tags for a rental listing of a ${context.category || 'item'} in ${context.condition || 'good'} condition.
        
        Context: ${JSON.stringify(context)}
        
        Return 5-8 tags separated by commas. Focus on searchable keywords that renters might use.`
        break

      default:
        throw new Error(`Unsupported content type: ${type}`)
    }

    const aiResponse = await createAIAssistant(prompt, {
      systemPrompt: 'You are an expert copywriter specializing in rental marketplace listings. Create compelling, accurate content that helps items get rented quickly.'
    })

    // Parse response based on type
    let content = aiResponse.trim()
    let alternatives: string[] = []
    let suggestions: string[] = []

    // Generate alternatives for titles
    if (type === 'title' && content) {
      try {
        const altPrompt = `Create 2 alternative titles for the same rental listing with different approaches (more casual, more professional). 
        Original: "${content}"
        Context: ${JSON.stringify(context)}
        
        Return only the alternatives, one per line.`
        
        const altResponse = await createAIAssistant(altPrompt)
        alternatives = altResponse.split('\n').filter(line => line.trim()).slice(0, 2)
      } catch (error) {
        console.error('Error generating alternatives:', error)
      }
    }

    // Generate suggestions for descriptions
    if (type === 'description') {
      suggestions = [
        'Consider adding specific dimensions or specifications',
        'Mention any included accessories or extras',
        'Highlight unique features that set this item apart',
        'Include care instructions or usage guidelines'
      ]
    }

    return {
      generated_content: content,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      word_count: content.split(/\s+/).length,
      tone_score: calculateToneScore(content, tone),
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }

  } catch (error) {
    console.error('AI Content Generation Error:', error)
    
    // Fallback to template-based generation
    return generateFallbackContent(data)
  }
}

/**
 * Generate fallback content using templates
 */
function generateFallbackContent(data: GenerateContentInput): ContentGenerationResult {
  const { type, context } = data

  let content = ''

  switch (type) {
    case 'title':
      content = context.category 
        ? `Premium ${context.category} Available for Rent`
        : 'Quality Item Available for Rent'
      break

    case 'description':
      content = `This well-maintained item is perfect for your rental needs. ${
        context.condition ? `In ${context.condition} condition. ` : ''
      }${
        context.price_range ? `Competitively priced within the ${context.price_range} range. ` : ''
      }Contact for more details and availability.`
      break

    case 'tags':
      content = ['rental', 'available', 'quality', context.condition || 'good-condition'].join(', ')
      break
  }

  return {
    generated_content: content,
    word_count: content.split(/\s+/).length,
    tone_score: 7,
    suggestions: ['Consider providing more specific details for better AI generation']
  }
}

/**
 * Generate title based on context and tone
 */
function _generateTitle(context: any, tone: string): string {
  const category = context.category || 'Item'
  const condition = context.condition || 'good'
  
  const templates = {
    professional: [
      `Professional-Grade ${category} for Rent`,
      `Premium ${category} Available`,
      `High-Quality ${category} Rental`
    ],
    casual: [
      `Great ${category} for rent!`,
      `Awesome ${category} available`,
      `Perfect ${category} ready to go`
    ],
    friendly: [
      `Lovely ${category} looking for a new home`,
      `Amazing ${category} ready for your next adventure`,
      `Beautiful ${category} waiting for you`
    ],
    technical: [
      `${category} - ${condition} condition, fully functional`,
      `Certified ${category} available for rental`,
      `Professional ${category} with complete specifications`
    ]
  }

  const toneTemplates = templates[tone as keyof typeof templates] || templates.professional
  return toneTemplates[Math.floor(Math.random() * toneTemplates.length)]
}

/**
 * Generate description based on context, tone, and length
 */
function _generateDescription(context: any, tone: string, length: string): string {
  const category = context.category || 'item'
  const condition = context.condition || 'good'
  
  let base = ''
  
  switch (tone) {
    case 'professional':
      base = `This ${condition} condition ${category} offers reliable performance for your rental needs.`
      break
    case 'casual':
      base = `Hey! This ${category} is in ${condition} shape and ready to go.`
      break
    case 'friendly':
      base = `I'm excited to share this wonderful ${category} with you! It's in ${condition} condition.`
      break
    case 'technical':
      base = `Technical specifications: ${category} unit in ${condition} operational status.`
      break
    default:
      base = `This well-maintained ${category} is available for rent and in ${condition} condition.`
  }

  if (length === 'short') {
    return base + ' Contact for availability and pricing.'
  } else if (length === 'long') {
    return base + ` Perfect for both personal and professional use, this ${category} has been carefully maintained and is ready for immediate rental. Whether you need it for a special event, project, or everyday use, you can count on its reliability. All necessary accessories and instructions are included. Flexible rental terms available to suit your schedule.`
  } else {
    return base + ` Ideal for various applications and maintained to high standards. Includes everything you need for immediate use. Flexible rental periods available.`
  }
}

/**
 * Generate relevant tags based on context
 */
function _generateTags(context: any): string[] {
  const baseTags = ['rental', 'available']
  
  if (context.category) {
    baseTags.push(context.category.toLowerCase().replace(/\s+/g, '-'))
  }
  
  if (context.condition) {
    baseTags.push(`${context.condition}-condition`)
  }
  
  // Add some general useful tags
  baseTags.push('reliable', 'clean', 'ready-to-use', 'flexible-terms')
  
  return baseTags.slice(0, 8) // Limit to 8 tags
}

/**
 * Calculate tone score (1-10) based on content and desired tone
 */
function calculateToneScore(content: string, desiredTone: string): number {
  // Simple scoring based on tone indicators
  const toneIndicators = {
    professional: ['professional', 'premium', 'quality', 'reliable'],
    casual: ['great', 'awesome', 'cool', 'nice'],
    friendly: ['lovely', 'amazing', 'wonderful', 'excited'],
    technical: ['specifications', 'certified', 'operational', 'technical']
  }
  
  const indicators = toneIndicators[desiredTone as keyof typeof toneIndicators] || []
  const lowerContent = content.toLowerCase()
  
  const matches = indicators.filter(indicator => lowerContent.includes(indicator)).length
  return Math.min(10, 6 + (matches * 1.5)) // Base score of 6, up to 10
}

/**
 * OPTIONS /api/ai/generate-content - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const POST = withMiddleware(apiMiddleware.ai(), handlePOST)