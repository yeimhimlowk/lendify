'use client'

import { useFormContext } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { FormInput } from '@/components/ui/form-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { CreateListingInput } from '@/lib/api/schemas'

// Mock map component - replace with actual map library
const MapPicker = ({ 
  location, 
  onLocationChange 
}: { 
  location: { lat: number; lng: number }
  onLocationChange: (location: { lat: number; lng: number }) => void 
}) => {
  return (
    <Card className="h-96 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <p className="text-gray-600 mb-4">Map integration placeholder</p>
        <p className="text-sm text-gray-500">
          Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            // Simulate location selection
            const newLat = 37.7749 + (Math.random() - 0.5) * 0.1
            const newLng = -122.4194 + (Math.random() - 0.5) * 0.1
            onLocationChange({ lat: newLat, lng: newLng })
          }}
        >
          Simulate Location Change
        </Button>
      </div>
    </Card>
  )
}

export default function LocationStep() {
  const { register, formState: { errors }, setValue, watch } = useFormContext<CreateListingInput>()
  const [isLocating, setIsLocating] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const address = watch('address')
  const location = watch('location')

  // Mock address autocomplete
  useEffect(() => {
    if (address && address.length > 3) {
      const mockSuggestions = [
        `${address}, San Francisco, CA 94102`,
        `${address}, San Francisco, CA 94103`,
        `${address}, San Francisco, CA 94104`,
        `${address} Street, Oakland, CA 94612`,
        `${address} Avenue, Berkeley, CA 94704`
      ]
      setAddressSuggestions(mockSuggestions)
      setShowSuggestions(true)
    } else {
      setAddressSuggestions([])
      setShowSuggestions(false)
    }
  }, [address])

  const handleAddressSelect = (selectedAddress: string) => {
    setValue('address', selectedAddress)
    setShowSuggestions(false)
    
    // Mock geocoding
    const lat = 37.7749 + (Math.random() - 0.5) * 0.1
    const lng = -122.4194 + (Math.random() - 0.5) * 0.1
    setValue('location', { lat, lng })
  }

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
        {/* Address Input */}
        <div className="relative">
          <FormInput
            id="address"
            label="Address"
            placeholder="Enter your address..."
            {...register('address')}
            error={errors.address?.message}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          
          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
              {addressSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => handleAddressSelect(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

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

        {/* Map */}
        <div>
          <Label>Adjust Location on Map</Label>
          <div className="mt-2">
            <MapPicker
              location={location}
              onLocationChange={(newLocation) => setValue('location', newLocation)}
            />
          </div>
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