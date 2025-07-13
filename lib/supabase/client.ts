import { createBrowserClient } from '@supabase/ssr'
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
    `Missing Supabase environment variables: ${missingVars.join(', ')}. Please ensure they are set in your .env.local file. See .env.example for reference.`
  )
}

// Log environment variables (masked for security)
console.log('Supabase client initialization:', {
  url: supabaseUrl,
  anonKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 10)}...` : 'missing',
  urlValid: supabaseUrl && supabaseUrl.startsWith('https://'),
  keyLength: supabaseAnonKey?.length || 0
})

export function createClient() {
  try {
    // Validate URL format
    if (!supabaseUrl.startsWith('https://')) {
      throw new Error(`Invalid Supabase URL format. URL must start with https://. Got: ${supabaseUrl}`)
    }
    
    // Validate anon key format (basic check)
    if (supabaseAnonKey.length < 30) {
      throw new Error(`Invalid Supabase anon key format. Key seems too short (${supabaseAnonKey.length} chars)`)
    }
    
    const client = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
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
        global: {
          headers: {
            'x-client-info': 'lendify-web-client',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    )
    
    console.log('Supabase client created successfully')
    return client
  } catch (error) {
    console.error('Failed to create Supabase client:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      supabaseUrl,
      anonKeyLength: supabaseAnonKey?.length || 0
    })
    throw new Error(
      `Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your environment variables and ensure they are valid.`
    )
  }
}