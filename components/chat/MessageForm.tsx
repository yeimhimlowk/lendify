'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Calendar } from 'lucide-react'

interface MessageFormProps {
  recipientId: string
  bookingId?: string
  onSendMessage: (content: string, bookingId?: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MessageForm({ 
  recipientId: _, 
  bookingId,
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  className 
}: MessageFormProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() || isSubmitting || disabled) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSendMessage(content.trim(), bookingId)
      setContent('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
      {/* Booking indicator */}
      {bookingId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[var(--secondary)] to-cyan-600 bg-opacity-10 rounded-lg border border-cyan-200">
          <Calendar className="h-4 w-4 text-[var(--secondary)]" />
          <span className="text-sm text-[var(--secondary)] font-medium">
            This message is related to your booking
          </span>
        </div>
      )}
      
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            rows={1}
            className="flex-1 min-h-[48px] max-h-32 resize-none border-gray-200 focus:border-[var(--primary)] focus:ring-[var(--primary)] rounded-xl shadow-sm"
            style={{
              height: 'auto',
              minHeight: '48px',
              maxHeight: '128px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
          />
          
          {/* Character counter for long messages */}
          {content.length > 200 && (
            <div className="absolute -bottom-5 right-0 text-xs text-gray-400">
              {content.length}/1000
            </div>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={!content.trim() || isSubmitting || disabled}
          className="self-end h-12 px-4 bg-gradient-to-r from-[var(--primary)] to-pink-600 hover:from-pink-600 hover:to-[var(--primary)] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 min-w-[60px]"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="text-xs text-gray-400 px-1 flex items-center justify-between">
        <span>Press Enter to send, Shift + Enter for new line</span>
        {content.trim() && (
          <span className="text-gray-500 font-medium">
            {content.trim().split('\n').length} line{content.trim().split('\n').length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </form>
  )
}