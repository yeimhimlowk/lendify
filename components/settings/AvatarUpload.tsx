import { useRef, useState } from "react"
import Image from "next/image"
import { Camera, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userName?: string | null
  userEmail?: string | null
  userId?: string
  onUploadSuccess: (avatarUrl: string) => void
  onUploadError: (error: string) => void
  className?: string
}

export function AvatarUpload({
  currentAvatarUrl,
  userName,
  userEmail,
  userId,
  onUploadSuccess,
  onUploadError,
  className = ""
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      onUploadError('Please upload a JPEG, PNG, or WebP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      onUploadError('File size must be less than 5MB.')
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()
      
      // Generate unique file name for avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to existing listing-photos bucket with avatars folder
      const { data, error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(data.path)

      onUploadSuccess(publicUrl)
    } catch (error) {
      console.error('Avatar upload error:', error)
      onUploadError('Failed to upload profile photo. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getUserInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return userEmail?.[0]?.toUpperCase() || 'U'
  }

  return (
    <div className={`flex items-start gap-6 ${className}`}>
      <div className="relative group">
        {currentAvatarUrl ? (
          <div className="h-24 w-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
            <Image
              src={currentAvatarUrl}
              alt="Profile"
              width={96}
              height={96}
              className="object-cover w-full h-full transition-transform group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl font-bold shadow-sm group-hover:shadow-md transition-shadow">
            {getUserInitials()}
          </div>
        )}
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 bg-white border-2 border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 group-hover:scale-110 group-hover:border-primary/20"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 text-gray-600" />
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-lg mb-1">Profile Photo</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a professional photo to help others recognize you
        </p>
        
        <div className="space-y-2 text-xs text-muted-foreground mb-4">
          <p>• Supported formats: JPEG, PNG, WebP</p>
          <p>• Maximum file size: 5MB</p>
          <p>• Recommended: Square image, 400x400px minimum</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Choose Photo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}