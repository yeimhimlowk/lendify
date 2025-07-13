import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkEnvironment, checkDatabaseConnection, checkAuthFlow } from '@/lib/utils/environment-check'

/**
 * GET /api/health - Comprehensive health check endpoint
 * 
 * This endpoint provides detailed information about:
 * - Environment configuration
 * - Database connectivity
 * - Authentication service status
 * - API service health
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check environment variables
    const envReport = checkEnvironment()
    
    // Check database connection
    const dbCheck = await checkDatabaseConnection()
    
    // Check auth flow
    const authCheck = await checkAuthFlow()
    
    // Check if we can create a Supabase client
    let clientCheck = { created: false, error: null }
    try {
      const _supabase = await createServerSupabaseClient()
      clientCheck.created = true
    } catch (err) {
      clientCheck.error = err instanceof Error ? err.message : 'Failed to create client'
    }
    
    const responseTime = Date.now() - startTime
    
    // Determine overall health status
    const isHealthy = envReport.overall !== 'error' && 
                     dbCheck.connected && 
                     authCheck.available && 
                     clientCheck.created
    
    const status = isHealthy ? 200 : 503
    
    const healthReport = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks: {
        environment: {
          status: envReport.overall,
          details: envReport.checks,
          recommendations: envReport.recommendations
        },
        database: {
          connected: dbCheck.connected,
          error: dbCheck.error
        },
        authentication: {
          available: authCheck.available,
          hasUser: authCheck.hasUser,
          error: authCheck.error
        },
        supabaseClient: {
          created: clientCheck.created,
          error: clientCheck.error
        }
      },
      services: {
        api: 'operational',
        database: dbCheck.connected ? 'operational' : 'degraded',
        auth: authCheck.available ? 'operational' : 'degraded'
      }
    }
    
    return NextResponse.json(healthReport, { status })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: {
        message: error instanceof Error ? error.message : 'Health check failed',
        stack: process.env.NODE_ENV === 'development' ? 
               (error instanceof Error ? error.stack : undefined) : undefined
      }
    }, { status: 500 })
  }
}

/**
 * OPTIONS /api/health - Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({ message: 'Health check endpoint' }, { status: 200 })
}