import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  title?: string
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, children, ...props }, ref) => {
    const variantStyles = {
      default: {
        container: 'bg-gray-50 text-gray-900 border-gray-200',
        icon: <Info className="h-5 w-5 text-gray-600" />
      },
      success: {
        container: 'bg-green-50 text-green-900 border-green-200',
        icon: <CheckCircle className="h-5 w-5 text-green-600" />
      },
      error: {
        container: 'bg-red-50 text-red-900 border-red-200',
        icon: <XCircle className="h-5 w-5 text-red-600" />
      },
      warning: {
        container: 'bg-yellow-50 text-yellow-900 border-yellow-200',
        icon: <AlertCircle className="h-5 w-5 text-yellow-600" />
      },
      info: {
        container: 'bg-blue-50 text-blue-900 border-blue-200',
        icon: <Info className="h-5 w-5 text-blue-600" />
      }
    }

    const styles = variantStyles[variant]

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 rounded-lg border p-4",
          styles.container,
          className
        )}
        {...props}
      >
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="flex-1">
          {title && (
            <h3 className="font-semibold mb-1">{title}</h3>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    )
  }
)

Alert.displayName = "Alert"

const AlertDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }