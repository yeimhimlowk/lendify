import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle errors from Supabase
  if (error) {
    console.error('Email confirmation error:', error, error_description)
    
    // Redirect to verify-email page with error
    return NextResponse.redirect(
      new URL(`/verify-email?error=${encodeURIComponent(error_description || error)}`, request.url)
    )
  }

  // Check if we have the required parameters
  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/verify-email?error=Invalid confirmation link', request.url)
    )
  }

  const supabase = await createClient()

  try {
    if (type === 'email' || type === 'signup') {
      // Verify the email token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email',
      })

      if (verifyError) {
        console.error('OTP verification error:', verifyError)
        
        // Check for specific error cases
        if (verifyError.message.includes('expired')) {
          return NextResponse.redirect(
            new URL('/verify-email?error=Verification link has expired. Please request a new one.', request.url)
          )
        }
        
        return NextResponse.redirect(
          new URL(`/verify-email?error=${encodeURIComponent(verifyError.message)}`, request.url)
        )
      }

      // Get the user session after verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('Session error after verification:', sessionError)
        return NextResponse.redirect(
          new URL('/login?message=Email verified successfully. Please sign in.', request.url)
        )
      }

      // Check if profile exists, if not create one
      const { error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || null,
          })

        if (insertError) {
          console.error('Profile creation error:', insertError)
          // Don't fail the verification flow
        }
      }

      // Successfully verified - redirect to dashboard
      const redirectUrl = new URL(request.url)
      redirectUrl.pathname = next
      redirectUrl.search = '' // Clear any query params
      return NextResponse.redirect(redirectUrl)
      
    } else if (type === 'recovery') {
      // Handle password recovery confirmation
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })

      if (verifyError) {
        console.error('Recovery verification error:', verifyError)
        return NextResponse.redirect(
          new URL(`/forgot-password?error=${encodeURIComponent(verifyError.message)}`, request.url)
        )
      }

      // Redirect to reset password page
      return NextResponse.redirect(new URL('/reset-password', request.url))
      
    } else {
      // Unknown confirmation type
      return NextResponse.redirect(
        new URL('/login?error=Invalid confirmation type', request.url)
      )
    }
  } catch (error) {
    console.error('Unexpected error during email confirmation:', error)
    return NextResponse.redirect(
      new URL('/verify-email?error=An unexpected error occurred', request.url)
    )
  }
}