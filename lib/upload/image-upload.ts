import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  url: string
  path: string
  error?: string
}

export interface UploadProgress {
  fileId: string
  progress: number
  fileName: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function uploadImage(
  file: File,
  _onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      url: '',
      path: '',
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.'
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      url: '',
      path: '',
      error: 'File size too large. Maximum size is 5MB.'
    }
  }

  const supabase = createClient()

  // Generate unique file name
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const filePath = `listings/${fileName}`

  try {
    // Log upload attempt
    console.log(`Attempting to upload file: ${fileName}, size: ${file.size} bytes`)
    
    // Upload file with progress tracking
    const { data, error } = await supabase.storage
      .from('listing-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase storage error:', {
        error,
        message: error.message,
        name: error.name,
        cause: error.cause
      })
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload image'
      if (error.message?.includes('row level security')) {
        errorMessage = 'Authentication error. Please sign in and try again.'
      } else if (error.message?.includes('bucket')) {
        errorMessage = 'Storage configuration error. Please contact support.'
      } else if (error.message?.includes('Payload too large')) {
        errorMessage = 'File too large. Please use a smaller image.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        url: '',
        path: '',
        error: errorMessage
      }
    }

    if (!data?.path) {
      console.error('Upload succeeded but no path returned')
      return {
        url: '',
        path: '',
        error: 'Upload succeeded but no file path was returned'
      }
    }

    console.log(`Upload successful: ${data.path}`)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(data.path)

    console.log(`Public URL generated: ${publicUrl}`)

    return {
      url: publicUrl,
      path: data.path
    }
  } catch (error) {
    console.error('Upload exception:', error)
    
    // Check for specific error types
    let errorMessage = 'An unexpected error occurred during upload'
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.'
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return {
      url: '',
      path: '',
      error: errorMessage
    }
  }
}

export async function deleteImage(path: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.storage
      .from('listing-photos')
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete exception:', error)
    return false
  }
}

// Compress image before upload if needed
export async function compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height
          
          if (width > maxWidth) {
            width = maxWidth
            height = width / aspectRatio
          }
          
          if (height > maxHeight) {
            height = maxHeight
            width = height * aspectRatio
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}