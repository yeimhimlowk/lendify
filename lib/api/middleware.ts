import { NextRequest, NextResponse } from 'next/server'
import { handleRateLimitError, handleInternalError } from '@/lib/api/errors'

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

/**
 * Rate limiter storage (in production, use Redis or similar)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiting middleware
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const { windowMs, maxRequests, message } = config
      const now = Date.now()
      
      // Create a unique key for the client (IP + endpoint)
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      const endpoint = new URL(request.url).pathname
      const key = `${clientIP}:${endpoint}`

      // Clean up expired entries
      if (rateLimitStore.size > 10000) { // Prevent memory leaks
        const cutoff = now - windowMs
        for (const [k, v] of rateLimitStore.entries()) {
          if (v.resetTime < cutoff) {
            rateLimitStore.delete(k)
          }
        }
      }

      // Get or create rate limit entry
      const entry = rateLimitStore.get(key)
      
      if (!entry || entry.resetTime < now) {
        // New window or expired entry
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs
        })
        return null // Allow request
      }

      if (entry.count >= maxRequests) {
        // Rate limit exceeded
        const response = handleRateLimitError(
          message || `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`
        )
        
        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', '0')
        response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString())
        
        return response
      }

      // Increment counter
      entry.count++
      rateLimitStore.set(key, entry)

      return null // Allow request
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      return null // Allow request on error
    }
  }
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return async (_request: NextRequest): Promise<NextResponse | null> => {
    // This middleware doesn't block requests, just adds headers to responses
    return null
  }
}

/**
 * Request logging middleware
 */
export function requestLogger() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const method = request.method
    const url = request.url
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown'

    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip} - ${userAgent}`)
    
    return null // Don't block request
  }
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
        const contentType = request.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          // Clone request to read body
          const clonedRequest = request.clone()
          const body = await clonedRequest.text()
          
          // Basic XSS prevention - check for script tags
          if (body.toLowerCase().includes('<script') || 
              body.toLowerCase().includes('javascript:') ||
              body.toLowerCase().includes('on' + 'load=') ||
              body.toLowerCase().includes('on' + 'error=')) {
            
            return NextResponse.json(
              { error: 'Malicious content detected' },
              { status: 400 }
            )
          }
        }
      }
      
      return null // Allow request
    } catch (error) {
      console.error('Input sanitization error:', error)
      return null // Allow request on error
    }
  }
}

/**
 * Authentication requirement middleware
 */
export function requireAuthentication() {
  return async (_request: NextRequest): Promise<NextResponse | null> => {
    try {
      // Check if required environment variables are present
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase environment variables not configured, skipping auth')
        return null // Allow request when not configured
      }

      // Import server-side Supabase client
      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      const supabase = await createServerSupabaseClient()
      
      // Get user from session (cookies) with timeout
      const authPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      )
      
      const { data: { user }, error } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any
      
      if (error || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Authentication successful - continue to next middleware/handler
      return null
    } catch (error) {
      console.error('Authentication middleware error:', error)
      // For development/fallback, allow requests when auth service is down
      if (process.env.NODE_ENV === 'development') {
        console.warn('Auth service unavailable in development, allowing request')
        return null
      }
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      )
    }
  }
}

/**
 * CORS middleware
 */
export function corsMiddleware() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
      return response
    }
    
    return null // Allow request, CORS headers will be added to response
  }
}

/**
 * Content-Type validation middleware
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      const contentType = request.headers.get('content-type')
      
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return NextResponse.json(
          { 
            error: 'Invalid Content-Type',
            message: `Expected one of: ${allowedTypes.join(', ')}`
          },
          { status: 415 }
        )
      }
    }
    
    return null // Allow request
  }
}

/**
 * Request size limit middleware
 */
export function requestSizeLimit(maxSizeBytes: number = 10 * 1024 * 1024) { // 10MB default
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const contentLength = request.headers.get('content-length')
    
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > maxSizeBytes) {
        return NextResponse.json(
          { 
            error: 'Request too large',
            message: `Maximum request size is ${maxSizeBytes / 1024 / 1024}MB`
          },
          { status: 413 }
        )
      }
    }
    
    return null // Allow request
  }
}

/**
 * API versioning middleware
 */
export function apiVersioning(supportedVersions: string[] = ['v1']) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    
    // Check if path includes version (e.g., /api/v1/...)
    if (pathParts[2] && pathParts[2].startsWith('v')) {
      const version = pathParts[2]
      if (!supportedVersions.includes(version)) {
        return NextResponse.json(
          {
            error: 'Unsupported API version',
            message: `Supported versions: ${supportedVersions.join(', ')}`
          },
          { status: 400 }
        )
      }
    }
    
    return null // Allow request
  }
}

/**
 * Compose multiple middleware functions
 * Accepts both middleware functions and factory functions that return middleware
 */
type MiddlewareFunction = (request: NextRequest) => Promise<NextResponse | null>
type MiddlewareFactory = () => MiddlewareFunction
type MiddlewareInput = MiddlewareFunction | MiddlewareFactory

export function composeMiddleware(...middlewares: MiddlewareInput[]) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      // Check if it's a factory function or a direct middleware function
      const middlewareFunc = typeof middleware === 'function' && middleware.length === 0
        ? (middleware as MiddlewareFactory)()
        : middleware as MiddlewareFunction
      
      const result = await middlewareFunc(request)
      if (result) {
        return result // Middleware blocked the request
      }
    }
    return null // All middleware passed
  }
}

/**
 * Predefined middleware combinations
 */
export const apiMiddleware = {
  // Standard API protection
  standard: () => composeMiddleware(
    corsMiddleware,
    requestLogger,
    sanitizeInput,
    validateContentType,
    requestSizeLimit,
    rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }) // 100 requests per 15 minutes
  ),

  // Authenticated API protection
  authenticated: () => composeMiddleware(
    corsMiddleware,
    requestLogger,
    sanitizeInput,
    validateContentType,
    requestSizeLimit,
    requireAuthentication,
    rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 200 }) // Higher limit for authenticated users
  ),

  // High-frequency endpoints (like search)
  highFrequency: () => composeMiddleware(
    corsMiddleware,
    sanitizeInput,
    rateLimit({ windowMs: 60 * 1000, maxRequests: 60 }) // 60 requests per minute
  ),

  // AI endpoints (more restrictive)
  ai: () => composeMiddleware(
    corsMiddleware,
    requestLogger,
    sanitizeInput,
    validateContentType,
    requestSizeLimit,
    requireAuthentication,
    rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 50 }) // 50 requests per hour
  ),

  // Public read-only endpoints
  public: () => composeMiddleware(
    corsMiddleware,
    sanitizeInput,
    rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 500 }) // 500 requests per 15 minutes
  )
}

/**
 * Apply middleware to API route handler
 */
export function withMiddleware<T extends any[]>(
  middleware: (request: NextRequest) => Promise<NextResponse | null>,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Apply middleware
      const middlewareResult = await middleware(request)
      if (middlewareResult) {
        return middlewareResult // Middleware blocked the request
      }

      // Execute the handler
      const response = await handler(request, ...args)
      
      // Add security headers to response
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      return response
    } catch (error) {
      console.error('Middleware wrapper error:', error)
      return handleInternalError('Request processing failed')
    }
  }
}