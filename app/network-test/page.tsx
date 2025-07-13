'use client'

import { useState } from 'react'

export default function NetworkTest() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Ready to test network connectivity')

  const testSupabaseConnectivity = async () => {
    setLoading(true)
    setStatus('Testing Supabase connectivity...')
    
    const supabaseUrl = 'https://itqbeqrvfvsnduyatcjr.supabase.co'
    const tests = []
    
    // Test 1: Basic URL connectivity
    try {
      setStatus('Testing basic URL connectivity...')
      const response = await fetch(supabaseUrl, { 
        method: 'HEAD',
        mode: 'cors'
      })
      tests.push({
        test: 'Basic URL connectivity',
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      })
    } catch (err) {
      tests.push({
        test: 'Basic URL connectivity',
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    // Test 2: CORS preflight
    try {
      setStatus('Testing CORS preflight...')
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'apikey,authorization'
        }
      })
      tests.push({
        test: 'CORS preflight',
        success: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (err) {
      tests.push({
        test: 'CORS preflight',
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    // Test 3: REST API endpoint
    try {
      setStatus('Testing REST API endpoint...')
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cWJlcXJ2ZnZzbmR1eWF0Y2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDg0MTMsImV4cCI6MjA2NzgyNDQxM30.zweyRok1Wj9yot_806tNCk_7RYXFlOPwWURRSI0R3OI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cWJlcXJ2ZnZzbmR1eWF0Y2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDg0MTMsImV4cCI6MjA2NzgyNDQxM30.zweyRok1Wj9yot_806tNCk_7RYXFlOPwWURRSI0R3OI',
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.text()
      tests.push({
        test: 'REST API endpoint',
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData: data.substring(0, 500) // Limit response size
      })
    } catch (err) {
      tests.push({
        test: 'REST API endpoint',
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    // Test 4: Auth endpoint
    try {
      setStatus('Testing Auth endpoint...')
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cWJlcXJ2ZnZzbmR1eWF0Y2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDg0MTMsImV4cCI6MjA2NzgyNDQxM30.zweyRok1Wj9yot_806tNCk_7RYXFlOPwWURRSI0R3OI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cWJlcXJ2ZnZzbmR1eWF0Y2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDg0MTMsImV4cCI6MjA2NzgyNDQxM30.zweyRok1Wj9yot_806tNCk_7RYXFlOPwWURRSI0R3OI'
        }
      })
      
      const authData = await response.text()
      tests.push({
        test: 'Auth endpoint',
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData: authData.substring(0, 500)
      })
    } catch (err) {
      tests.push({
        test: 'Auth endpoint',
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    setResults({ tests, timestamp: new Date().toISOString() })
    setStatus('Network tests completed')
    setLoading(false)
  }

  const testEnvironmentVariables = () => {
    const envResults = {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        isValid: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') || false
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'NOT SET'
      }
    }
    
    setResults({ environmentVariables: envResults })
    setStatus('Environment variables checked')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Network Connectivity Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-2">Status: {status}</h2>
            {loading && <div className="text-blue-600">⏳ Working...</div>}
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={testEnvironmentVariables}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              1. Test Environment Variables
            </button>
            
            <button 
              onClick={testSupabaseConnectivity}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              2. Test Supabase Connectivity
            </button>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-semibold text-yellow-800">What this tests:</h4>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li>Environment variables are properly loaded</li>
              <li>Basic network connectivity to Supabase</li>
              <li>CORS configuration</li>
              <li>REST API endpoint accessibility</li>
              <li>Auth endpoint accessibility</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}