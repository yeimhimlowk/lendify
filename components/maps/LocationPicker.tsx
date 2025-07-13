'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Map, Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Set Mapbox access token
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
}

interface LocationPickerProps {
  location: { lat: number; lng: number }
  onLocationChange: (location: { lat: number; lng: number }) => void
  address?: string
  onAddressChange?: (address: string) => void
  className?: string
}

interface SearchResult {
  id: string
  place_name: string
  center: [number, number]
  text: string
}

export function LocationPicker({
  location,
  onLocationChange,
  address,
  onAddressChange,
  className
}: LocationPickerProps) {
  // Use a more neutral default location (London) if no location is provided
  const [viewState, setViewState] = useState({
    longitude: location.lng || 0,
    latitude: location.lat || 51.5074,
    zoom: 14
  })
  const [searchQuery, setSearchQuery] = useState(address || '')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [markerPosition, setMarkerPosition] = useState({
    longitude: location.lng || 0,
    latitude: location.lat || 51.5074
  })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mapRef = useRef<any>(null)

  // Reverse geocoding
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=address&limit=1`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const address = data.features[0].place_name
          setSearchQuery(address)
          if (onAddressChange) {
            onAddressChange(address)
          }
        }
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
    }
  }, [onAddressChange])

  // Get user's location on mount
  useEffect(() => {
    if (!isInitialized && !location.lat && !location.lng) {
      // Try browser geolocation first
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation({ lat: latitude, lng: longitude })
            setViewState({
              latitude,
              longitude,
              zoom: 14
            })
            setMarkerPosition({ latitude, longitude })
            onLocationChange({ lat: latitude, lng: longitude })
            reverseGeocode(latitude, longitude)
            setIsInitialized(true)
          },
          async (error) => {
            console.warn('Geolocation failed:', error)
            // Fallback to IP-based location
            try {
              const response = await fetch('https://ipapi.co/json/')
              const data = await response.json()
              if (data.latitude && data.longitude) {
                const lat = data.latitude
                const lng = data.longitude
                setUserLocation({ lat, lng })
                setViewState({
                  latitude: lat,
                  longitude: lng,
                  zoom: 12
                })
                setMarkerPosition({ latitude: lat, longitude: lng })
                onLocationChange({ lat, lng })
                reverseGeocode(lat, lng)
              }
            } catch (ipError) {
              console.error('IP geolocation failed:', ipError)
            }
            setIsInitialized(true)
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        )
      } else {
        // Browser doesn't support geolocation, try IP-based
        fetch('https://ipapi.co/json/')
          .then(response => response.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              const lat = data.latitude
              const lng = data.longitude
              setUserLocation({ lat, lng })
              setViewState({
                latitude: lat,
                longitude: lng,
                zoom: 12
              })
              setMarkerPosition({ latitude: lat, longitude: lng })
              onLocationChange({ lat, lng })
              reverseGeocode(lat, lng)
            }
          })
          .catch(error => console.error('IP geolocation failed:', error))
          .finally(() => setIsInitialized(true))
      }
    } else {
      setIsInitialized(true)
    }
  }, [location.lat, location.lng, onLocationChange, reverseGeocode, isInitialized])

  // Update marker when location prop changes
  useEffect(() => {
    if (location.lat && location.lng) {
      setMarkerPosition({
        latitude: location.lat,
        longitude: location.lng
      })
      setViewState(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng
      }))
    }
  }, [location])

  // Geocoding search
  const searchLocation = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Build URL with proximity bias based on current location
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&` +
        `types=address,poi&limit=5`
      
      // Add proximity parameter if we have a user location or current marker position
      const currentLat = userLocation?.lat || markerPosition.latitude
      const currentLng = userLocation?.lng || markerPosition.longitude
      
      // Only add proximity if we have valid coordinates that aren't the default
      if (currentLat && currentLng && (currentLat !== 51.5074 || currentLng !== 0)) {
        url += `&proximity=${currentLng},${currentLat}`
      }
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.features || [])
        setShowResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [userLocation, markerPosition])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery !== address) {
        searchLocation(searchQuery)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, address, searchLocation])

  // Handle search result selection
  const handleSelectResult = (result: SearchResult) => {
    const [lng, lat] = result.center
    
    setMarkerPosition({ latitude: lat, longitude: lng })
    setViewState(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      zoom: 16
    }))
    
    onLocationChange({ lat, lng })
    if (onAddressChange) {
      onAddressChange(result.place_name)
    }
    
    setSearchQuery(result.place_name)
    setShowResults(false)
    setSearchResults([])
  }

  // Handle map click
  const handleMapClick = useCallback((event: any) => {
    const { lng, lat } = event.lngLat
    setMarkerPosition({ latitude: lat, longitude: lng })
    onLocationChange({ lat, lng })
    
    // Reverse geocode to get address
    reverseGeocode(lat, lng)
  }, [onLocationChange, reverseGeocode])


  // Handle marker drag
  const handleMarkerDrag = useCallback((event: any) => {
    const { lng, lat } = event.lngLat
    setMarkerPosition({ latitude: lat, longitude: lng })
  }, [])

  const handleMarkerDragEnd = useCallback((event: any) => {
    const { lng, lat } = event.lngLat
    onLocationChange({ lat, lng })
    reverseGeocode(lat, lng)
  }, [onLocationChange, reverseGeocode])

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 max-w-md">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(true)}
              className="pl-10 pr-10 bg-white shadow-sm"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleSelectResult(result)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.text}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {result.place_name}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          style={{ width: '100%', height: '400px' }}
          mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          interactive={true}
          attributionControl={false}
        >
          {/* Controls */}
          <NavigationControl position="bottom-right" />
          <GeolocateControl
            position="bottom-right"
            trackUserLocation={false}
            showUserHeading={false}
            onGeolocate={(e) => {
              const { latitude, longitude } = e.coords
              setUserLocation({ lat: latitude, lng: longitude })
              setMarkerPosition({ latitude, longitude })
              setViewState(prev => ({ ...prev, latitude, longitude, zoom: 16 }))
              onLocationChange({ lat: latitude, lng: longitude })
              reverseGeocode(latitude, longitude)
            }}
          />

          {/* Marker */}
          <Marker
            longitude={markerPosition.longitude}
            latitude={markerPosition.latitude}
            draggable
            onDrag={handleMarkerDrag}
            onDragEnd={handleMarkerDragEnd}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-primary text-white p-2 rounded-full shadow-lg">
                <MapPin className="h-5 w-5" />
              </div>
            </motion.div>
          </Marker>
        </Map>
      </Card>

      {/* Instructions */}
      <div className="mt-3 text-center text-sm text-gray-500">
        Click on the map or drag the pin to set your location
      </div>
    </div>
  )
}