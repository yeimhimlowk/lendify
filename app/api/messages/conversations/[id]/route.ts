import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { authenticateRequest } from '@/lib/api/auth'
import { 
  handleAPIError, 
  handleValidationError
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { messageQuerySchema } from '@/lib/api/schemas'

/**
 * GET /api/messages/conversations/[id] - Get messages for a specific conversation
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationWithUserId } = await params
    logAPIRequest(request, 'GET_CONVERSATION_MESSAGES')

    // Authenticate the request
    const user = await authenticateRequest(request)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      booking_id: searchParams.get('booking_id'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null)
    )
    
    const query = messageQuerySchema.parse(cleanParams)

    const supabase = await createServerSupabaseClient()

    // Verify the other user exists
    const { data: otherUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', conversationWithUserId)
      .single()

    if (userError || !otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Build the query for messages between the two users
    let dbQuery = supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        booking_id,
        is_ai_response,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
        recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url),
        booking:bookings(id, start_date, end_date, listing:listings(title))
      `, { count: 'exact' })
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${conversationWithUserId}),and(sender_id.eq.${conversationWithUserId},recipient_id.eq.${user.id})`)

    // Apply booking filter if provided
    if (query.booking_id) {
      dbQuery = dbQuery.eq('booking_id', query.booking_id)
    }

    // Apply sorting
    dbQuery = dbQuery.order(query.sortBy, { ascending: query.sortOrder === 'asc' })

    // Apply pagination
    const from = (query.page - 1) * query.limit
    const to = from + query.limit - 1
    dbQuery = dbQuery.range(from, to)

    const { data: messages, error, count } = await dbQuery

    if (error) {
      throw error
    }

    // Get conversation metadata
    const conversationData = {
      id: `${user.id < conversationWithUserId ? user.id : conversationWithUserId}-${user.id > conversationWithUserId ? user.id : conversationWithUserId}`,
      other_user: otherUser,
      message_count: count || 0,
      messages: messages || []
    }

    const response = NextResponse.json(
      createSuccessResponse({
        conversation: conversationData,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / query.limit)
        }
      })
    )

    // Cache messages for better performance
    const cacheHeaders = getCacheHeaders(60, 30) // 1 min cache, 30 sec revalidate
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
 * OPTIONS /api/messages/conversations/[id] - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.authenticated(), handleGET)