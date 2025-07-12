'use client'

import { useState } from 'react'
import Image from 'next/image'
import { uploadImage, deleteImage } from '@/lib/upload/image-upload'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function TestUploadPage() {
  const [uploadedImages, setUploadedImages] = useState<{ url: string; path: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setError(null)
    setIsUploading(true)

    const file = e.target.files[0]

    try {
      const result = await uploadImage(file)

      if (result.error) {
        setError(result.error)
      } else {
        setUploadedImages(prev => [...prev, { url: result.url, path: result.path }])
      }
    } catch (err) {
      setError('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (index: number) => {
    const image = uploadedImages[index]
    
    const success = await deleteImage(image.path)
    
    if (success) {
      setUploadedImages(prev => prev.filter((_, i) => i !== index))
    } else {
      setError('Failed to delete image')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Photo Upload</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="mb-8">
        <input
          type="file"
          id="test-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        <Button
          onClick={() => document.getElementById('test-upload')?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Photo'
          )}
        </Button>
      </div>

      {uploadedImages.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Uploaded Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedImages.map((image, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-square relative">
                  <Image
                    src={image.url}
                    alt={`Uploaded ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2 truncate">{image.path}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    className="w-full"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}