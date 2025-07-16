'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Create a simple client with timeout wrapper
const createTimedClient = () => {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Add timeout wrapper to all requests
  const originalFrom = client.from
  client.from = function(table: string) {
    const query = originalFrom.call(this, table)
    const originalSelect = query.select
    query.select = function(...args: any[]) {
      const promise = originalSelect.apply(this, args as any)
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
        )
      ]) as any
    }
    return query
  }
  
  return client
}

export default function DebugAuth() {
  const [status, setStatus] = useState('Initializing...')
  const [results, setResults] = useState<any>({})
  const [step, setStep] = useState(0)

  useEffect(() => {
    let cancelled = false
    
    const runTests = async () => {
      const steps = [
        'Environment Check',
        'Client Creation',
        'Database Connection',
        'Auth Session Check',
        'Profile Query Test'
      ]
      
      try {
        // Step 1: Environment Check
        if (cancelled) return
        setStep(1)
        setStatus(`Step 1/${steps.length}: ${steps[0]}`)
        
        const envCheck = {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
        }
        
        setResults((prev: any) => ({ ...prev, envCheck }))
        
        if (!envCheck.hasUrl || !envCheck.hasKey) {
          throw new Error('Missing environment variables')
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 2: Client Creation
        if (cancelled) return
        setStep(2)
        setStatus(`Step 2/${steps.length}: ${steps[1]}`)
        
        console.log('Creating Supabase client...')
        const client = createTimedClient()
        console.log('Client created successfully')
        
        setResults((prev: any) => ({ ...prev, clientCreation: { success: true } }))
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 3: Database Connection Test
        if (cancelled) return
        setStep(3)
        setStatus(`Step 3/${steps.length}: ${steps[2]}`)
        
        console.log('Testing database connection...')
        const startTime = Date.now()
        
        try {
          const { data, error, count } = await client
            .from('profiles')
            .select('*', { count: 'exact', head: true })
          
          const endTime = Date.now()
          const duration = endTime - startTime
          
          console.log('Database query completed:', { data, error, count, duration })
          
          setResults((prev: any) => ({ 
            ...prev, 
            dbConnection: { 
              success: !error, 
              error: error?.message,
              duration,
              count
            } 
          }))
        } catch (err) {
          console.error('Database connection error:', err)
          setResults((prev: any) => ({ 
            ...prev, 
            dbConnection: { 
              success: false, 
              error: err instanceof Error ? err.message : String(err)
            } 
          }))
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 4: Auth Session Check
        if (cancelled) return
        setStep(4)
        setStatus(`Step 4/${steps.length}: ${steps[3]}`)
        
        console.log('Checking auth session...')
        const authStartTime = Date.now()
        
        try {
          const { data: { session }, error } = await Promise.race([
            client.auth.getSession(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Auth timeout after 10 seconds')), 10000)
            )
          ])
          
          const authEndTime = Date.now()
          const authDuration = authEndTime - authStartTime
          
          console.log('Auth session check completed:', { session, error, authDuration })
          
          setResults((prev: any) => ({ 
            ...prev, 
            authSession: { 
              success: !error, 
              error: error?.message,
              hasSession: !!session,
              duration: authDuration
            } 
          }))
        } catch (err) {
          console.error('Auth session error:', err)
          setResults((prev: any) => ({ 
            ...prev, 
            authSession: { 
              success: false, 
              error: err instanceof Error ? err.message : String(err)
            } 
          }))
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 5: Profile Query Test
        if (cancelled) return
        setStep(5)
        setStatus(`Step 5/${steps.length}: ${steps[4]}`)
        
        console.log('Testing profile query...')
        const profileStartTime = Date.now()
        
        try {
          const { data, error } = await client
            .from('profiles')
            .select('*')
            .limit(1)
          
          const profileEndTime = Date.now()
          const profileDuration = profileEndTime - profileStartTime
          
          console.log('Profile query completed:', { data, error, profileDuration })
          
          setResults((prev: any) => ({ 
            ...prev, 
            profileQuery: { 
              success: !error, 
              error: error?.message,
              dataCount: data?.length || 0,
              duration: profileDuration
            } 
          }))
        } catch (err) {
          console.error('Profile query error:', err)
          setResults((prev: any) => ({ 
            ...prev, 
            profileQuery: { 
              success: false, 
              error: err instanceof Error ? err.message : String(err)
            } 
          }))
        }
        
        setStatus('All tests completed!')
        
      } catch (err) {
        console.error('Test suite error:', err)
        setStatus(`Error at step ${step}: ${err instanceof Error ? err.message : String(err)}`)
        setResults((prev: any) => ({ 
          ...prev, 
          error: { 
            step, 
            message: err instanceof Error ? err.message : String(err) 
          } 
        }))
      }
    }
    
    runTests()
    
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-2">Status: {status}</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${(step / 5) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Step {step} of 5</p>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Detailed Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h4 className="font-semibold text-blue-800">What this test does:</h4>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Check environment variables are properly loaded</li>
              <li>Create Supabase client without complex state management</li>
              <li>Test database connectivity with timeout protection</li>
              <li>Check auth session retrieval with timeout</li>
              <li>Test profile table query with performance metrics</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}