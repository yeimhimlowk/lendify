'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Creates a singleton Supabase client for browser-side operations.
 * This client handles authentication state, cookies, and session management automatically.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Return existing client if already created (singleton pattern)
  if (client) {
    return client
  }

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Create new client instance
  client = createBrowserClient<Database>(supabaseUrl, supabaseKey)
  
  return client
}

/**
 * Get the singleton Supabase client instance.
 * Creates a new client if one doesn't exist.
 */
export function getSupabaseClient() {
  return createClient()
}

// Export for backward compatibility
export { createClient as createBrowserClient }