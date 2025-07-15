'use client'

import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import type { Message } from '@/lib/supabase/types'

interface MessageBubbleProps {
  message: Message & {
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
  currentUserId: string
  className?: string
}

export function MessageBubble({ 
  message, 
  currentUserId,
  className 
}: MessageBubbleProps) {
  const isOwnMessage = message.sender.id === currentUserId
  const formattedDate = message.created_at 
    ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
    : 'Unknown time'

  const displayUser = isOwnMessage ? message.recipient : message.sender

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 ${className}`}>
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-3 max-w-[70%]`}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
          {displayUser.avatar_url ? (
            <Image
              src={displayUser.avatar_url}
              alt={displayUser.full_name || 'User'}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-gray-700 bg-gradient-to-br from-[var(--primary)] to-pink-600 bg-clip-text text-transparent">
              {displayUser.full_name?.charAt(0) || 'U'}
            </span>
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col">
          {/* Message bubble */}
          <div className={`
            px-4 py-3 rounded-2xl relative shadow-sm
            ${isOwnMessage 
              ? 'bg-gradient-to-r from-[var(--primary)] to-pink-600 text-white rounded-br-sm' 
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
            }
            ${message.is_ai_response ? 'ring-2 ring-[var(--ai-accent)]/20 bg-gradient-to-r from-[var(--ai-accent)] to-purple-600' : ''}
          `}>
            {/* AI indicator */}
            {message.is_ai_response && (
              <div className="flex items-center gap-1 mb-2">
                <div className="w-2 h-2 bg-purple-100 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-100 font-medium">AI Assistant</span>
              </div>
            )}
            
            {/* Message text */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>

            {/* Booking context */}
            {message.booking && (
              <div className={`
                mt-3 pt-3 border-t text-xs
                ${isOwnMessage 
                  ? 'border-pink-400 text-pink-100' 
                  : 'border-gray-300 text-gray-600'
                }
              `}>
                <div className="flex items-center gap-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm ${
                    isOwnMessage 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gradient-to-r from-[var(--secondary)] to-cyan-600 text-white'
                  }`}>
                    Booking
                  </span>
                  {message.booking.listing?.title && (
                    <span className="truncate">
                      {message.booking.listing.title}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  {new Date(message.booking.start_date).toLocaleDateString()} - {' '}
                  {new Date(message.booking.end_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Timestamp and sender name */}
          <div className={`
            flex items-center gap-2 mt-2 px-1
            ${isOwnMessage ? 'justify-end' : 'justify-start'}
          `}>
            {!isOwnMessage && (
              <span className="text-xs font-medium text-gray-700">
                {displayUser.full_name || 'Anonymous'}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}