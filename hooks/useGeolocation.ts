import { useState, useCallback } from 'react'

interface GeolocationCoordinates {
  lat: number
  lng: number
}

interface GeolocationError {
  code: number
  message: string
}

interface UseGeolocationReturn {
  coordinates: GeolocationCoordinates | null
  error: GeolocationError | null
  isLoading: boolean
  getCurrentPosition: () => Promise<GeolocationCoordinates>
}

export function useGeolocation(): UseGeolocationReturn {
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(null)
  const [error, setError] = useState<GeolocationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getCurrentPosition = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error: GeolocationError = {
          code: 0,
          message: 'Geolocation is not supported by this browser.'
        }
        setError(error)
        reject(error)
        return
      }

      setIsLoading(true)
      setError(null)

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000 // 5 minutes
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GeolocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCoordinates(coords)
          setIsLoading(false)
          resolve(coords)
        },
        (err) => {
          const error: GeolocationError = {
            code: err.code,
            message: getErrorMessage(err.code)
          }
          setError(error)
          setIsLoading(false)
          reject(error)
        },
        options
      )
    })
  }, [])

  return {
    coordinates,
    error,
    isLoading,
    getCurrentPosition
  }
}

function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Permission denied. Please allow location access to search nearby listings.'
    case 2:
      return 'Position unavailable. Unable to retrieve your location.'
    case 3:
      return 'Timeout. Location request timed out.'
    default:
      return 'An unknown error occurred while retrieving your location.'
  }
}

// Helper function to calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Helper function to format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`
  } else {
    return `${Math.round(distanceKm)}km`
  }
}