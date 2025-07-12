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
export async function POST(request: NextRequest) {
  try {
    logAPIRequest(request, 'AI_GENERATE_CONTENT')

    // Require authentication
    const user = await requireAuth(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: GenerateContentInput = generateContentSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Generate content based on type
    let result: ContentGenerationResult

    try {
      result = await generateAIContent(validatedData)
      
      // Log successful generation for analytics
      await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          action: 'generate_content',
          content_type: validatedData.type,
          success: true,
          created_at: new Date().toISOString()
        })
        .catch(console.error) // Don't fail request if logging fails

    } catch (aiError) {
      console.error('AI Content Generation Error:', aiError)
      
      // Fallback to template-based content
      result = generateFallbackContent(validatedData)
      
      // Log failed generation
      await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          action: 'generate_content',
          content_type: validatedData.type,
          success: false,
          error_message: aiError instanceof Error ? aiError.message : 'Unknown error',
          created_at: new Date().toISOString()
        })
        .catch(console.error)
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
 * Mock AI content generation function
 * In production, replace with actual AI service integration (OpenAI, Claude, etc.)
 */
async function generateAIContent(data: GenerateContentInput): Promise<ContentGenerationResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const { type, context, tone, length } = data

  let content = ''
  let alternatives: string[] = []
  let suggestions: string[] = []

  switch (type) {
    case 'title':
      content = generateTitle(context, tone)
      alternatives = [
        generateTitle(context, 'professional'),
        generateTitle(context, 'casual'),
        generateTitle(context, 'friendly')
      ].filter(alt => alt !== content)
      break

    case 'description':
      content = generateDescription(context, tone, length)
      suggestions = [
        'Consider adding specific dimensions or specifications',
        'Mention any included accessories or extras',
        'Highlight unique features that set this item apart',
        'Include care instructions or usage guidelines'
      ]
      break

    case 'tags':
      const tagList = generateTags(context)
      content = tagList.join(', ')
      suggestions = [
        'Use specific brand names if applicable',
        'Include location-based tags for better discovery',
        'Add seasonal or event-related tags when relevant'
      ]
      break
  }

  return {
    generated_content: content,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
    word_count: content.split(/\s+/).length,
    tone_score: calculateToneScore(content, tone),
    suggestions
  }
}

/**
 * Generate fallback content using templates
 */
function generateFallbackContent(data: GenerateContentInput): ContentGenerationResult {
  const { type, context, tone } = data

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
function generateTitle(context: any, tone: string): string {
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
function generateDescription(context: any, tone: string, length: string): string {
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
function generateTags(context: any): string[] {
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