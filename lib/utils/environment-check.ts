/**
 * Environment Check Utility
 * Provides comprehensive validation and health checks for the application environment
 */

interface EnvironmentCheck {
  name: string
  required: boolean
  value?: string
  valid: boolean
  error?: string
}

interface EnvironmentReport {
  overall: 'healthy' | 'warning' | 'error'
  checks: EnvironmentCheck[]
  recommendations: string[]
}

export function checkEnvironment(): EnvironmentReport {
  const checks: EnvironmentCheck[] = []
  
  // Required environment variables
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', key: 'NEXT_PUBLIC_SUPABASE_URL' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
  ]
  
  // Optional environment variables
  const optionalVars = [
    { name: 'NEXT_PUBLIC_MAPBOX_TOKEN', key: 'NEXT_PUBLIC_MAPBOX_TOKEN' },
    { name: 'NODE_ENV', key: 'NODE_ENV' },
  ]
  
  // Check required variables
  for (const { name, key } of requiredVars) {
    const value = process.env[key]
    const check: EnvironmentCheck = {
      name,
      required: true,
      value: value ? `${value.slice(0, 10)}...` : undefined,
      valid: !!value
    }
    
    if (!value) {
      check.error = `Missing required environment variable: ${key}`
    } else if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      if (!value.startsWith('https://')) {
        check.valid = false
        check.error = 'Supabase URL must start with https://'
      } else if (!value.includes('supabase')) {
        check.valid = false
        check.error = 'Invalid Supabase URL format'
      }
    } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      if (value.length < 30) {
        check.valid = false
        check.error = `Supabase anon key appears too short (${value.length} chars)`
      }
    }
    
    checks.push(check)
  }
  
  // Check optional variables
  for (const { name, key } of optionalVars) {
    const value = process.env[key]
    checks.push({
      name,
      required: false,
      value: value ? (key.includes('TOKEN') ? `${value.slice(0, 10)}...` : value) : undefined,
      valid: true, // Optional vars are always "valid"
      error: !value ? `Optional variable not set: ${key}` : undefined
    })
  }
  
  // Generate recommendations
  const recommendations: string[] = []
  const failedRequired = checks.filter(c => c.required && !c.valid)
  const missingOptional = checks.filter(c => !c.required && !c.value)
  
  if (failedRequired.length > 0) {
    recommendations.push('Fix required environment variables before proceeding')
    recommendations.push('Check your .env.local file and ensure all required variables are set')
  }
  
  if (missingOptional.some(c => c.name === 'NEXT_PUBLIC_MAPBOX_TOKEN')) {
    recommendations.push('Consider setting NEXT_PUBLIC_MAPBOX_TOKEN for location features')
  }
  
  if (process.env.NODE_ENV === 'development') {
    recommendations.push('Running in development mode - ensure production environment variables are properly configured for deployment')
  }
  
  // Determine overall status
  let overall: 'healthy' | 'warning' | 'error' = 'healthy'
  if (failedRequired.length > 0) {
    overall = 'error'
  } else if (missingOptional.length > 0) {
    overall = 'warning'
  }
  
  return {
    overall,
    checks,
    recommendations
  }
}

export async function checkDatabaseConnection() {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    // Test basic database connectivity
    const { error } = await supabase.from('profiles').select('count').limit(1)
    
    return {
      connected: !error,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details
      } : null
    }
  } catch (err) {
    return {
      connected: false,
      error: {
        message: err instanceof Error ? err.message : 'Unknown database error',
        code: 'CONNECTION_FAILED',
        details: err
      }
    }
  }
}

export async function checkAuthFlow() {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    // Test auth methods availability
    const { data: { user }, error } = await supabase.auth.getUser()
    
    return {
      available: true,
      hasUser: !!user,
      error: error ? {
        message: error.message,
        code: error.code
      } : null
    }
  } catch (err) {
    return {
      available: false,
      error: {
        message: err instanceof Error ? err.message : 'Auth check failed',
        code: 'AUTH_CHECK_FAILED'
      }
    }
  }
}

export function generateEnvironmentReport() {
  const envCheck = checkEnvironment()
  
  console.log('=== ENVIRONMENT REPORT ===')
  console.log(`Overall Status: ${envCheck.overall.toUpperCase()}`)
  console.log('\nEnvironment Variables:')
  
  envCheck.checks.forEach(check => {
    const status = check.valid ? '✅' : '❌'
    const required = check.required ? '(Required)' : '(Optional)'
    console.log(`${status} ${check.name} ${required}`)
    if (check.error) {
      console.log(`   Error: ${check.error}`)
    }
    if (check.value) {
      console.log(`   Value: ${check.value}`)
    }
  })
  
  if (envCheck.recommendations.length > 0) {
    console.log('\nRecommendations:')
    envCheck.recommendations.forEach(rec => {
      console.log(`• ${rec}`)
    })
  }
  
  return envCheck
}