'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Create a simple Supabase client with timeout protection
const createTimedSupabaseClient = () => {
  const client = createBrowserClient(
    'https://itqbeqrvfvsnduyatcjr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cWJlcXJ2ZnZzbmR1eWF0Y2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDg0MTMsImV4cCI6MjA2NzgyNDQxM30.zweyRok1Wj9yot_806tNCk_7RYXFlOPwWURRSI0R3OI'
  )
  
  // Wrap auth methods with timeout
  const originalAuth = client.auth
  const createTimedMethod = (method: any, timeoutMs = 10000) => {
    return (...args: any[]) => {
      return Promise.race([
        method.apply(originalAuth, args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Auth timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ])
    }
  }
  
  client.auth.signUp = createTimedMethod(originalAuth.signUp.bind(originalAuth))
  client.auth.getSession = createTimedMethod(originalAuth.getSession.bind(originalAuth))
  client.auth.signInWithPassword = createTimedMethod(originalAuth.signInWithPassword.bind(originalAuth))
  
  return client
}

const supabase = createTimedSupabaseClient()

export default function SimpleAuthTest() {
  const [status, setStatus] = useState('Ready to test')
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing connection...')
    console.log('Starting connection test...')
    
    try {
      const startTime = Date.now()
      console.log('Making database query...')
      
      // Test 1: Basic connection
      const { data, error } = await supabase.from('profiles').select('count')
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      console.log('Connection test completed:', { 
        success: !error, 
        error: error?.message, 
        duration: `${duration}ms`,
        data 
      })
      
      if (error) {
        setResults(prev => ({ ...prev, connection: { success: false, error: error.message, duration } }))
        setStatus('Connection failed')
      } else {
        setResults(prev => ({ ...prev, connection: { success: true, message: 'Database connected', duration } }))
        setStatus('Connection successful')
      }
    } catch (err) {
      console.error('Connection test error:', err)
      setResults(prev => ({ ...prev, connection: { success: false, error: String(err) } }))
      setStatus('Connection error')
    }
    
    setLoading(false)
  }

  const testSignUp = async () => {
    setLoading(true)
    setStatus('Testing sign up...')
    
    // Use a test email
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'testpassword123'
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      })
      
      if (error) {
        setResults(prev => ({ ...prev, signUp: { success: false, error: error.message } }))
        setStatus('Sign up failed')
      } else {
        setResults(prev => ({ ...prev, signUp: { success: true, user: data.user?.id, needsConfirmation: !data.session } }))
        setStatus('Sign up successful')
      }
    } catch (err) {
      setResults(prev => ({ ...prev, signUp: { success: false, error: String(err) } }))
      setStatus('Sign up error')
    }
    
    setLoading(false)
  }

  const testGetSession = async () => {
    setLoading(true)
    setStatus('Testing session...')
    console.log('Starting session test...')
    
    try {
      const startTime = Date.now()
      console.log('Getting auth session...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      console.log('Session test completed:', { 
        success: !error, 
        error: error?.message, 
        hasSession: !!session,
        userId: session?.user?.id,
        duration: `${duration}ms`
      })
      
      if (error) {
        setResults(prev => ({ ...prev, session: { success: false, error: error.message, duration } }))
      } else {
        setResults(prev => ({ ...prev, session: { success: true, hasSession: !!session, user: session?.user?.id, duration } }))
      }
      setStatus('Session test complete')
    } catch (err) {
      console.error('Session test error:', err)
      setResults(prev => ({ ...prev, session: { success: false, error: String(err) } }))
      setStatus('Session test error')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple Authentication Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-2">Status: {status}</h2>
            {loading && <div className="text-blue-600">⏳ Working...</div>}
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={testConnection}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              1. Test Database Connection
            </button>
            
            <button 
              onClick={testGetSession}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              2. Test Get Session
            </button>
            
            <button 
              onClick={testSignUp}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              3. Test Sign Up (Creates test user)
            </button>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-semibold text-yellow-800">Instructions:</h4>
            <ol className="list-decimal list-inside text-yellow-700 space-y-1">
              <li>First click &quot;Test Database Connection&quot; - this should succeed</li>
              <li>Then click &quot;Test Get Session&quot; - this will check auth state</li>
              <li>Finally click &quot;Test Sign Up&quot; - this will create a test user</li>
              <li>Watch the results section for any errors</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}