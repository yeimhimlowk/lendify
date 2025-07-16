'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/use-auth'
import { useConversations } from '@/hooks/useConversations'
import { useMessages } from '@/hooks/useMessages'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, Users, RefreshCw } from 'lucide-react'

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  
  // Get booking_id from URL params if present
  const bookingId = searchParams.get('booking_id')
  const initialUserId = searchParams.get('user_id')

  const { 
    conversations, 
    loading: conversationsLoading, 
    error: conversationsError,
    refreshConversations 
  } = useConversations({ autoRefresh: true })

  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    sendMessage,
    sendingMessage 
  } = useMessages({ 
    conversationWith: selectedUserId || undefined,
    bookingId: bookingId || undefined,
    autoRefresh: true 
  })

  // Handle initial user selection from URL params
  useEffect(() => {
    if (initialUserId && !selectedUserId) {
      setSelectedUserId(initialUserId)
      setSelectedConversationId(initialUserId)
    }
  }, [initialUserId, selectedUserId])

  const handleSelectConversation = (conversationId: string, otherUserId: string) => {
    setSelectedConversationId(conversationId)
    setSelectedUserId(otherUserId)
    
    // Update URL without page reload
    const params = new URLSearchParams(searchParams)
    params.set('user_id', otherUserId)
    if (bookingId) {
      params.set('booking_id', bookingId)
    }
    router.replace(`/messages?${params.toString()}`, { scroll: false })
  }

  const handleSendMessage = async (content: string, messageBookingId?: string) => {
    try {
      await sendMessage(content, messageBookingId)
      // Refresh conversations to update the latest message
      await refreshConversations()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.push('/login?redirect=/messages')
    return null
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-600">Loading messages...</div>
        </div>
      </div>
    )
  }

  const selectedConversation = selectedUserId ? {
    id: selectedConversationId || '',
    other_user: conversations.find(c => c.other_user.id === selectedUserId)?.other_user || {
      id: selectedUserId,
      full_name: null,
      avatar_url: null
    },
    messages,
    message_count: messages.length
  } : null

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 bg-opacity-10 rounded-lg">
            <MessageSquare className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">
              Communicate with other users about bookings and listings
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{conversations.length} conversations</span>
          </div>
          {selectedConversation && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>{selectedConversation.message_count} messages</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-350px)]">
        {/* Conversations Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshConversations}
                  disabled={conversationsLoading}
                  className="bg-white hover:bg-gray-50 border-gray-200"
                >
                  {conversationsLoading ? (
                    <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {conversationsError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 text-sm mb-4">
                    {conversationsError}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshConversations}
                    className="bg-white hover:bg-gray-50"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  currentUserId={user?.id || ''}
                  selectedConversationId={selectedUserId || undefined}
                  onSelectConversation={handleSelectConversation}
                  loading={conversationsLoading}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {messagesError ? (
            <Card className="h-full flex items-center justify-center shadow-sm">
              <div className="text-center">
                <div className="text-red-600 text-sm mb-4">
                  {messagesError}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-white hover:bg-gray-50"
                >
                  Refresh Page
                </Button>
              </div>
            </Card>
          ) : (
            <ChatWindow
              conversation={selectedConversation as any}
              currentUserId={user?.id || ''}
              bookingId={bookingId || undefined}
              onSendMessage={handleSendMessage}
              loading={messagesLoading}
              sendingMessage={sendingMessage}
              className="h-full shadow-sm hover:shadow-md transition-shadow"
            />
          )}
        </div>
      </div>

      {/* Mobile responsive note */}
      <div className="mt-6 text-xs text-gray-500 lg:hidden bg-gray-50 p-4 rounded-lg">
        For the best messaging experience, use a larger screen or rotate your device to landscape mode.
      </div>
    </div>
  )
}