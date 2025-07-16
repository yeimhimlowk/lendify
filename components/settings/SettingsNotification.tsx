import { useEffect, useState } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"

interface SettingsNotificationProps {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
  autoHide?: boolean
  autoHideDelay?: number
}

export function SettingsNotification({ 
  type, 
  message, 
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000
}: SettingsNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide && type === 'success') {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300) // Allow fade out animation
      }, autoHideDelay)
      
      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, type, onDismiss])

  if (!isVisible) return null

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
      type === 'success' 
        ? 'bg-green-50 text-green-800 border-green-200' 
        : 'bg-red-50 text-red-800 border-red-200'
    } ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      <div className="flex items-center gap-3">
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
        )}
        <span className="font-medium">{message}</span>
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onDismiss, 300)
        }}
        className="ml-4 p-1 hover:bg-black/10 rounded-full transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}