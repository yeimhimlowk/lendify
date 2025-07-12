'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
  const supabase = createClient()

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          setIsEmailVerified(session.user.email_confirmed_at !== null)
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsEmailVerified(session.user.email_confirmed_at !== null)
          await fetchProfile(session.user.id)
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
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, router])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
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
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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
    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
    try {
      setError(null)
      setLoading(true)

      if (!user?.email) {
        throw new Error('No user email found')
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
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