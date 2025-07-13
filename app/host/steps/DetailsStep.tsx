'use client'

import { useFormContext } from 'react-hook-form'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { FormInput } from '@/components/ui/form-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { CreateListingInput } from '@/lib/api/schemas'

const conditionOptions = [
  { value: 'new', label: 'New', description: 'Brand new, never used' },
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Some signs of use, fully functional' },
  { value: 'fair', label: 'Fair', description: 'Shows wear, but works properly' },
  { value: 'poor', label: 'Poor', description: 'Heavy wear, may have issues' }
]

const popularTags = [
  'Professional', 'Beginner-friendly', 'Portable', 'Heavy-duty', 'Vintage',
  'Digital', 'Manual', 'Wireless', 'Waterproof', 'Lightweight',
  'Premium', 'Budget-friendly', 'Eco-friendly', 'Fast delivery', 'Flexible pickup'
]

export default function DetailsStep() {
  const { formState: { errors }, setValue, watch } = useFormContext<CreateListingInput>()
  const [tagInput, setTagInput] = useState('')
  
  const condition = watch('condition')
  const tags = watch('tags') || []

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 20) {
      setValue('tags', [...tags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation() // Prevent event bubbling to form
      addTag(tagInput)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Additional Details</h2>
        <p className="text-gray-600">Add more information to help renters understand your item</p>
      </div>

      {/* Condition */}
      <div>
        <Label htmlFor="condition">Item Condition</Label>
        <div className="mt-2 space-y-2">
          {conditionOptions.map((option) => (
            <Card
              key={option.value}
              className={`p-4 cursor-pointer transition-all ${
                condition === option.value
                  ? 'border-[var(--primary)] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setValue('condition', option.value as any)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    condition === option.value
                      ? 'border-[var(--primary)] bg-[var(--primary)]'
                      : 'border-gray-300'
                  }`}>
                    {condition === option.value && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">{option.label}</h4>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        {errors.condition && (
          <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
        )}
      </div>

      {/* Tags */}
      <div>
        <Label htmlFor="tags">Tags (Optional)</Label>
        <p className="text-sm text-gray-500 mb-2">
          Add tags to help people find your item ({tags.length}/20)
        </p>
        
        {/* Tag Input */}
        <div className="flex gap-2 mb-3">
          <FormInput
            id="tag-input"
            placeholder="Add a tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            maxLength={50}
          />
          <Button
            type="button"
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim() || tags.length >= 20}
          >
            Add
          </Button>
        </div>

        {/* Current Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Popular Tags */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Popular tags:</p>
          <div className="flex flex-wrap gap-2">
            {popularTags
              .filter(tag => !tags.includes(tag))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                  disabled={tags.length >= 20}
                >
                  + {tag}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="bg-amber-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-amber-900 mb-2">Before you continue</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Make sure your item condition is accurately described</li>
          <li>• Tags help your item appear in search results</li>
          <li>• Be honest about any limitations or requirements</li>
          <li>• Consider what renters would want to know</li>
        </ul>
      </div>
    </div>
  )
}