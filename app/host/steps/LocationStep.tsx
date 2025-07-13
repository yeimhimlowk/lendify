'use client'

import { useFormContext } from 'react-hook-form'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
import type { CreateListingInput } from '@/lib/api/schemas'

// Dynamic import for LocationPicker to avoid SSR issues with Mapbox GL
const LocationPicker = dynamic(
  () => import('@/components/maps/LocationPicker').then(mod => ({ default: mod.LocationPicker })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <span className="text-gray-500">Loading map...</span>
      </div>
    )
  }
)


export default function LocationStep() {
  const { formState: { errors }, setValue, watch } = useFormContext<CreateListingInput>()
  const [isLocating, setIsLocating] = useState(false)

  const address = watch('address') || ''
  const location = watch('location') || { lat: 37.7749, lng: -122.4194 }


  const getCurrentLocation = () => {
    setIsLocating(true)
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setValue('location', { lat: latitude, lng: longitude })
          
          // Mock reverse geocoding
          setValue('address', `${Math.floor(Math.random() * 9000) + 1000} Market Street, San Francisco, CA 94102`)
          setIsLocating(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          setIsLocating(false)
        }
      )
    } else {
      alert('Geolocation is not supported by your browser')
      setIsLocating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Location</h2>
        <p className="text-gray-600">Where is your item located?</p>
      </div>

      <div className="space-y-4">

        {/* Current Location Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="w-full sm:w-auto"
          >
            {isLocating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Getting location...
              </>
            ) : (
              <>
                <span className="mr-2">📍</span>
                Use Current Location
              </>
            )}
          </Button>
        </div>

        {/* Map with integrated search */}
        <div>
          <LocationPicker
            location={location}
            onLocationChange={(newLocation) => setValue('location', newLocation)}
            address={address}
            onAddressChange={(newAddress) => setValue('address', newAddress)}
          />
          {errors.address && (
            <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        {/* Location Preview */}
        {location.lat !== 0 && location.lng !== 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Location Preview</h4>
            <p className="text-sm text-gray-600">{address}</p>
            <p className="text-xs text-gray-500 mt-1">
              Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Privacy Notice</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your exact address is only shared with confirmed renters</li>
          <li>• Public listings show approximate location only</li>
          <li>• You can adjust the pin location for privacy</li>
        </ul>
      </div>
    </div>
  )
}