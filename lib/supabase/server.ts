import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment. See .env.example for reference.'
  )
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  try {
    return createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
        global: {
          headers: {
            'x-client-info': 'lendify-server-client',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        },
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          autoRefreshToken: true,
          storageKey: 'lendify-auth-token',
          flowType: 'pkce',
        },
        db: {
          schema: 'public',
        },
      }
    )
  } catch (error) {
    console.error('Failed to create server Supabase client:', error)
    throw new Error(
      'Failed to initialize Supabase client. Please check your environment variables and ensure they are valid.'
    )
  }
}

// Alias for consistency with client-side naming
export const createClient = createServerSupabaseClient