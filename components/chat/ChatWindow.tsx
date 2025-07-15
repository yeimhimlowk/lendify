'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { MessageBubble } from './MessageBubble'
import { MessageForm } from './MessageForm'
import Image from 'next/image'
import { MessageSquare } from 'lucide-react'
import type { Message } from '@/lib/supabase/types'

interface ChatWindowProps {
  conversation: {
    id: string
    other_user: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
    messages: Array<Message & {
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
    }>
    message_count: number
  } | null
  currentUserId: string
  bookingId?: string
  onSendMessage: (content: string, bookingId?: string) => Promise<void>
  loading?: boolean
  sendingMessage?: boolean
  className?: string
}

export function ChatWindow({ 
  conversation, 
  currentUserId,
  bookingId,
  onSendMessage,
  loading = false,
  sendingMessage = false,
  className 
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && conversation?.messages) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [conversation?.messages])

  if (!conversation) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">Select a conversation</div>
          <div className="text-gray-400 text-sm">
            Choose a conversation from the list to start messaging
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Header skeleton */}
        <div className="border-b p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 p-4 space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
              <div className="bg-gray-200 rounded-lg p-3 w-1/2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="border-t p-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <Card className={`flex flex-col h-full ${className} border-none shadow-sm`}>
      {/* Chat Header */}
      <div className="border-b border-gray-100 p-6 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          {/* Other user avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
            {conversation.other_user.avatar_url ? (
              <Image
                src={conversation.other_user.avatar_url}
                alt={conversation.other_user.full_name || 'User'}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-700 bg-gradient-to-br from-[var(--primary)] to-pink-600 bg-clip-text text-transparent">
                {conversation.other_user.full_name?.charAt(0) || 'U'}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 text-lg">
              {conversation.other_user.full_name || 'Anonymous User'}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {conversation.message_count} {conversation.message_count === 1 ? 'message' : 'messages'}
            </p>
          </div>

          {bookingId && (
            <div className="text-xs bg-gradient-to-r from-[var(--secondary)] to-cyan-600 text-white px-3 py-1.5 rounded-full font-medium shadow-sm">
              Booking Chat
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-gray-50/30 to-white"
        style={{ minHeight: 0 }} // Allow flex child to shrink
      >
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--primary)] to-pink-600 bg-opacity-10 rounded-full flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <div className="text-lg mb-2 font-medium">No messages yet</div>
              <div className="text-sm">Send a message to start the conversation!</div>
            </div>
          </div>
        ) : (
          <>
            {conversation.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-100 p-6 flex-shrink-0 bg-white">
        <MessageForm
          recipientId={conversation.other_user.id}
          bookingId={bookingId}
          onSendMessage={onSendMessage}
          disabled={sendingMessage}
          placeholder={`Message ${conversation.other_user.full_name || 'user'}...`}
        />
      </div>
    </Card>
  )
}