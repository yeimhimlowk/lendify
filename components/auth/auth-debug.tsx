'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function runDiagnostics() {
      console.log('Starting auth diagnostics...')
      const info: any = {
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
          supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        },
        browser: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
          location: typeof window !== 'undefined' ? {
            origin: window.location.origin,
            href: window.location.href,
            protocol: window.location.protocol,
            host: window.location.host,
          } : 'SSR',
        },
        tests: {}
      }
      
      console.log('Basic info collected:', info)

      // Test 1: Try to create Supabase client
      try {
        console.log('Attempting to create Supabase client...')
        const client = createClient()
        console.log('Supabase client created successfully')
        info.tests.clientCreation = { success: true, message: 'Client created successfully' }
        
        // Test 2: Try to get session
        try {
          const { data: { session }, error } = await client.auth.getSession()
          info.tests.getSession = {
            success: !error,
            hasSession: !!session,
            error: error ? {
              message: error.message,
              code: error.code,
              details: error
            } : null
          }
        } catch (err) {
          info.tests.getSession = {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            errorType: err?.constructor?.name,
            errorStack: err instanceof Error ? err.stack : undefined
          }
        }

        // Test 3: Try to query profiles table
        try {
          const { error, count } = await client
            .from('profiles')
            .select('*', { count: 'exact', head: true })
          
          info.tests.profilesTable = {
            success: !error,
            count,
            error: error ? {
              message: error.message,
              code: error.code,
              details: error,
              hint: error.hint
            } : null
          }
        } catch (err) {
          info.tests.profilesTable = {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            errorType: err?.constructor?.name,
            errorStack: err instanceof Error ? err.stack : undefined
          }
        }

        // Test 4: Check auth methods
        try {
          const authMethods = {
            signInWithPassword: typeof client.auth.signInWithPassword === 'function',
            signUp: typeof client.auth.signUp === 'function',
            signOut: typeof client.auth.signOut === 'function',
            getSession: typeof client.auth.getSession === 'function',
            onAuthStateChange: typeof client.auth.onAuthStateChange === 'function',
          }
          info.tests.authMethods = {
            success: true,
            methods: authMethods,
            allPresent: Object.values(authMethods).every(v => v === true)
          }
        } catch (err) {
          info.tests.authMethods = {
            success: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }

      } catch (err) {
        info.tests.clientCreation = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          errorType: err?.constructor?.name,
          errorStack: err instanceof Error ? err.stack : undefined
        }
      }

      console.log('Diagnostics completed:', info)
      setDebugInfo(info)
      setLoading(false)
    }

    runDiagnostics().catch(err => {
      console.error('Diagnostics failed:', err)
      setDebugInfo({
        error: 'Diagnostics failed',
        message: err.message,
        stack: err.stack
      })
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="p-4">
        <p>Running auth diagnostics...</p>
        <p className="text-sm text-gray-500 mt-2">
          Check browser console for detailed logs. If this takes more than 10 seconds, there may be an error.
        </p>
      </div>
    )
  }
  
  // If there's an error in the debug info, show it prominently
  if (debugInfo.error) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold text-red-600">Diagnostics Error</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800 font-medium">{debugInfo.message}</p>
          {debugInfo.stack && (
            <pre className="text-xs text-red-600 mt-2 overflow-auto">
              {debugInfo.stack}
            </pre>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Check the browser console for more details.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 text-xs font-mono">
      <h2 className="text-lg font-bold">Auth Debug Information</h2>
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <div className="space-y-2">
        <h3 className="font-bold">Quick Status:</h3>
        <ul className="space-y-1">
          <li>✓ Environment vars: {debugInfo.environment?.hasSupabaseUrl && debugInfo.environment?.hasSupabaseKey ? '✅' : '❌'}</li>
          <li>✓ Client creation: {debugInfo.tests?.clientCreation?.success ? '✅' : '❌'}</li>
          <li>✓ Get session: {debugInfo.tests?.getSession?.success ? '✅' : '❌'}</li>
          <li>✓ Profiles table: {debugInfo.tests?.profilesTable?.success ? '✅' : '❌'}</li>
          <li>✓ Auth methods: {debugInfo.tests?.authMethods?.allPresent ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  )
}