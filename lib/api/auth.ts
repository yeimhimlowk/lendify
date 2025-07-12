import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type User = Database['public']['Tables']['profiles']['Row']

/**
 * Authentication result containing user data or error
 */
export interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Authenticates a request and returns user data
 * @param _request - The Next.js request object (prefixed with _ as it might be used in future)
 * @returns Promise<AuthResult> - Authentication result
 */
export async function authenticateRequest(_request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return {
        user: null,
        error: 'Authentication required'
      }
    }

    // Get full user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      return {
        user: null,
        error: 'User profile not found'
      }
    }

    return {
      user: profile,
      error: null
    }
  } catch (_error) {
    return {
      user: null,
      error: 'Authentication failed'
    }
  }
}

/**
 * Middleware function to require authentication
 * @param _request - The Next.js request object (prefixed with _ as it might be used in future)
 * @returns Promise<User> - Authenticated user or throws error
 */
export async function requireAuth(_request: NextRequest): Promise<User> {
  const { user, error } = await authenticateRequest(_request)
  
  if (error || !user) {
    throw new Error(error || 'Authentication required')
  }
  
  return user
}

/**
 * Check if user owns a resource
 * @param userId - User ID to check
 * @param resourceOwnerId - Resource owner ID
 * @returns boolean - True if user owns the resource
 */
export function checkOwnership(userId: string, resourceOwnerId: string): boolean {
  return userId === resourceOwnerId
}