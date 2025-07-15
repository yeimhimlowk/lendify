'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/use-auth'

interface Message {
  id: string
  content: string
  created_at: string | null
  booking_id: string | null
  is_ai_response: boolean | null
  sender: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  recipient: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  booking?: {
    id: string
    start_date: string
    end_date: string
    listing?: {
      title: string
    }
  }
}

interface UseMessagesOptions {
  conversationWith?: string
  bookingId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseMessagesReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  sendMessage: (content: string, bookingId?: string) => Promise<void>
  refreshMessages: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  sendingMessage: boolean
}

export function useMessages({ 
  conversationWith, 
  bookingId,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: UseMessagesOptions = {}): UseMessagesReturn {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState(1)

  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!user || !conversationWith) return

    try {
      if (!append) {
        setLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        conversation_with: conversationWith,
        page: pageNum.toString(),
        limit: '50',
        sortOrder: 'asc' // Chronological order for messages
      })

      if (bookingId) {
        params.append('booking_id', bookingId)
      }

      const response = await fetch(`/api/messages?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      
      if (data.success) {
        const newMessages = data.data.messages || []
        
        if (append) {
          setMessages(prev => [...prev, ...newMessages])
        } else {
          setMessages(newMessages)
        }

        setTotalPages(data.data.pagination?.totalPages || 1)
        setHasMore(pageNum < (data.data.pagination?.totalPages || 1))
      } else {
        throw new Error(data.error || 'Failed to fetch messages')
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, conversationWith, bookingId])

  const sendMessage = useCallback(async (content: string, messageBookingId?: string) => {
    if (!user || !conversationWith) {
      throw new Error('User not authenticated or no conversation selected')
    }

    setSendingMessage(true)
    setError(null)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: conversationWith,
          content,
          booking_id: messageBookingId || bookingId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      
      if (data.success) {
        // Add the new message to the current messages
        const newMessage = data.data
        setMessages(prev => [...prev, newMessage])
      } else {
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err
    } finally {
      setSendingMessage(false)
    }
  }, [user, conversationWith, bookingId])

  const refreshMessages = useCallback(async () => {
    await fetchMessages(1, false)
    setPage(1)
  }, [fetchMessages])

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      await fetchMessages(nextPage, true)
      setPage(nextPage)
    }
  }, [hasMore, loading, page, fetchMessages])

  // Initial fetch
  useEffect(() => {
    if (conversationWith) {
      fetchMessages(1, false)
      setPage(1)
    }
  }, [conversationWith, fetchMessages])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !conversationWith) return

    const interval = setInterval(() => {
      refreshMessages()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, conversationWith, refreshInterval, refreshMessages])

  // Reset state when conversation changes
  useEffect(() => {
    setMessages([])
    setPage(1)
    setHasMore(true)
    setError(null)
  }, [conversationWith])

  return {
    messages,
    loading,
    error,
    sendMessage,
    refreshMessages,
    hasMore,
    loadMore,
    sendingMessage
  }
}