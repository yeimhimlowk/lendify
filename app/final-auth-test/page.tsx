'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/use-auth'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function FinalAuthTest() {
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const [status, setStatus] = useState('Ready to test authentication')
  const { signOut, loading, user, profile, isAuthenticated } = useAuth()

  const handleSignUp = async () => {
    if (!testEmail || !testPassword) {
      setStatus('Please enter email and password')
      return
    }
    
    setStatus('Signing up...')
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })
      
      if (error) throw error
      setStatus('✅ Sign up successful! Check your email for verification.')
    } catch (error) {
      setStatus(`❌ Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSignIn = async () => {
    if (!testEmail || !testPassword) {
      setStatus('Please enter email and password')
      return
    }
    
    setStatus('Signing in...')
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })
      
      if (error) throw error
      setStatus('✅ Sign in successful!')
    } catch (error) {
      setStatus(`❌ Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSignOut = async () => {
    setStatus('Signing out...')
    try {
      await signOut()
      setStatus('✅ Signed out successfully!')
    } catch (error) {
      setStatus(`❌ Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🎉 Authentication Fixed!</h1>
        <p className="text-gray-600 mb-8">Test the complete authentication flow</p>
        
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          {/* Status Display */}
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
            <p className="font-medium text-blue-900">Status: {status}</p>
            {loading && <p className="text-blue-600 text-sm mt-1">⏳ Processing...</p>}
          </div>

          {/* Current Auth State */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Current Authentication State:</h3>
            <div className="space-y-1 text-sm">
              <p>🔐 Authenticated: <span className={isAuthenticated ? 'text-green-600 font-medium' : 'text-red-600'}>{isAuthenticated ? 'YES' : 'NO'}</span></p>
              <p>👤 User ID: {user?.id || 'None'}</p>
              <p>📧 Email: {user?.email || 'None'}</p>
              <p>✅ Email Verified: <span className={user?.email_confirmed_at ? 'text-green-600' : 'text-orange-600'}>{user?.email_confirmed_at ? 'YES' : 'NO'}</span></p>
              <p>👨‍💼 Profile: {profile?.full_name || 'None'}</p>
            </div>
          </div>

          {/* Test Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Email:</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Password:</label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="password123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  📝 Sign Up
                </button>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  🔑 Sign In
                </button>
              </>
            ) : (
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                🚪 Sign Out
              </button>
            )}
          </div>

          {/* Success Message */}
          {isAuthenticated && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-green-800 font-semibold">🎉 Authentication Working!</h4>
              <p className="text-green-700 text-sm mt-1">
                You are successfully authenticated. The profile loading and sign-in issues have been resolved!
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-yellow-800 font-semibold mb-2">📋 Test Instructions:</h4>
            <ol className="list-decimal list-inside text-yellow-700 text-sm space-y-1">
              <li>Enter a test email and password above</li>
              <li>Click &quot;Sign Up&quot; to create a new user (you&apos;ll need to verify email)</li>
              <li>Or click &quot;Sign In&quot; if you already have an account</li>
              <li>Watch the status and auth state update in real-time</li>
              <li>Test sign out functionality when authenticated</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}