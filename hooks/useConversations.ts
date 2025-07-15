'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/use-auth'

interface Conversation {
  id: string
  other_user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  latest_message: {
    id: string
    content: string
    created_at: string | null
    sender: {
      id: string
      full_name: string | null
    }
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

interface UseConversationsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseConversationsReturn {
  conversations: Conversation[]
  loading: boolean
  error: string | null
  refreshConversations: () => Promise<void>
  createConversation: (otherUserId: string, initialMessage: string, bookingId?: string) => Promise<void>
}

export function useConversations({ 
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute
}: UseConversationsOptions = {}): UseConversationsReturn {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/messages', {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      
      if (data.success) {
        setConversations(data.data.conversations || [])
      } else {
        throw new Error(data.error || 'Failed to fetch conversations')
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user])

  const createConversation = useCallback(async (
    otherUserId: string, 
    initialMessage: string, 
    bookingId?: string
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      setError(null)

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: otherUserId,
          content: initialMessage,
          booking_id: bookingId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create conversation')
      }

      const data = await response.json()
      
      if (data.success) {
        // Refresh conversations to include the new one
        await fetchConversations()
      } else {
        throw new Error(data.error || 'Failed to create conversation')
      }
    } catch (err) {
      console.error('Error creating conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
      throw err
    }
  }, [user, fetchConversations])

  const refreshConversations = useCallback(async () => {
    await fetchConversations()
  }, [fetchConversations])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user, fetchConversations])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(() => {
      fetchConversations()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, user, refreshInterval, fetchConversations])

  // Reset state when user changes
  useEffect(() => {
    if (!user) {
      setConversations([])
      setError(null)
    }
  }, [user])

  return {
    conversations,
    loading,
    error,
    refreshConversations,
    createConversation
  }
}