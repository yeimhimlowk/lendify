'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, Send, X, Bot, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/use-auth'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  assistantType?: string
}

interface AIAssistantProps {
  assistantType?: 'general' | 'listing' | 'support'
  context?: {
    userType?: 'renter' | 'lender' | 'both'
    listingId?: string
    category?: string
    condition?: string
    issueType?: string
    urgency?: 'low' | 'medium' | 'high'
  }
  initialMessage?: string
  className?: string
}

export default function AIAssistant({ 
  assistantType = 'general', 
  context = {}, 
  initialMessage,
  className = ''
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message based on assistant type
      const welcomeMessage = getWelcomeMessage(assistantType)
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
        assistantType
      }])

      // If there's an initial message, send it
      if (initialMessage) {
        setCurrentMessage(initialMessage)
      }
    }
  }, [isOpen, assistantType, initialMessage])

  const getWelcomeMessage = (type: string): string => {
    switch (type) {
      case 'listing':
        return "Hi! I'm here to help you optimize your rental listing. I can help with titles, descriptions, pricing suggestions, and more. What would you like to improve?"
      case 'support':
        return "Hello! I'm your customer support assistant. I can help you with account questions, booking issues, payments, and general platform guidance. How can I assist you today?"
      default:
        return "Hi there! I'm your AI assistant for Lendify. I can help with rental advice, platform questions, listing optimization, and more. What can I help you with today?"
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Prepare conversation history for API
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
          message: currentMessage,
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
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.message,
          timestamp: data.data.timestamp,
          assistantType: data.data.assistantType
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }

    } catch (error) {
      console.error('AI Assistant Error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or contact our support team if the issue persists.",
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getAssistantTitle = () => {
    switch (assistantType) {
      case 'listing':
        return 'Listing Assistant'
      case 'support':
        return 'Support Assistant'
      default:
        return 'AI Assistant'
    }
  }

  const getAssistantColor = () => {
    switch (assistantType) {
      case 'listing':
        return 'text-blue-600'
      case 'support':
        return 'text-green-600'
      default:
        return 'text-purple-600'
    }
  }

  if (!user) {
    return (
      <div className={`fixed bottom-4 right-4 ${className}`}>
        <Button
          disabled
          className="rounded-full shadow-lg"
          size="lg"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      ) : (
        <Card className="w-96 h-96 shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-sm font-medium ${getAssistantColor()}`}>
                <Bot className="h-4 w-4 inline mr-2" />
                {getAssistantTitle()}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full pb-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="flex space-x-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 min-h-[40px] max-h-[100px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                size="sm"
                className="px-3"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}