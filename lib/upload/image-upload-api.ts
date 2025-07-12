// Alternative upload functions that use the API route for server-side handling

export interface UploadResult {
  url: string
  path: string
  error?: string
}

export async function uploadImageViaAPI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Create form data
    const formData = new FormData()
    formData.append('file', file)

    // Simulate progress since fetch doesn't provide upload progress
    if (onProgress) {
      const progressInterval = setInterval(() => {
        onProgress(Math.min(90, Math.random() * 100))
      }, 100)

      setTimeout(() => {
        clearInterval(progressInterval)
      }, 1000)
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        url: '',
        path: '',
        error: error.error || 'Upload failed'
      }
    }

    const data = await response.json()
    
    if (onProgress) {
      onProgress(100)
    }

    return {
      url: data.url,
      path: data.path
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      url: '',
      path: '',
      error: 'Network error occurred'
    }
  }
}

export async function deleteImageViaAPI(path: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    })

    return response.ok
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}