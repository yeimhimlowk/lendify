'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, Send, X, Bot, User, Loader2, Heart, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth/use-auth'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  assistantType?: string
}

interface LenaChatProps {
  initialMessage?: string
  className?: string
  onClose?: () => void
}

export default function LenaChat({ 
  initialMessage,
  className = '',
  onClose
}: LenaChatProps) {
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
      // Add Lena's welcome message
      const welcomeMessage = `Hi there! I'm Lena, your personal assistant here at Lendify! 💜

I'm here to help you with anything you need - whether you're looking to rent something special, want to list an item, or just have questions about how our platform works.

What can I help you with today?`

      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
        assistantType: 'lena'
      }])

      // If there's an initial message, send it
      if (initialMessage) {
        setCurrentMessage(initialMessage)
      }
    }
  }, [isOpen, initialMessage])

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = currentMessage
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
          message: messageToSend,
          assistantType: 'lena',
          conversationHistory,
          context: {}
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
      console.error('Lena Chat Error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! I'm having a little trouble right now, but I'm still here to help! Could you try asking me again? If this keeps happening, our support team is always ready to assist you! 💜",
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

  // Handle Escape key to close chat
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  if (!user) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          disabled
          className="rounded-full w-16 h-16 shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 opacity-50 cursor-not-allowed flex items-center justify-center"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Chat Button */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {!isOpen ? (
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 flex items-center justify-center animate-pulse"
            size="lg"
          >
            <MessageCircle className="h-6 w-6" />
            <Sparkles className="h-4 w-4 ml-1" />
          </Button>
        ) : null}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <>          
          {/* Chat Window Container */}
          <div className="fixed bottom-20 right-6 z-40 pointer-events-none">
            <Card className="w-[380px] h-[500px] shadow-2xl border-2 border-purple-200 bg-white rounded-2xl overflow-hidden pointer-events-auto transform transition-all duration-300 animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-purple-700 flex items-center">
                <div className="relative mr-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <Heart className="h-3 w-3 absolute -top-1 -right-1 text-pink-500 animate-pulse" />
                </div>
                Lena - Your AI Assistant
                <span className="text-xs text-purple-500 font-normal ml-2 hidden sm:inline">(Press Esc to close)</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-600 hover:text-white hover:bg-red-500 rounded-full p-2 transition-all duration-200 hover:scale-110 bg-gray-100 hover:bg-red-500 shadow-sm"
                title="Close chat (Esc)"
              >
                <X className="h-5 w-5 font-bold" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full pb-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1 py-2"
                 style={{
                   scrollbarWidth: 'thin',
                   scrollbarColor: '#e2e8f0 transparent'
                 }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-gradient-to-r from-purple-100 to-pink-100 text-gray-900 border border-purple-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <div className="relative">
                          <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                          <Heart className="h-2 w-2 absolute -top-0.5 -right-0.5 text-pink-500" />
                        </div>
                      )}
                      {message.role === 'user' && (
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-white" />
                      )}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg px-3 py-2 border border-purple-200">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Bot className="h-4 w-4 text-purple-600" />
                        <Heart className="h-2 w-2 absolute -top-0.5 -right-0.5 text-pink-500" />
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="flex space-x-2 border-t border-purple-100 pt-3">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Lena anything..."
                className="flex-1 min-h-[40px] max-h-[100px] resize-none border-purple-200 focus:border-purple-400 focus:ring-purple-400 rounded-xl bg-purple-50/50 focus:bg-white transition-colors"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                size="sm"
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </>
      )}
    </>
  )
}