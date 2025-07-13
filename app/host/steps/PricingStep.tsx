'use client'

import { useFormContext } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { FormInput } from '@/components/ui/form-input'
import { AvailabilityCalendar } from '@/components/listings/AvailabilityCalendar'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import type { CreateListingInput } from '@/lib/api/schemas'

interface PricingSuggestion {
  suggested_price: number
  confidence_score: number
  price_range: {
    min: number
    max: number
  }
  market_analysis?: {
    average_price: number
    median_price: number
    comparable_count: number
  }
  recommendations: string[]
}

export default function PricingStep() {
  const { register, formState: { errors }, setValue, watch, getValues } = useFormContext<CreateListingInput>()
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const [isLoadingPricing, setIsLoadingPricing] = useState(false)
  const [pricingSuggestion, setPricingSuggestion] = useState<PricingSuggestion | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [showPricingDetails, setShowPricingDetails] = useState(false)

  const pricePerDay = watch('price_per_day')
  const pricePerWeek = watch('price_per_week')
  const pricePerMonth = watch('price_per_month')

  // Calculate suggested prices
  useEffect(() => {
    if (pricePerDay && pricePerDay > 0) {
      if (!pricePerWeek) {
        setValue('price_per_week', Math.round(pricePerDay * 6.5))
      }
      if (!pricePerMonth) {
        setValue('price_per_month', Math.round(pricePerDay * 25))
      }
    }
  }, [pricePerDay, pricePerWeek, pricePerMonth, setValue])

  // Get AI pricing suggestion
  const getAIPricingSuggestion = async () => {
    const formData = getValues()
    
    if (!formData.category_id || !formData.condition) {
      setPricingError('Please complete basic information first (category and condition)')
      return
    }

    setIsLoadingPricing(true)
    setPricingError(null)
    setPricingSuggestion(null)

    try {
      const response = await fetch('/api/ai/price-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: formData.category_id,
          condition: formData.condition,
          location: formData.location || { lat: 0, lng: 0 }, // Use default if not set
          photos: formData.photos || [],
          description: formData.description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get pricing suggestion')
      }

      const result = await response.json()
      if (result.data?.pricing) {
        setPricingSuggestion(result.data.pricing)
        setShowPricingDetails(true)
      }
    } catch (error) {
      console.error('Pricing suggestion error:', error)
      setPricingError('Failed to get pricing suggestion. Please try again or set prices manually.')
    } finally {
      setIsLoadingPricing(false)
    }
  }

  // Apply suggested pricing
  const applySuggestedPricing = () => {
    if (pricingSuggestion) {
      setValue('price_per_day', pricingSuggestion.suggested_price)
      // Auto-calculate weekly and monthly with discounts
      setValue('price_per_week', Math.round(pricingSuggestion.suggested_price * 6.5))
      setValue('price_per_month', Math.round(pricingSuggestion.suggested_price * 25))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pricing & Availability</h2>
        <p className="text-gray-600">Set your rental prices and availability</p>
      </div>

      {/* AI Pricing Suggestion */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium text-gray-900">AI Pricing Assistant</h3>
            <p className="text-sm text-gray-600 mt-1">Get market-based pricing recommendations</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={getAIPricingSuggestion}
            disabled={isLoadingPricing}
            className="bg-white"
          >
            {isLoadingPricing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Get Pricing Suggestion
              </>
            )}
          </Button>
        </div>

        {/* Pricing Error */}
        {pricingError && (
          <Alert className="mb-3 border-red-200 bg-red-50 text-red-800">
            {pricingError}
          </Alert>
        )}

        {/* Pricing Suggestion Results */}
        {pricingSuggestion && showPricingDetails && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    ${pricingSuggestion.suggested_price}
                  </span>
                  <span className="text-sm text-gray-500">per day</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${pricingSuggestion.confidence_score * 10}%` }}
                      />
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {pricingSuggestion.confidence_score}/10
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={applySuggestedPricing}
                >
                  Apply Pricing
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPricingDetails(false)}
                >
                  Dismiss
                </Button>
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-3 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium text-gray-700 mb-1">Recommended Range</p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  ${pricingSuggestion.price_range.min} - ${pricingSuggestion.price_range.max} per day
                </span>
              </div>
            </div>

            {/* Market Analysis */}
            {pricingSuggestion.market_analysis && (
              <div className="mb-3 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-700 mb-2">Market Analysis</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Average</p>
                    <p className="font-medium">${pricingSuggestion.market_analysis.average_price}/day</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Median</p>
                    <p className="font-medium">${pricingSuggestion.market_analysis.median_price}/day</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Comparables</p>
                    <p className="font-medium">{pricingSuggestion.market_analysis.comparable_count} listings</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {pricingSuggestion.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recommendations</p>
                <ul className="space-y-1">
                  {pricingSuggestion.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Rental Prices</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FormInput
              id="price_per_day"
              label="Price per Day"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register('price_per_day', { valueAsNumber: true })}
              error={errors.price_per_day?.message}
            />
          </div>

          <div>
            <FormInput
              id="price_per_week"
              label="Price per Week (Optional)"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register('price_per_week', { valueAsNumber: true })}
              error={errors.price_per_week?.message}
            />
            {pricePerDay > 0 && pricePerWeek && (
              <p className="mt-1 text-xs text-green-600">
                {Math.round((1 - pricePerWeek / (pricePerDay * 7)) * 100)}% discount
              </p>
            )}
          </div>

          <div>
            <FormInput
              id="price_per_month"
              label="Price per Month (Optional)"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register('price_per_month', { valueAsNumber: true })}
              error={errors.price_per_month?.message}
            />
            {pricePerDay > 0 && pricePerMonth && (
              <p className="mt-1 text-xs text-green-600">
                {Math.round((1 - pricePerMonth / (pricePerDay * 30)) * 100)}% discount
              </p>
            )}
          </div>
        </div>

        {/* Security Deposit */}
        <div>
          <FormInput
            id="deposit_amount"
            label="Security Deposit (Optional)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('deposit_amount', { valueAsNumber: true })}
            error={errors.deposit_amount?.message}
          />
          <p className="mt-1 text-sm text-gray-500">
            This amount will be held and returned after successful rental completion
          </p>
        </div>
      </div>

      {/* Availability Calendar */}
      <div className="space-y-4">
        <AvailabilityCalendar
          blockedDates={blockedDates}
          onDateSelect={(date) => {
            if (date) {
              // Toggle date in blockedDates
              const dateStr = date.toDateString()
              const isBlocked = blockedDates.some(d => d.toDateString() === dateStr)
              
              let newBlockedDates: Date[]
              if (isBlocked) {
                // Remove from blocked dates
                newBlockedDates = blockedDates.filter(d => d.toDateString() !== dateStr)
              } else {
                // Add to blocked dates
                newBlockedDates = [...blockedDates, date]
              }
              
              setBlockedDates(newBlockedDates)
              
              // Convert to availability record
              const availability: Record<string, boolean> = {}
              newBlockedDates.forEach(d => {
                availability[d.toISOString().split('T')[0]] = false
              })
              setValue('availability', availability)
            }
          }}
          className="mt-4"
        />
      </div>

      {/* Pricing Tips */}
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">Pricing tips</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Research similar items in your area to set competitive prices</li>
          <li>• Offer weekly and monthly discounts to attract longer rentals</li>
          <li>• Consider seasonal demand when setting prices</li>
          <li>• A security deposit helps protect your item</li>
        </ul>
      </div>
    </div>
  )
}