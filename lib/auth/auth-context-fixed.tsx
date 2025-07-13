'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/types'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  profile: Tables<'profiles'> | null
  loading: boolean
  error: string | null
  isEmailVerified: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  resendVerificationEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const router = useRouter()
  
  // Use a ref to store the client to avoid recreating it
  const supabaseClientRef = useRef<ReturnType<typeof createClient> | null>(null)
  
  // Initialize client once
  if (!supabaseClientRef.current) {
    try {
      supabaseClientRef.current = createClient()
      console.log('AuthProvider: Supabase client initialized successfully')
    } catch (err) {
      console.error('AuthProvider: Failed to initialize Supabase client:', err)
    }
  }
  
  const supabase = supabaseClientRef.current

  // Stable fetchProfile function - not recreated on every render
  const fetchProfile = async (userId: string) => {
    if (!supabase) {
      console.error('fetchProfile: Supabase client not initialized')
      return null
    }
    
    console.log('fetchProfile: Starting profile fetch for user:', userId)
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout after 10 seconds')), 10000)
        )
      ])

      console.log('fetchProfile: Query result:', {
        hasData: !!data,
        hasError: !!error,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : null
      })

      if (error) {
        console.error('fetchProfile: Supabase error:', error)
        throw error
      }
      
      setProfile(data)
      console.log('fetchProfile: Profile set successfully')
      return data
    } catch (err) {
      console.error('fetchProfile: Caught error:', {
        error: err,
        errorType: err?.constructor?.name,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        userId
      })
      setProfile(null)
      return null
    }
  }

  // Initialize auth state - simplified with no circular dependencies
  useEffect(() => {
    if (!supabase) {
      setError('Failed to initialize authentication service')
      setLoading(false)
      return
    }

    let mounted = true
    
    const initAuth = async () => {
      console.log('initAuth: Starting auth initialization')
      try {
        console.log('initAuth: Getting session from Supabase')
        
        const { data: { session }, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Session fetch timeout after 15 seconds')), 15000)
          )
        ])
        
        if (!mounted) return
        
        console.log('initAuth: Session result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          sessionError: sessionError ? {
            message: sessionError.message,
            code: sessionError.code
          } : null
        })
        
        if (sessionError) {
          console.error('initAuth: Session error:', sessionError)
          throw sessionError
        }
        
        if (session?.user) {
          console.log('initAuth: User found, setting user state')
          setUser(session.user)
          setIsEmailVerified(session.user.email_confirmed_at !== null)
          // Fetch profile without waiting for it to complete the loading state
          fetchProfile(session.user.id).catch(err => {
            console.error('initAuth: Profile fetch failed but continuing:', err)
          })
        } else {
          console.log('initAuth: No active session found')
        }
      } catch (err) {
        if (!mounted) return
        console.error('initAuth: Error initializing auth:', {
          error: err,
          errorType: err?.constructor?.name,
          errorMessage: err instanceof Error ? err.message : 'Unknown error'
        })
        setError(err instanceof Error ? err.message : 'Failed to initialize authentication')
      } finally {
        if (mounted) {
          console.log('initAuth: Initialization complete, setting loading to false')
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth state changes
    console.log('initAuth: Setting up auth state change listener')
    const { data: { subscription }, error: subscriptionError } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('onAuthStateChange:', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id
        })
        
        try {
          if (session?.user) {
            setUser(session.user)
            setIsEmailVerified(session.user.email_confirmed_at !== null)
            // Fetch profile asynchronously
            fetchProfile(session.user.id).catch(err => {
              console.error('onAuthStateChange: Profile fetch failed:', err)
            })
          } else {
            setUser(null)
            setProfile(null)
            setIsEmailVerified(false)
          }
          
          if (event === 'SIGNED_IN' && session?.user) {
            // Check for OAuth redirect path
            const oauthRedirectPath = sessionStorage.getItem('oauthRedirectPath')
            if (oauthRedirectPath) {
              sessionStorage.removeItem('oauthRedirectPath')
              router.push(oauthRedirectPath)
            }
          }
          
          if (event === 'SIGNED_OUT') {
            router.push('/')
          }
        } catch (err) {
          console.error('onAuthStateChange: Error handling auth state change:', {
            error: err,
            event,
            userId: session?.user?.id
          })
        }
      }
    )
    
    if (subscriptionError) {
      console.error('initAuth: Error setting up auth state listener:', subscriptionError)
    } else {
      console.log('initAuth: Auth state listener set up successfully')
    }

    return () => {
      mounted = false
      if (subscription) {
        console.log('Cleanup: Unsubscribing from auth state changes')
        subscription.unsubscribe()
      }
    }
  }, [router]) // Only depend on router, not on client or fetchProfile

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        await fetchProfile(data.user.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      // Safely get the redirect URL
      let emailRedirectTo
      try {
        emailRedirectTo = `${window.location.origin}/auth/confirm`
      } catch (err) {
        console.error('signUp: Error getting window.location.origin:', err)
        emailRedirectTo = '/auth/confirm' // Fallback to relative URL
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      })

      if (error) throw error

      // Create profile after successful signup
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName || null,
          })

        if (profileError) {
          console.error('Error creating profile:', profileError)
          // Don't throw here, user is created but profile failed
        } else {
          await fetchProfile(data.user.id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign out')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      // Safely get the redirect URL
      let redirectTo
      try {
        redirectTo = `${window.location.origin}/reset-password`
      } catch (err) {
        console.error('resetPassword: Error getting window.location.origin:', err)
        redirectTo = '/reset-password' // Fallback to relative URL
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during password reset')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update password
  const updatePassword = async (newPassword: string) => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during password update')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Refresh session
  const refreshSession = async () => {
    if (!supabase) {
      console.error('Authentication service not initialized')
      return
    }
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
    } catch (err) {
      console.error('Error refreshing session:', err)
      // Don't throw here, just log the error
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      // Safely get the redirect URL
      let redirectTo
      try {
        redirectTo = `${window.location.origin}/auth/callback`
      } catch (err) {
        console.error('signInWithGoogle: Error getting window.location.origin:', err)
        redirectTo = '/auth/callback' // Fallback to relative URL
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during Google sign in')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign in with GitHub
  const signInWithGitHub = async () => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      // Safely get the redirect URL
      let redirectTo
      try {
        redirectTo = `${window.location.origin}/auth/callback`
      } catch (err) {
        console.error('signInWithGitHub: Error getting window.location.origin:', err)
        redirectTo = '/auth/callback' // Fallback to relative URL
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during GitHub sign in')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Resend verification email
  const resendVerificationEmail = async () => {
    if (!supabase) {
      throw new Error('Authentication service not initialized')
    }
    try {
      setError(null)
      setLoading(true)

      if (!user?.email) {
        throw new Error('No user email found')
      }

      // Safely get the redirect URL
      let emailRedirectTo
      try {
        emailRedirectTo = `${window.location.origin}/auth/confirm`
      } catch (err) {
        console.error('resendVerificationEmail: Error getting window.location.origin:', err)
        emailRedirectTo = '/auth/confirm' // Fallback to relative URL
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while resending verification email')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    isEmailVerified,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    signInWithGoogle,
    signInWithGitHub,
    resendVerificationEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}