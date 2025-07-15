'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/use-auth'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  assistantType?: string
}

export interface AIContext {
  userType?: 'renter' | 'lender' | 'both'
  listingId?: string
  category?: string
  condition?: string
  issueType?: string
  urgency?: 'low' | 'medium' | 'high'
}

export interface UseAIAssistantOptions {
  assistantType?: 'general' | 'listing' | 'support'
  context?: AIContext
  onMessage?: (message: AIMessage) => void
  onError?: (error: Error) => void
}

export function useAIAssistant(options: UseAIAssistantOptions = {}) {
  const { assistantType = 'general', context = {}, onMessage, onError } = options
  const { user } = useAuth()
  
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return null

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsTyping(true)
    setError(null)

    if (onMessage) {
      onMessage(userMessage)
    }

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          assistantType,
          conversationHistory,
          context
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      if (data.success) {
        const assistantMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.message,
          timestamp: data.data.timestamp,
          assistantType: data.data.assistantType
        }

        setMessages(prev => [...prev, assistantMessage])
        
        if (onMessage) {
          onMessage(assistantMessage)
        }

        return assistantMessage
      } else {
        throw new Error(data.error || 'Failed to get response')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }

      const fallbackMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, fallbackMessage])
      return fallbackMessage
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }, [user, assistantType, context, messages, onMessage, onError])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const getStatus = useCallback(async () => {
    if (!user) return null

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get AI status')
      }

      const data = await response.json()
      return data.success ? data.data : null
    } catch (err) {
      console.error('Failed to get AI status:', err)
      return null
    }
  }, [user])

  const generateContent = useCallback(async (
    type: 'title' | 'description' | 'tags',
    contentContext?: any
  ) => {
    if (!user) return null

    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          context: { ...context, ...contentContext },
          tone: 'professional',
          length: 'medium'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      return data.success ? data.data : null
    } catch (err) {
      console.error('Failed to generate content:', err)
      return null
    }
  }, [user, context])

  const analyzePhotos = useCallback(async (
    photos: string[],
    analysisType: 'description' | 'condition' | 'pricing' | 'tags' | 'comprehensive' = 'comprehensive'
  ) => {
    if (!user) return null

    try {
      const response = await fetch('/api/ai/analyze-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photos,
          analysis_type: analysisType,
          listing_id: context.listingId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze photos')
      }

      const data = await response.json()
      return data.success ? data.data : null
    } catch (err) {
      console.error('Failed to analyze photos:', err)
      return null
    }
  }, [user, context])

  return {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    clearMessages,
    getStatus,
    generateContent,
    analyzePhotos,
    isReady: !!user
  }
}