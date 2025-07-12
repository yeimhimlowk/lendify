'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from './auth-context'

/**
 * Hook to access the auth context
 * @returns The auth context with user, profile, loading state, and auth methods
 */
export function useAuth() {
  const context = useAuthContext()
  return context
}

/**
 * Hook to get the current user with profile data
 * @returns Object containing user, profile, and loading state
 */
export function useUser() {
  const { user, profile, loading } = useAuthContext()
  
  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
  }
}

/**
 * Hook that redirects to login page if user is not authenticated
 * @param redirectTo - Optional path to redirect to after login (default: current path)
 * @returns Object containing user, profile, and loading state
 */
export function useRequireAuth(redirectTo?: string) {
  const router = useRouter()
  const { user, profile, loading } = useAuthContext()
  
  useEffect(() => {
    if (!loading && !user) {
      // Store the intended destination in sessionStorage for post-login redirect
      if (redirectTo || window.location.pathname !== '/') {
        sessionStorage.setItem(
          'redirectAfterLogin', 
          redirectTo || window.location.pathname
        )
      }
      
      router.push('/login')
    }
  }, [user, loading, router, redirectTo])
  
  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
  }
}

/**
 * Hook to check if user has a complete profile
 * @returns Object indicating if profile is complete and what fields are missing
 */
export function useProfileComplete() {
  const { profile, loading } = useAuthContext()
  
  const requiredFields = ['full_name', 'phone', 'address'] as const
  const missingFields = requiredFields.filter(field => !profile?.[field])
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    loading,
    profile,
  }
}

/**
 * Hook to handle post-login redirect
 * @returns Function to handle redirect after successful login
 */
export function usePostLoginRedirect() {
  const router = useRouter()
  
  const handleRedirect = () => {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin')
    if (redirectPath) {
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectPath)
    } else {
      router.push('/dashboard')
    }
  }
  
  return handleRedirect
}