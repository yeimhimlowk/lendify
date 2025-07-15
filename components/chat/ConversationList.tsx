'use client'

import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { Card } from '@/components/ui/card'

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

interface ConversationListProps {
  conversations: Conversation[]
  currentUserId: string
  selectedConversationId?: string
  onSelectConversation: (conversationId: string, otherUserId: string) => void
  loading?: boolean
  className?: string
}

export function ConversationList({ 
  conversations, 
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  loading = false,
  className 
}: ConversationListProps) {
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500 text-sm">
          No conversations yet
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Start a conversation by messaging someone!
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {conversations.map((conversation) => {
        const isSelected = selectedConversationId === conversation.other_user.id
        const isLatestMessageFromCurrentUser = conversation.latest_message.sender.id === currentUserId
        
        const formattedDate = conversation.latest_message.created_at 
          ? formatDistanceToNow(new Date(conversation.latest_message.created_at), { addSuffix: true })
          : 'Unknown time'

        const truncatedMessage = conversation.latest_message.content.length > 60
          ? conversation.latest_message.content.substring(0, 60) + '...'
          : conversation.latest_message.content

        return (
          <Card 
            key={conversation.id}
            className={`
              p-4 cursor-pointer transition-all duration-200 hover:shadow-md border-none
              ${isSelected 
                ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/20' 
                : 'hover:bg-gray-50 hover:shadow-sm'
              }
            `}
            onClick={() => onSelectConversation(conversation.id, conversation.other_user.id)}
          >
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                {conversation.other_user.avatar_url ? (
                  <Image
                    src={conversation.other_user.avatar_url}
                    alt={conversation.other_user.full_name || 'User'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-gray-700 bg-gradient-to-br from-[var(--primary)] to-pink-600 bg-clip-text text-transparent">
                    {conversation.other_user.full_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                {/* User Name and Booking Context */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.other_user.full_name || 'Anonymous User'}
                  </h3>
                  {conversation.booking && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gradient-to-r from-[var(--secondary)] to-cyan-600 text-white font-medium flex-shrink-0 shadow-sm">
                      Booking
                    </span>
                  )}
                </div>

                {/* Latest Message Preview */}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  {isLatestMessageFromCurrentUser && (
                    <span className="text-gray-500">You:</span>
                  )}
                  <p className="truncate">
                    {truncatedMessage}
                  </p>
                </div>

                {/* Booking Details */}
                {conversation.booking && conversation.booking.listing && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {conversation.booking.listing.title}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {formattedDate}
                </span>
                {/* Unread indicator placeholder - could be implemented later */}
                {/* {hasUnreadMessages && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )} */}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}