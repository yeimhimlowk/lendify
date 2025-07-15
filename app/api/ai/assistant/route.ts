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
  createAIAssistant,
  createListingAssistant,
  createSupportAssistant,
  createLenaAssistant,
  truncateConversationHistory
} from '@/lib/ai/openrouter'
import { z } from 'zod'

const assistantRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  assistantType: z.enum(['general', 'listing', 'support', 'lena']).default('lena'),
  conversationHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })).optional(),
  context: z.object({
    userType: z.enum(['renter', 'lender', 'both']).optional(),
    listingId: z.string().optional(),
    category: z.string().optional(),
    condition: z.string().optional(),
    issueType: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional()
  }).optional()
})

type AssistantRequest = z.infer<typeof assistantRequestSchema>

/**
 * POST /api/ai/assistant - AI Assistant endpoint for general help and support
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'AI_ASSISTANT')

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
    const validatedData: AssistantRequest = assistantRequestSchema.parse(body)

    const { message, assistantType, conversationHistory = [], context = {} } = validatedData

    // Truncate conversation history to prevent token limit issues
    const truncatedHistory = truncateConversationHistory(conversationHistory, 15)

    // Get user profile for additional context
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Enhanced user context
    const userContext = {
      userId: user.id,
      userEmail: user.email,
      ...userProfile,
      ...context
    }

    let aiResponse: string

    try {
      // Route to appropriate AI assistant based on type
      switch (assistantType) {
        case 'listing':
          // Get listing context if listingId is provided
          let listingContext = {}
          if (context.listingId) {
            const { data: listing } = await supabase
              .from('listings')
              .select('*')
              .eq('id', context.listingId)
              .single()
            
            if (listing) {
              listingContext = {
                category: listing.category_id,
                condition: listing.condition,
                existingTitle: listing.title,
                existingDescription: listing.description
              }
            }
          }

          aiResponse = await createListingAssistant(message, {
            ...listingContext,
            ...context
          })
          break

        case 'support':
          aiResponse = await createSupportAssistant(message, {
            userType: context.userType,
            issueType: context.issueType,
            urgency: context.urgency
          })
          break

        case 'lena':
          aiResponse = await createLenaAssistant(message, {
            conversationHistory: truncatedHistory,
            userContext
          })
          break

        default:
          aiResponse = await createAIAssistant(message, {
            conversationHistory: truncatedHistory,
            userContext
          })
      }

      // Log successful AI interaction
      await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          action: 'ai_assistant',
          assistant_type: assistantType,
          message_length: message.length,
          response_length: aiResponse.length,
          success: true,
          created_at: new Date().toISOString()
        })

      logAPIRequest(request, 'AI_ASSISTANT_SUCCESS', user.id)

      const response = NextResponse.json(
        createSuccessResponse(
          {
            message: aiResponse,
            assistantType,
            timestamp: new Date().toISOString(),
            conversationId: `${user.id}_${Date.now()}` // Simple conversation ID
          },
          'AI assistant response generated successfully'
        )
      )

      return addSecurityHeaders(response)

    } catch (aiError) {
      console.error('AI Assistant Error:', aiError)
      
      // Log failed AI interaction
      await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          action: 'ai_assistant',
          assistant_type: assistantType,
          message_length: message.length,
          success: false,
          error_message: aiError instanceof Error ? aiError.message : 'Unknown error',
          created_at: new Date().toISOString()
        })

      // Provide fallback response
      const fallbackResponse = getFallbackResponse(assistantType, message)
      
      const response = NextResponse.json(
        createSuccessResponse(
          {
            message: fallbackResponse,
            assistantType,
            timestamp: new Date().toISOString(),
            fallback: true
          },
          'Response generated with fallback system'
        )
      )

      return addSecurityHeaders(response)
    }

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
 * Generate fallback responses when AI is unavailable
 */
function getFallbackResponse(assistantType: string, _message: string): string {
  const fallbackResponses = {
    general: `I apologize, but I'm experiencing technical difficulties right now. However, I'm here to help! 

    For immediate assistance, you can:
    - Check our FAQ section
    - Contact our support team
    - Browse our help documentation
    
    Is there something specific I can help you with regarding rentals or the platform?`,
    
    listing: `I'm currently unable to access my full listing optimization tools, but I can offer some general advice:
    
    For better listings:
    - Use clear, descriptive titles
    - Include detailed descriptions with condition and features
    - Add high-quality photos from multiple angles
    - Set competitive pricing based on similar items
    
    Would you like me to help you with any specific aspect of your listing?`,
    
    support: `I'm experiencing some technical issues, but I'm still here to help! 
    
    For urgent support needs:
    - Check your account dashboard for common solutions
    - Review our help center articles
    - Contact our human support team for complex issues
    
    What specific issue are you experiencing? I'll do my best to point you in the right direction.`,

    lena: `Hi there! I'm Lena, and while I'm having some technical hiccups right now, I'm still here to help you with anything you need on Lendify! 
    
    I can assist you with:
    - Finding the perfect rental items
    - Optimizing your listings
    - Understanding our rental process
    - Answering questions about pricing and availability
    
    What can I help you with today? Even if my systems are a bit slow, I'm committed to making your Lendify experience great!`
  }

  return fallbackResponses[assistantType as keyof typeof fallbackResponses] || fallbackResponses.lena
}

/**
 * GET /api/ai/assistant - Get assistant capabilities and status
 */
async function handleGET(request: NextRequest) {
  try {
    logAPIRequest(request, 'AI_ASSISTANT_STATUS')

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's AI usage stats
    const { data: usageStats } = await supabase
      .from('ai_usage_logs')
      .select('action, success, created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    const stats = {
      totalRequests: usageStats?.length || 0,
      successfulRequests: usageStats?.filter(log => log.success).length || 0,
      failedRequests: usageStats?.filter(log => !log.success).length || 0,
      lastUsed: usageStats?.[0]?.created_at || null
    }

    const response = NextResponse.json(
      createSuccessResponse(
        {
          available: true,
          assistantTypes: ['lena', 'general', 'listing', 'support'],
          capabilities: [
            'Lena - Personalized chat assistant',
            'General platform assistance',
            'Listing optimization',
            'Customer support',
            'Recommendations and advice'
          ],
          usage24h: stats,
          status: 'operational'
        },
        'AI assistant status retrieved successfully'
      )
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/ai/assistant - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with AI middleware
export const GET = withMiddleware(apiMiddleware.ai(), handleGET)
export const POST = withMiddleware(apiMiddleware.ai(), handlePOST)