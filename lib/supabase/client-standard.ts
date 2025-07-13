// Alternative client using standard @supabase/supabase-js instead of SSR
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  console.error('Missing environment variables:', missingVars)
  throw new Error(
    `Missing Supabase environment variables: ${missingVars.join(', ')}. Please ensure they are set in your .env.local file.`
  )
}

export function createStandardClient() {
  try {
    // Validate URL format
    if (!supabaseUrl.startsWith('https://')) {
      throw new Error(`Invalid Supabase URL format. URL must start with https://. Got: ${supabaseUrl}`)
    }
    
    // Create client using standard method
    const client = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          autoRefreshToken: true,
          storageKey: 'lendify-auth-token',
        },
        db: {
          schema: 'public',
        },
      }
    )
    
    console.log('Standard Supabase client created successfully')
    return client
  } catch (error) {
    console.error('Failed to create standard Supabase client:', error)
    throw error
  }
}