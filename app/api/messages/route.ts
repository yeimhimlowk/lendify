import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { authenticateRequest } from '@/lib/api/auth'
import { 
  handleAPIError, 
  handleValidationError,
  handleAuthorizationError
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  createMessageSchema,
  messageQuerySchema
} from '@/lib/api/schemas'

/**
 * POST /api/messages - Send a new message
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'SEND_MESSAGE')

    // Authenticate the request
    const user = await authenticateRequest(request)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createMessageSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Verify recipient exists and is not the sender
    if (validatedData.recipient_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      )
    }

    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', validatedData.recipient_id)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // If booking_id is provided, verify the user is part of the booking
    if (validatedData.booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, renter_id, owner_id')
        .eq('id', validatedData.booking_id)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }

      // Check if user is part of the booking
      const isRenter = booking.renter_id === user.id
      const isOwner = booking.owner_id === user.id
      
      if (!isRenter && !isOwner) {
        return handleAuthorizationError('You can only send messages for bookings you are involved in')
      }

      // Verify recipient is the other party in the booking
      const expectedRecipientId = isRenter ? booking.owner_id : booking.renter_id
      if (validatedData.recipient_id !== expectedRecipientId) {
        return NextResponse.json(
          { error: 'Invalid recipient for this booking' },
          { status: 400 }
        )
      }
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: validatedData.recipient_id,
        content: validatedData.content,
        booking_id: validatedData.booking_id || null
      })
      .select(`
        id,
        content,
        created_at,
        booking_id,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
        recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url),
        booking:bookings(id, start_date, end_date, listing:listings(title))
      `)
      .single()

    if (messageError) {
      throw messageError
    }

    const response = NextResponse.json(
      createSuccessResponse(message, 'Message sent successfully'),
      { status: 201 }
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * GET /api/messages - Get conversations or messages for the authenticated user
 */
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_MESSAGES')

    // Authenticate the request
    const user = await authenticateRequest(request)

    // Parse query parameters
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      conversation_with: searchParams.get('conversation_with'),
      booking_id: searchParams.get('booking_id'),
      unread_only: searchParams.get('unread_only'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null)
    )
    
    const query = messageQuerySchema.parse(cleanParams)

    const supabase = await createServerSupabaseClient()

    if (query.conversation_with) {
      // Get messages between two users
      let dbQuery = supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          booking_id,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url),
          booking:bookings(id, start_date, end_date, listing:listings(title))
        `, { count: 'exact' })
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${query.conversation_with}),and(sender_id.eq.${query.conversation_with},recipient_id.eq.${user.id})`)

      if (query.booking_id) {
        dbQuery = dbQuery.eq('booking_id', query.booking_id)
      }

      // Apply sorting and pagination
      dbQuery = dbQuery.order(query.sortBy, { ascending: query.sortOrder === 'asc' })
      
      const from = (query.page - 1) * query.limit
      const to = from + query.limit - 1
      dbQuery = dbQuery.range(from, to)

      const { data: messages, error, count } = await dbQuery

      if (error) {
        throw error
      }

      const response = NextResponse.json(
        createSuccessResponse({
          messages: messages || [],
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

    } else {
      // Get conversations (latest message from each conversation)
      const { data: conversations, error } = await supabase.rpc('get_user_conversations', {
        user_id: user.id
      })

      if (error) {
        // Fallback to manual query if RPC doesn't exist
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            booking_id,
            sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
            recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url),
            booking:bookings(id, start_date, end_date, listing:listings(title))
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (messagesError) {
          throw messagesError
        }

        // Group messages into conversations
        const conversationsMap = new Map()
        
        messages?.forEach(message => {
          const otherUserId = message.sender.id === user.id 
            ? message.recipient.id 
            : message.sender.id
          
          const key = `${Math.min(user.id, otherUserId)}-${Math.max(user.id, otherUserId)}`
          
          if (!conversationsMap.has(key)) {
            conversationsMap.set(key, {
              id: key,
              other_user: message.sender.id === user.id ? message.recipient : message.sender,
              latest_message: message,
              booking: message.booking
            })
          }
        })

        const conversationsList = Array.from(conversationsMap.values())
        
        return NextResponse.json(
          createSuccessResponse({
            conversations: conversationsList,
            total: conversationsList.length
          })
        )
      }

      return NextResponse.json(
        createSuccessResponse({
          conversations: conversations || [],
          total: conversations?.length || 0
        })
      )
    }

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/messages - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const POST = withMiddleware(apiMiddleware.authenticated(), handlePOST)
export const GET = withMiddleware(apiMiddleware.authenticated(), handleGET)