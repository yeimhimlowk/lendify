'use client'

import { useState, useEffect } from 'react'
import { Map, Marker, NavigationControl, Popup } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, ExternalLink, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Validate Mapbox environment variables
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE

// Set Mapbox access token
if (typeof window !== 'undefined') {
  if (!mapboxToken) {
    console.error('Missing Mapbox token. Please ensure NEXT_PUBLIC_MAPBOX_TOKEN is set in your environment variables.')
  } else {
    mapboxgl.accessToken = mapboxToken
  }
}

interface ListingMapProps {
  latitude: number
  longitude: number
  address?: string
  title: string
  className?: string
  height?: string
}

export function ListingMap({
  latitude,
  longitude,
  address,
  title,
  className,
  height = '400px'
}: ListingMapProps) {
  // Validate coordinates
  const isValidCoordinates = () => {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    )
  }

  const [viewState, setViewState] = useState({
    longitude: isValidCoordinates() ? longitude : 0,
    latitude: isValidCoordinates() ? latitude : 0,
    zoom: 14
  })
  const [showPopup, setShowPopup] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Update view when coordinates change
  useEffect(() => {
    const isValid = (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    )
    
    if (isValid) {
      setViewState({
        longitude,
        latitude,
        zoom: 14
      })
    }
  }, [latitude, longitude])

  // Handle errors gracefully
  if (!mapboxToken || !isValidCoordinates()) {
    return (
      <div className={cn('rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center', className)} style={{ height }}>
        <div className="text-center text-gray-500">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">
            {!mapboxToken ? 'Map unavailable' : 'Invalid location data'}
          </p>
          {address && (
            <p className="text-xs text-gray-600 mt-1">{address}</p>
          )}
        </div>
      </div>
    )
  }

  const generateDirectionsUrl = () => {
    const coords = `${latitude},${longitude}`
    
    // Detect platform and use appropriate maps service
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isMac = /Mac/.test(navigator.userAgent)
    
    if (isIOS || isMac) {
      // Apple Maps
      return `maps://maps.apple.com/?daddr=${coords}&dirflg=d`
    } else {
      // Google Maps
      return `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=driving`
    }
  }

  const openDirections = () => {
    const url = generateDirectionsUrl()
    window.open(url, '_blank')
  }

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-gray-200 shadow-sm', className)} style={{ height }}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapboxStyle || 'mapbox://styles/mapbox/light-v11'}
        interactive={true}
        attributionControl={false}
      >
        {/* Navigation Controls */}
        <NavigationControl position="bottom-right" showCompass={false} />
        
        {/* Listing Marker */}
        <Marker
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          onClick={() => setShowPopup(true)}
        >
          <div className="relative">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            {/* Small pulse animation */}
            <div className="absolute inset-0 w-8 h-8 bg-[var(--primary)] rounded-full animate-ping opacity-20"></div>
          </div>
        </Marker>

        {/* Information Popup */}
        {showPopup && (
          <Popup
            longitude={longitude}
            latitude={latitude}
            anchor="top"
            onClose={() => setShowPopup(false)}
            closeButton={true}
            closeOnClick={false}
            className="listing-map-popup"
          >
            <div className="p-3 min-w-[200px]">
              <h3 className="font-semibold text-[var(--black)] text-sm mb-1 line-clamp-2">
                {title}
              </h3>
              {address && (
                <p className="text-xs text-[var(--gray-dark)] mb-3 line-clamp-2">
                  {address}
                </p>
              )}
              <Button
                onClick={openDirections}
                size="sm"
                className="w-full text-xs"
                variant="outline"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Get Directions
              </Button>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map attribution in bottom left */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white bg-opacity-75 px-2 py-1 rounded">
        © Mapbox
      </div>

      {/* External link button */}
      <div className="absolute top-3 right-3">
        <Button
          onClick={openDirections}
          size="sm"
          variant="outline"
          className="bg-white bg-opacity-90 hover:bg-opacity-100 shadow-sm"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Directions
        </Button>
      </div>
    </div>
  )
}

// Custom styles for the popup
const popupStyles = `
  .listing-map-popup .mapboxgl-popup-content {
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .listing-map-popup .mapboxgl-popup-close-button {
    font-size: 18px;
    padding: 4px;
    color: #6b7280;
  }
  
  .listing-map-popup .mapboxgl-popup-close-button:hover {
    background-color: #f3f4f6;
    color: #374151;
  }
`

// Inject custom styles
if (typeof window !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = popupStyles
  document.head.appendChild(styleElement)
}