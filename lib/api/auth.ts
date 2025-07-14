import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

export interface AuthenticatedUser extends User {
  profile?: Profile
}

/**
 * Middleware function to require authentication for API routes.
 * Throws an error if user is not authenticated.
 * 
 * @param request - The Next.js request object
 * @returns The authenticated user
 * @throws Error if authentication fails
 */
export async function requireAuth(_request: NextRequest): Promise<AuthenticatedUser> {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`)
  }
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user as AuthenticatedUser
}

/**
 * Middleware function to get the current user without requiring authentication.
 * Returns null if user is not authenticated.
 * 
 * @param request - The Next.js request object
 * @returns The authenticated user or null
 */
export async function getCurrentUser(_request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user as AuthenticatedUser
  } catch {
    return null
  }
}

/**
 * Middleware function to require authentication and fetch user profile.
 * 
 * @param request - The Next.js request object
 * @returns The authenticated user with profile
 * @throws Error if authentication fails or profile not found
 */
export async function requireAuthWithProfile(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request)
  const supabase = await createServerSupabaseClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`)
  }
  
  if (!profile) {
    throw new Error('User profile not found')
  }
  
  return {
    ...user,
    profile
  } as AuthenticatedUser
}

/**
 * Check if a user has admin privileges.
 * For now, this is a placeholder - implement based on your admin logic.
 * 
 * @param user - The authenticated user
 * @returns Whether the user is an admin
 */
export function isAdmin(_user: AuthenticatedUser): boolean {
  // TODO: Implement admin check based on your requirements
  // This could check a role field in the user metadata or profile
  return false
}

/**
 * Require admin authentication for API routes.
 * 
 * @param request - The Next.js request object
 * @returns The authenticated admin user
 * @throws Error if authentication fails or user is not admin
 */
export async function requireAdminAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuthWithProfile(request)
  
  if (!isAdmin(user)) {
    throw new Error('Admin privileges required')
  }
  
  return user
}

/**
 * Extract authorization token from request headers.
 * 
 * @param request - The Next.js request object
 * @returns The authorization token or null
 */
export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return null
  }
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  return authHeader
}

/**
 * Get user ID from authenticated user or throw error.
 * 
 * @param request - The Next.js request object
 * @returns The user ID
 * @throws Error if user is not authenticated
 */
export async function getUserId(request: NextRequest): Promise<string> {
  const user = await requireAuth(request)
  return user.id
}

/**
 * Alias for requireAuth for backwards compatibility.
 */
export const authenticateRequest = requireAuth

/**
 * Check if the authenticated user owns a resource.
 * 
 * @param request - The Next.js request object
 * @param resourceOwnerId - The ID of the resource owner
 * @returns Whether the user owns the resource
 * @throws Error if user is not authenticated
 */
export async function checkOwnership(request: NextRequest, resourceOwnerId: string): Promise<boolean> {
  const user = await requireAuth(request)
  return user.id === resourceOwnerId
}