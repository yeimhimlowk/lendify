'use client'

import { useFormContext } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import type { CreateListingInput } from '@/lib/api/schemas'

// Category type from API
interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

// Icon mapping for categories
const categoryIcons: Record<string, string> = {
  'electronics': '💻',
  'tools-equipment': '🔧',
  'sports-outdoors': '⚽',
  'home-garden': '🏡',
  'vehicles': '🚗',
  'party-events': '🎉',
  'fashion-accessories': '👕',
  'music-audio': '🎸',
  'cameras-photography': '📷',
  'books-media': '📚',
  'baby-kids': '👶',
  'other': '📦'
}

const conditionLabels = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor'
}

export default function ReviewStep() {
  const { watch } = useFormContext<CreateListingInput>()
  const formData = watch()
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    fetchCategories()
  }, [])

  const category = categories.find(c => c.id === formData.category_id)
  const categoryIcon = category ? categoryIcons[category.slug] || '📦' : '📦'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Review Your Listing</h2>
        <p className="text-gray-600">Make sure everything looks good before publishing</p>
      </div>

      {/* Preview Card */}
      <Card className="overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Listing Preview</h3>
        </div>
        
        <div className="p-6">
          {/* Photos */}
          {formData.photos && formData.photos.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {formData.photos.slice(0, 3).map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {formData.photos.length > 3 && (
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-600">+{formData.photos.length - 3} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title and Category */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{formData.title}</h2>
            {category && (
              <p className="text-sm text-gray-600 mt-1">
                {categoryIcon} {category.name}
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="mb-4">
            <div className="flex items-baseline gap-4">
              <div>
                <span className="text-3xl font-bold text-[var(--primary)]">
                  ${formData.price_per_day}
                </span>
                <span className="text-gray-600">/day</span>
              </div>
              {formData.price_per_week && (
                <div className="text-sm text-gray-600">
                  ${formData.price_per_week}/week
                </div>
              )}
              {formData.price_per_month && (
                <div className="text-sm text-gray-600">
                  ${formData.price_per_month}/month
                </div>
              )}
            </div>
            {formData.deposit_amount && formData.deposit_amount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Security deposit: ${formData.deposit_amount}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{formData.description}</p>
          </div>

          {/* Location */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Location</h3>
            <p className="text-gray-600">{formData.address}</p>
          </div>

          {/* Condition and Tags */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Condition</h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {conditionLabels[formData.condition]}
              </span>
            </div>

            {formData.tags && formData.tags.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Listing Summary</h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-600">Status</dt>
            <dd className="font-medium">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Draft
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Photos</dt>
            <dd className="font-medium">{formData.photos?.length || 0} uploaded</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Daily Rate</dt>
            <dd className="font-medium">${formData.price_per_day}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Location Set</dt>
            <dd className="font-medium">
              {formData.location.lat !== 0 && formData.location.lng !== 0 ? 'Yes' : 'No'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Final Notes */}
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">Ready to publish?</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Your listing will be live immediately after creation</li>
          <li>• You can edit or pause your listing anytime from your dashboard</li>
          <li>• We&apos;ll notify you when someone is interested in renting</li>
          <li>• Remember to keep your availability calendar updated</li>
        </ul>
      </div>
    </div>
  )
}