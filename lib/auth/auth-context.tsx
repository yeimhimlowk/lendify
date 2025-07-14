'use client'

import React, { createContext, useContext, useEffect, useReducer } from 'react'
import type { User, AuthError, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

// Auth state type
interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  error: string | null
  isAuthenticated: boolean
  isInitialized: boolean
}

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PROFILE'; payload: Profile | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET_STATE' }

// Auth context type
interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
}

// Initial state
const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  error: null,
  isAuthenticated: false,
  isInitialized: false
}

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_PROFILE_LOADING':
      return { ...state, profileLoading: action.payload }
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        error: null
      }
    case 'SET_PROFILE':
      return { ...state, profile: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload, loading: false }
    case 'RESET_STATE':
      return { 
        ...initialState, 
        loading: false, 
        isInitialized: true 
      }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const supabase = createClient()

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      dispatch({ type: 'SET_PROFILE_LOADING', payload: true })
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist - this is ok for new users
          return null
        }
        console.error('Error fetching profile:', error)
        dispatch({ type: 'SET_ERROR', payload: `Failed to fetch profile: ${error.message}` })
        return null
      }

      return profile
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user profile' })
      return null
    } finally {
      dispatch({ type: 'SET_PROFILE_LOADING', payload: false })
    }
  }

  // Create profile for new user
  const createProfile = async (user: User): Promise<Profile | null> => {
    try {
      const profileData: Partial<Profile> = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        verified: user.email_confirmed_at ? true : false
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        dispatch({ type: 'SET_ERROR', payload: `Failed to create profile: ${error.message}` })
        return null
      }

      return profile
    } catch (err) {
      console.error('Unexpected error creating profile:', err)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create user profile' })
      return null
    }
  }

  // Handle auth state changes
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('Auth state changed:', event, session?.user?.id)
    
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    if (session?.user) {
      dispatch({ type: 'SET_USER', payload: session.user })
      
      // Fetch or create profile
      let profile = await fetchProfile(session.user.id)
      
      // If profile doesn't exist and user just signed up, create it
      if (!profile && event === 'SIGNED_IN') {
        profile = await createProfile(session.user)
      }
      
      dispatch({ type: 'SET_PROFILE', payload: profile })
    } else {
      dispatch({ type: 'SET_USER', payload: null })
      dispatch({ type: 'SET_PROFILE', payload: null })
    }

    dispatch({ type: 'SET_LOADING', payload: false })
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          dispatch({ type: 'SET_ERROR', payload: error.message })
        } else if (session?.user && mounted) {
          dispatch({ type: 'SET_USER', payload: session.user })
          const profile = await fetchProfile(session.user.id)
          if (mounted) {
            dispatch({ type: 'SET_PROFILE', payload: profile })
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' })
        }
      } finally {
        if (mounted) {
          dispatch({ type: 'SET_INITIALIZED', payload: true })
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // Auth methods
  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {}
      }
    })

    dispatch({ type: 'SET_LOADING', payload: false })
    
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    dispatch({ type: 'SET_LOADING', payload: false })

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }

    return { error }
  }

  const signOut = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    const { error } = await supabase.auth.signOut()

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      dispatch({ type: 'SET_LOADING', payload: false })
    } else {
      dispatch({ type: 'RESET_STATE' })
    }

    return { error }
  }

  const resetPassword = async (email: string) => {
    dispatch({ type: 'SET_ERROR', payload: null })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }

    return { error }
  }

  const updatePassword = async (password: string) => {
    dispatch({ type: 'SET_ERROR', payload: null })

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }

    return { error }
  }

  const refreshProfile = async () => {
    if (!state.user) return
    
    const profile = await fetchProfile(state.user.id)
    dispatch({ type: 'SET_PROFILE', payload: profile })
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.user) {
      return { error: new Error('No authenticated user') }
    }

    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .single()

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
        return { error: new Error(error.message) }
      }

      dispatch({ type: 'SET_PROFILE', payload: profile })
      return { error: null }
    } catch (err) {
      const error = new Error('Failed to update profile')
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { error }
    }
  }

  const contextValue: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    updateProfile
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Export context for advanced usage
export { AuthContext }