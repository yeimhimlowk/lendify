import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Log all parameters for debugging
  console.log('Auth callback received with params:', {
    code: code ? 'present' : 'missing',
    token_hash: token_hash ? 'present' : 'missing',
    type,
    error,
    error_description,
    allParams: Object.fromEntries(searchParams.entries())
  })

  // Handle email confirmation
  if (token_hash && type) {
    // Redirect to the confirm route for email confirmation
    return NextResponse.redirect(
      new URL(`/auth/confirm?token_hash=${token_hash}&type=${type}&next=${next}`, request.url)
    )
  }

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, request.url)
    )
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      // Exchange code for session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(sessionError.message)}`, request.url)
        )
      }

      // Get the user to ensure session is valid
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('User fetch error:', userError)
        return NextResponse.redirect(
          new URL('/login?error=Failed to authenticate', request.url)
        )
      }

      // Check if profile exists, if not create one
      const { error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          })

        if (insertError) {
          console.error('Profile creation error:', insertError)
          // Don't fail the auth flow, user can update profile later
        }
      }

      // Check for post-login redirect in session storage
      // Since we can't access session storage from server-side, we'll pass it as a state param
      const redirectPath = searchParams.get('redirect_to') || next

      // Redirect to the originally requested page or dashboard
      return NextResponse.redirect(new URL(redirectPath, request.url))
    } catch (error) {
      console.error('Unexpected error during OAuth callback:', error)
      return NextResponse.redirect(
        new URL('/login?error=An unexpected error occurred', request.url)
      )
    }
  }

  // No code or token_hash provided - might be a malformed verification link
  console.error('Auth callback: No valid parameters found')
  return NextResponse.redirect(
    new URL('/login?error=Invalid verification link. Please check your email for the correct link or request a new one.', request.url)
  )
}