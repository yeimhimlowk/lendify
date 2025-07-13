'use client'

import { useFormContext } from 'react-hook-form'
import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, X } from 'lucide-react'
import type { CreateListingInput } from '@/lib/api/schemas'
import { uploadImage, deleteImage, compressImage, type UploadProgress, type UploadResult } from '@/lib/upload/image-upload'
import { Alert } from '@/components/ui/alert'

interface PhotoData {
  url: string
  path: string
}

export default function PhotosStep() {
  const { setValue, watch, formState: { errors }, getValues } = useFormContext<CreateListingInput>()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({})
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  
  const photos = watch('photos') || []
  const photoData = watch('photoData') as PhotoData[] || []

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    // Clear previous errors
    setUploadErrors([])
    
    // Check authentication first
    console.log('Checking authentication before upload...')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Authentication check failed:', authError)
        setUploadErrors(['You must be logged in to upload photos. Please sign in and try again.'])
        return
      }
      console.log('User authenticated:', user.id)
    } catch (error) {
      console.error('Failed to check authentication:', error)
      setUploadErrors(['Failed to verify authentication. Please refresh the page and try again.'])
      return
    }
    
    // Validate file count
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isUnderSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isImage && isUnderSize
    })

    if (validFiles.length + photos.length > 10) {
      setUploadErrors(['You can upload a maximum of 10 photos'])
      return
    }

    // Filter out invalid files
    const invalidFiles = files.filter(file => !validFiles.includes(file))
    if (invalidFiles.length > 0) {
      setUploadErrors(invalidFiles.map(file => {
        if (!file.type.startsWith('image/')) {
          return `${file.name}: Invalid file type`
        }
        if (file.size > 5 * 1024 * 1024) {
          return `${file.name}: File too large (max 5MB)`
        }
        return `${file.name}: Invalid file`
      }))
    }

    setIsUploading(true)

    // Upload valid files
    for (const file of validFiles) {
      const fileId = Math.random().toString(36).substring(7)
      
      // Initialize upload progress
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { fileId, progress: 0, fileName: file.name }
      }))

      try {
        // Compress image if it's large
        let fileToUpload = file
        if (file.size > 1 * 1024 * 1024) { // Compress if larger than 1MB
          try {
            fileToUpload = await compressImage(file)
          } catch (error) {
            console.error('Compression failed, using original:', error)
          }
        }

        // Simulate progress updates (since Supabase doesn't provide progress)
        let progressInterval: NodeJS.Timeout | null = null
        let uploadComplete = false
        
        progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[fileId]?.progress || 0
            // If upload is complete, immediately set to 100%
            if (uploadComplete) {
              if (progressInterval) clearInterval(progressInterval)
              return {
                ...prev,
                [fileId]: { ...prev[fileId], progress: 100 }
              }
            }
            // Otherwise, increment progress up to 90%
            if (current >= 90) {
              return prev
            }
            return {
              ...prev,
              [fileId]: { ...prev[fileId], progress: current + 10 }
            }
          })
        }, 100)

        // Upload to Supabase with timeout
        const uploadPromise = uploadImage(fileToUpload)
        const timeoutPromise = new Promise<UploadResult>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 second timeout
        )
        
        try {
          console.log(`Racing upload promise for ${file.name}...`)
          const result = await Promise.race([uploadPromise, timeoutPromise])
          uploadComplete = true
          console.log(`Upload completed for ${file.name}:`, result)
          
          if (progressInterval) {
            clearInterval(progressInterval)
          }

          if (result.error) {
            console.error(`Upload error for ${file.name}:`, result.error)
            setUploadErrors(prev => [...prev, `${file.name}: ${result.error}`])
            setUploadProgress(prev => {
              const { [fileId]: _, ...rest } = prev
              return rest
            })
          } else {
            // Update progress to 100%
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: { ...prev[fileId], progress: 100 }
            }))

            // Add to photos array
            setTimeout(() => {
              setValue('photos', [...photos, result.url])
              setValue('photoData', [...photoData, { url: result.url, path: result.path }])
              
              // Remove from progress
              setUploadProgress(prev => {
                const { [fileId]: _, ...rest } = prev
                return rest
              })
            }, 500)
          }
        } catch (error) {
          // Always clear the interval on error
          if (progressInterval) {
            clearInterval(progressInterval)
          }
          
          console.error('Upload error:', error)
          const errorMessage = error instanceof Error && error.message === 'Upload timeout' 
            ? `${file.name}: Upload timed out. Please try again.`
            : `${file.name}: Upload failed`
          
          setUploadErrors(prev => [...prev, errorMessage])
          setUploadProgress(prev => {
            const { [fileId]: _, ...rest } = prev
            return rest
          })
        }
      } catch (error) {
        console.error('Upload process error:', error)
        setUploadErrors(prev => [...prev, `${file.name}: Failed to process upload`])
        setUploadProgress(prev => {
          const { [fileId]: _, ...rest } = prev
          return rest
        })
      }
    }

    setIsUploading(false)
  }

  const removePhoto = async (index: number) => {
    const photoToRemove = photoData[index]
    
    // Delete from Supabase storage
    if (photoToRemove?.path) {
      await deleteImage(photoToRemove.path)
    }

    // Remove from form data
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPhotoData = photoData.filter((_, i) => i !== index)
    setValue('photos', newPhotos)
    setValue('photoData', newPhotoData)
  }

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos]
    const newPhotoData = [...photoData]
    
    const [movedPhoto] = newPhotos.splice(fromIndex, 1)
    const [movedPhotoData] = newPhotoData.splice(fromIndex, 1)
    
    newPhotos.splice(toIndex, 0, movedPhoto)
    newPhotoData.splice(toIndex, 0, movedPhotoData)
    
    setValue('photos', newPhotos)
    setValue('photoData', newPhotoData)
  }

  // AI Photo Analysis
  const analyzePhotos = async () => {
    if (photos.length === 0) {
      setUploadErrors(['Please upload at least one photo first'])
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null)

    try {
      const response = await fetch('/api/ai/analyze-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photos: photos,
          analysis_type: 'comprehensive'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze photos')
      }

      const result = await response.json()
      if (result.data?.analysis) {
        setAnalysisResult(result.data.analysis)
        setShowAnalysisModal(true)
      }
    } catch (error) {
      console.error('Photo analysis error:', error)
      setUploadErrors(['Failed to analyze photos. Please try again.'])
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Apply AI suggestions to description
  const applyAISuggestions = () => {
    if (analysisResult?.description) {
      const currentDescription = getValues('description') || ''
      const enhancedDescription = currentDescription 
        ? `${currentDescription}\n\n${analysisResult.description}`
        : analysisResult.description
      setValue('description', enhancedDescription)
    }
    setShowAnalysisModal(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Photos</h2>
        <p className="text-gray-600">Add up to 10 photos of your item</p>
      </div>

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Alert variant="error">
          <ul className="list-disc list-inside">
            {uploadErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Upload Area */}
      <div>
        <Label>Upload Photos</Label>
        <div
          className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-[var(--primary)] bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-5xl">📸</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drag and drop your photos here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse
              </p>
            </div>
            <input
              type="file"
              id="photo-upload"
              className="hidden"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photo-upload')?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Select Photos'
              )}
            </Button>
            <p className="text-xs text-gray-500">
              JPG, PNG, WebP, GIF up to 5MB each
            </p>
          </div>
        </div>
        
        {errors.photos && (
          <p className="mt-1 text-sm text-red-600">{errors.photos.message}</p>
        )}
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  Uploading {progress.fileName}...
                </span>
                <span className="text-sm text-gray-600">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[var(--primary)] h-2 rounded-full transition-all"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Your Photos ({photos.length}/10)</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={analyzePhotos}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    AI Analyze Photos
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-500">Drag to reorder</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <Card
                key={index}
                className="relative group cursor-move overflow-hidden"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', index.toString())
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                  if (fromIndex !== index) {
                    movePhoto(fromIndex, index)
                  }
                }}
              >
                <div className="aspect-square relative">
                  <Image
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-[var(--primary)] text-white text-xs px-2 py-1 rounded">
                      Main Photo
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Photo Tips */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-purple-900 mb-2">Photo tips</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Use natural lighting for the best results</li>
          <li>• Show the item from multiple angles</li>
          <li>• Include close-ups of important details or any damage</li>
          <li>• The first photo will be your main listing image</li>
          <li>• Clear, high-quality photos attract more renters</li>
          <li>• Photos are automatically compressed for optimal loading</li>
          <li>• Use AI Analyze to enhance your description based on photos</li>
        </ul>
      </div>

      {/* AI Analysis Results Modal */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4">
              <h3 className="text-lg font-semibold">AI Photo Analysis Results</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Description Enhancement */}
              {analysisResult.description && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Suggested Description Enhancement</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysisResult.description}</p>
                </div>
              )}

              {/* Condition Assessment */}
              {analysisResult.condition_assessment && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Condition Assessment</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Condition:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                      {analysisResult.condition_assessment.condition.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      (Confidence: {Math.round(analysisResult.condition_assessment.confidence * 100)}%)
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{analysisResult.condition_assessment.details}</p>
                </div>
              )}

              {/* Price Suggestion */}
              {analysisResult.price_suggestion && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Price Suggestion</h4>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold">${analysisResult.price_suggestion.suggested_price}</span>
                    <span className="text-sm text-gray-600">per day</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{analysisResult.price_suggestion.reasoning}</p>
                  <p className="text-sm text-gray-600">
                    Range: ${analysisResult.price_suggestion.price_range.min} - ${analysisResult.price_suggestion.price_range.max}
                  </p>
                </div>
              )}

              {/* Extracted Tags */}
              {analysisResult.extracted_tags && analysisResult.extracted_tags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Suggested Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.extracted_tags.map((tag: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-white border border-gray-200 rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Score */}
              {analysisResult.quality_score && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Photo Quality Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${analysisResult.quality_score * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{analysisResult.quality_score}/10</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAnalysisModal(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={applyAISuggestions}
              >
                Apply Description Enhancement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}