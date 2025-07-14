// Server-side exports
export { 
  createServerSupabaseClient, 
  createClient as createServerClient,
  createAdminClient 
} from './server'

// Client-side exports  
export { 
  createClient as createBrowserClient,
  getSupabaseClient 
} from './client'

// Middleware exports
export { 
  createMiddlewareSupabaseClient,
  createAuthenticationGuard 
} from './middleware'

// Type exports
export type * from './types'