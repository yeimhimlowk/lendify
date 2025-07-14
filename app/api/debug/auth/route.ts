import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function handleGET() {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Check auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    let profileData = null
    let profileError = null
    
    if (user) {
      // Try to fetch profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      profileData = data
      profileError = error
    }

    // Check database connection by attempting a simple query
    let databaseConnected = false
    let databaseError = null
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1)
      databaseConnected = !error
      databaseError = error
    } catch (err) {
      databaseError = err
    }

    return NextResponse.json({
      status: 'ok',
      auth: {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        emailVerified: user?.email_confirmed_at !== null,
        authError: authError ? {
          message: authError.message,
          code: authError.code,
        } : null,
      },
      profile: {
        hasProfile: !!profileData,
        profileError: profileError ? {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        } : null,
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      },
      database: {
        connected: databaseConnected,
        error: databaseError ? {
          message: databaseError.message || 'Unknown database error',
          code: databaseError.code,
        } : null,
      },
      recommendations: [
        !user ? 'User not authenticated. Check login flow.' : null,
        user && !profileData ? 'Profile missing. Check RLS policies and profile creation trigger.' : null,
        profileError ? `Profile fetch error: ${profileError.message}` : null,
      ].filter(Boolean),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.public(), handleGET)