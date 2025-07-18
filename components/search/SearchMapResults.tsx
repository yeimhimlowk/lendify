'use client'

import { useState, useEffect, useRef } from 'react'
import { Map, Marker, NavigationControl, Popup, Source, Layer } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Grid, Map as MapIcon, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import SearchResults from './SearchResults'
import type { Listing } from './SearchResults'

// Mapbox configuration
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/mapbox/light-v11'

if (typeof window !== 'undefined' && mapboxToken) {
  mapboxgl.accessToken = mapboxToken
}

interface SearchMapResultsProps {
  listings: Listing[]
  isLoading: boolean
  totalCount?: number
  searchLocation?: {
    lat: number
    lng: number
    radius?: number
  }
  className?: string
}

interface ListingWithLocation extends Listing {
  location?: {
    lat: number
    lng: number
  }
}

export default function SearchMapResults({
  listings,
  isLoading,
  totalCount,
  searchLocation,
  className,
}: SearchMapResultsProps) {
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map')
  const [selectedListing, setSelectedListing] = useState<ListingWithLocation | null>(null)
  const [viewState, setViewState] = useState({
    longitude: searchLocation?.lng || 103.8198,
    latitude: searchLocation?.lat || 1.3521,
    zoom: searchLocation ? 12 : 11
  })
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  // Filter listings that have location data
  const listingsWithLocation: ListingWithLocation[] = (listings as any)
    .map((listing: any) => {
      // Try to extract coordinates from location data
      const location = extractLocationFromListing(listing)
      return { ...listing, location }
    })
    .filter((listing: any) => listing.location)

  // Center map on listings when they change
  useEffect(() => {
    if (listingsWithLocation.length > 0 && mapRef.current) {
      const bounds = new mapboxgl.LngLatBounds()
      
      listingsWithLocation.forEach(listing => {
        if (listing.location) {
          bounds.extend([listing.location.lng, listing.location.lat])
        }
      })

      // Add search location to bounds if available
      if (searchLocation) {
        bounds.extend([searchLocation.lng, searchLocation.lat])
      }

      // Only fit bounds if we have multiple points
      if (listingsWithLocation.length > 1) {
        mapRef.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [listingsWithLocation, searchLocation])

  // Handle map click to close popup
  const handleMapClick = () => {
    setSelectedListing(null)
  }

  // Handle marker click
  const handleMarkerClick = (listing: ListingWithLocation) => {
    setSelectedListing(listing)
    if (listing.location) {
      setViewState(prev => ({
        ...prev,
        longitude: listing.location!.lng,
        latitude: listing.location!.lat,
        zoom: Math.max(prev.zoom, 14)
      }))
    }
  }

  // Render search radius if provided
  const renderSearchRadius = () => {
    if (!searchLocation?.radius) return null

    // Create a circle polygon for the search radius
    const createCircle = (center: [number, number], radiusKm: number, points: number = 64) => {
      const coords = []
      const earthRadius = 6371 // Earth's radius in km
      
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI
        const lat = center[1] + (radiusKm / earthRadius) * (180 / Math.PI) * Math.cos(angle)
        const lng = center[0] + (radiusKm / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(center[1] * Math.PI / 180)
        coords.push([lng, lat])
      }
      coords.push(coords[0]) // Close the polygon
      
      return coords
    }

    const circleCoords = createCircle([searchLocation.lng, searchLocation.lat], searchLocation.radius)
    const radiusGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [circleCoords]
          },
          properties: {}
        }
      ]
    }

    return (
      <Source id="search-radius" type="geojson" data={radiusGeoJSON as any}>
        <Layer
          id="search-radius-fill"
          type="fill"
          paint={{
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1
          }}
        />
        <Layer
          id="search-radius-line"
          type="line"
          paint={{
            'line-color': '#3b82f6',
            'line-opacity': 0.5,
            'line-width': 2
          }}
        />
      </Source>
    )
  }

  if (!mapboxToken) {
    return (
      <div className={className}>
        <SearchResults
          listings={listings}
          isLoading={isLoading}
          totalCount={totalCount}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="gap-2"
          >
            <Grid className="h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="gap-2"
          >
            <MapIcon className="h-4 w-4" />
            Map
          </Button>
        </div>
        
        {/* Results count */}
        {!isLoading && totalCount !== undefined && (
          <p className="text-sm text-muted-foreground">
            {totalCount === 0
              ? "No results found"
              : totalCount === 1
              ? "1 result found"
              : `${totalCount} results found`}
          </p>
        )}
      </div>

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="h-[600px] rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-6">
          <Map
            ref={mapRef as any}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onLoad={() => setMapLoaded(true)}
            onClick={handleMapClick}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapboxStyle}
            interactive={true}
            attributionControl={false}
          >
            <NavigationControl position="bottom-right" showCompass={false} />
            
            {/* Search radius visualization */}
            {renderSearchRadius()}
            
            {/* Search center marker */}
            {searchLocation && (
              <Marker
                longitude={searchLocation.lng}
                latitude={searchLocation.lat}
                anchor="bottom"
              >
                <div className="relative">
                  <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                </div>
              </Marker>
            )}
            
            {/* Listing markers */}
            {listingsWithLocation.map((listing) => (
              <Marker
                key={listing.id}
                longitude={listing.location!.lng}
                latitude={listing.location!.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  handleMarkerClick(listing)
                }}
              >
                <div className="relative cursor-pointer">
                  <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-white rounded-full px-1 py-0.5 text-xs font-semibold text-gray-900 shadow-sm border">
                    ${listing.price_per_day}
                  </div>
                </div>
              </Marker>
            ))}

            {/* Selected listing popup */}
            {selectedListing && selectedListing.location && (
              <Popup
                longitude={selectedListing.location.lng}
                latitude={selectedListing.location.lat}
                anchor="top"
                onClose={() => setSelectedListing(null)}
                closeButton={true}
                closeOnClick={false}
                maxWidth="300px"
              >
                <div className="p-3">
                  {/* Listing image */}
                  {selectedListing.photos && selectedListing.photos.length > 0 && (
                    <div className="mb-3">
                      <Image
                        src={selectedListing.photos[0]}
                        alt={selectedListing.title}
                        width={300}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  {/* Listing details */}
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {selectedListing.title}
                  </h3>
                  
                  {selectedListing.address && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                      {selectedListing.address}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-green-600">
                      ${selectedListing.price_per_day}/day
                    </div>
                    {selectedListing.rating && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm font-medium">{selectedListing.rating}</span>
                        {selectedListing.rating_count && (
                          <span className="text-xs text-gray-500">({selectedListing.rating_count})</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => window.open(`/listings/${selectedListing.id}`, '_blank')}
                    size="sm"
                    className="w-full text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </div>
              </Popup>
            )}
          </Map>

          {/* Loading overlay */}
          {!mapLoaded && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <SearchResults
          listings={listings}
          isLoading={isLoading}
          totalCount={totalCount}
        />
      )}
    </div>
  )
}

// Helper function to extract location from listing
function extractLocationFromListing(listing: Listing): { lat: number, lng: number } | null {
  const location = (listing as any).location
  if (!location) return null
  
  try {
    // If location has lat/lng properties directly (from our API)
    if (location.lat !== undefined && location.lng !== undefined) {
      return { lat: location.lat, lng: location.lng }
    }
    
    // If location is GeoJSON format
    if (typeof location === 'object' && location.type === 'Point' && location.coordinates) {
      const [lng, lat] = location.coordinates
      return { lat, lng }
    }
    
    // If location is already an object with coordinates
    if (typeof location === 'object' && location.coordinates) {
      const [lng, lat] = location.coordinates
      return { lat, lng }
    }
    
    // If location is a string in WKT format like "POINT(-122.4194 37.7749)"
    if (typeof location === 'string' && location.startsWith('POINT')) {
      const match = location.match(/POINT\(([^)]+)\)/)
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number)
        return { lat, lng }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting location from listing:', error)
    return null
  }
}