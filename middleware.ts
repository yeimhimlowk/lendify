import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip auth checks for debug pages and API routes during development
  if (request.nextUrl.pathname.startsWith('/debug-auth') || 
      request.nextUrl.pathname.startsWith('/simple-auth-test') ||
      request.nextUrl.pathname.startsWith('/final-auth-test') ||
      request.nextUrl.pathname.startsWith('/test-auth') ||
      request.nextUrl.pathname.startsWith('/network-test') ||
      request.nextUrl.pathname.startsWith('/api/debug')) {
    return NextResponse.next()
  }

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware')
    // Return early without authentication checks if Supabase is not configured
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          autoRefreshToken: true,
        },
        db: {
          schema: 'public',
        },
      }
    )

    // Add timeout to getUser call to prevent hanging
    const getUserWithTimeout = () => {
      return Promise.race([
        supabase.auth.getUser(),
        new Promise<{ data: { user: null }, error: any }>((_, reject) => 
          setTimeout(() => reject(new Error('Middleware auth timeout after 5 seconds')), 5000)
        )
      ])
    }

    // Refresh session if expired
    const { data: { user }, error } = await getUserWithTimeout()
    
    if (error) {
      console.error('Middleware auth error:', error)
      // If auth fails, allow request to proceed but log the error
      return NextResponse.next({
        request,
      })
    }

    // Protect routes that require authentication
    const protectedRoutes = ['/dashboard', '/bookings', '/messages', '/host']
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
    
    if (isProtectedRoute && !user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      pathname: request.nextUrl.pathname
    })
    // If there's an error with Supabase, allow the request to proceed
    // but log the error for debugging
    return NextResponse.next({
      request,
    })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}