import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Creates a Supabase client for use in middleware.
 * This client is specifically configured for middleware and handles
 * cookie manipulation properly for authentication state.
 */
export async function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  return { supabase, response, user }
}

/**
 * Helper function to protect routes that require authentication.
 * Use this in middleware to redirect unauthenticated users to login.
 */
export function createAuthenticationGuard(protectedPaths: string[] = ['/dashboard', '/host']) {
  return async function authGuard(request: NextRequest) {
    const { user, response } = await createMiddlewareSupabaseClient(request)
    
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    
    if (isProtectedPath && !user) {
      // Store the current URL to redirect back after login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect_to', request.nextUrl.pathname)
      
      return NextResponse.redirect(redirectUrl)
    }
    
    return response
  }
}