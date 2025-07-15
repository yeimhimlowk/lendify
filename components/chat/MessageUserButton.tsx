'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send } from 'lucide-react'

interface MessageUserButtonProps {
  userId: string
  userName?: string
  bookingId?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}

export function MessageUserButton({
  userId,
  userName,
  bookingId,
  variant = 'default',
  size = 'default',
  className,
  children,
  disabled = false
}: MessageUserButtonProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleClick = async () => {
    if (!user) {
      // Redirect to login with return path
      const returnPath = `/messages?user_id=${userId}${bookingId ? `&booking_id=${bookingId}` : ''}`
      router.push(`/login?redirect=${encodeURIComponent(returnPath)}`)
      return
    }

    if (userId === user.id) {
      // User trying to message themselves
      return
    }

    setIsNavigating(true)
    
    try {
      // Navigate to messages page with user pre-selected
      const params = new URLSearchParams({
        user_id: userId
      })
      
      if (bookingId) {
        params.set('booking_id', bookingId)
      }
      
      router.push(`/messages?${params.toString()}`)
    } catch (error) {
      console.error('Failed to navigate to messages:', error)
    } finally {
      setIsNavigating(false)
    }
  }

  // Don't show button if user would be messaging themselves
  if (user && userId === user.id) {
    return null
  }

  const buttonText = children || (
    <div className="flex items-center gap-2">
      {isNavigating ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      <span>
        {isNavigating 
          ? 'Opening...' 
          : userName 
            ? `Message ${userName}` 
            : 'Send Message'
        }
      </span>
    </div>
  )

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isNavigating}
      variant={variant}
      size={size}
      className={className}
    >
      {buttonText}
    </Button>
  )
}

// Compact version for smaller spaces
export function MessageUserIconButton({
  userId,
  userName,
  bookingId,
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false
}: Omit<MessageUserButtonProps, 'children'>) {
  const router = useRouter()
  const { user } = useAuth()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleClick = async () => {
    if (!user) {
      const returnPath = `/messages?user_id=${userId}${bookingId ? `&booking_id=${bookingId}` : ''}`
      router.push(`/login?redirect=${encodeURIComponent(returnPath)}`)
      return
    }

    if (userId === user.id) {
      return
    }

    setIsNavigating(true)
    
    try {
      const params = new URLSearchParams({
        user_id: userId
      })
      
      if (bookingId) {
        params.set('booking_id', bookingId)
      }
      
      router.push(`/messages?${params.toString()}`)
    } catch (error) {
      console.error('Failed to navigate to messages:', error)
    } finally {
      setIsNavigating(false)
    }
  }

  if (user && userId === user.id) {
    return null
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isNavigating}
      variant={variant}
      size={size}
      className={className}
      title={userName ? `Message ${userName}` : 'Send Message'}
    >
      {isNavigating ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Send className="w-4 h-4" />
      )}
    </Button>
  )
}