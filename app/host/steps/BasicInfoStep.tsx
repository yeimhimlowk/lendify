'use client'

import { useFormContext } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { FormInput } from '@/components/ui/form-input'
import { Label } from '@/components/ui/label'
import { SimpleSelect } from '@/components/ui/simple-select'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Alert } from '@/components/ui/alert'
import type { CreateListingInput } from '@/lib/api/schemas'

// Mock categories - replace with API call
const categories = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Electronics', icon: '💻' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Tools & Equipment', icon: '🔧' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Sports & Outdoors', icon: '⚽' },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Home & Garden', icon: '🏡' },
  { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Party & Events', icon: '🎉' },
  { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Vehicles', icon: '🚗' },
  { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Clothing & Accessories', icon: '👕' },
  { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Books & Media', icon: '📚' },
  { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Musical Instruments', icon: '🎸' },
  { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Other', icon: '📦' }
]

export default function BasicInfoStep() {
  const { register, formState: { errors }, watch, setValue } = useFormContext<CreateListingInput>()
  const [titleLength, setTitleLength] = useState(0)
  const [descriptionLength, setDescriptionLength] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [generatedAlternatives, setGeneratedAlternatives] = useState<string[]>([])

  const title = watch('title')
  const description = watch('description')
  const categoryId = watch('category_id')
  const condition = watch('condition')

  useEffect(() => {
    setTitleLength(title?.length || 0)
  }, [title])

  useEffect(() => {
    setDescriptionLength(description?.length || 0)
  }, [description])

  // AI content generation function
  const generateAIContent = async () => {
    if (!title || !categoryId) {
      setAiError('Please enter a title and select a category first')
      return
    }

    setIsGenerating(true)
    setAiError(null)
    setGeneratedAlternatives([])

    try {
      const selectedCategory = categories.find(cat => cat.id === categoryId)
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'description',
          context: {
            category: selectedCategory?.name,
            condition: condition || 'good',
            existing_content: title
          },
          tone: 'friendly',
          length: 'medium'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const result = await response.json()
      if (result.data?.generated_content) {
        setValue('description', result.data.generated_content)
        if (result.data.alternatives) {
          setGeneratedAlternatives(result.data.alternatives)
        }
      }
    } catch (error) {
      console.error('AI generation error:', error)
      setAiError('Failed to generate content. Please try again or write manually.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-600">Tell us about the item you want to list</p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <FormInput
            id="title"
            label="Title"
            placeholder="e.g., Professional Camera Kit with Lenses"
            {...register('title')}
            error={errors.title?.message}
          />
          <div className="mt-1 text-sm text-gray-500 text-right">
            {titleLength}/200 characters
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="description">Description</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateAIContent}
              disabled={isGenerating || !title || !categoryId}
              className="text-sm"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Generate
                </>
              )}
            </Button>
          </div>
          <textarea
            id="description"
            rows={6}
            className={`mt-1 block w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors ${
              errors.description ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
            }`}
            placeholder="Describe your item in detail. Include brand, model, condition, and what's included..."
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
          <div className="mt-1 text-sm text-gray-500 text-right">
            {descriptionLength}/5000 characters
          </div>
          
          {/* AI Error Alert */}
          {aiError && (
            <Alert type="error" className="mt-2">
              {aiError}
            </Alert>
          )}
          
          {/* Generated Alternatives */}
          {generatedAlternatives.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Alternative suggestions:</p>
              <div className="space-y-2">
                {generatedAlternatives.map((alt, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => setValue('description', alt)}
                      className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      Use this
                    </button>
                    <p className="text-sm text-gray-600 flex-1">{alt.substring(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <SimpleSelect
            id="category"
            label="Category"
            {...register('category_id')}
            error={errors.category_id?.message}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </SimpleSelect>
        </div>

        {/* Condition */}
        <div>
          <SimpleSelect
            id="condition"
            label="Condition"
            {...register('condition')}
            error={errors.condition?.message}
          >
            <option value="">Select condition</option>
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </SimpleSelect>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for a great listing</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use a clear, descriptive title that includes the brand and model</li>
          <li>• Mention all included accessories and features</li>
          <li>• Be honest about the condition and any defects</li>
          <li>• Choose the most specific category for better visibility</li>
          <li>• Try the AI Generate button to create a compelling description automatically</li>
        </ul>
      </div>
    </div>
  )
}