import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).optional()
})

/**
 * Sort parameters schema
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * Search parameters schema
 */
export const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  tags: z.string().optional()
})

/**
 * Extract pagination parameters from URL search params
 * @param searchParams - URL search parameters
 * @returns Parsed pagination parameters
 */
export function extractPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Extract sort parameters from URL search params
 * @param searchParams - URL search parameters
 * @returns Parsed sort parameters
 */
export function extractSort(searchParams: URLSearchParams) {
  return sortSchema.parse({
    sortBy: searchParams.get('sortBy'),
    sortOrder: searchParams.get('sortOrder')
  })
}

/**
 * Extract search parameters from URL search params
 * @param searchParams - URL search parameters
 * @returns Parsed search parameters
 */
export function extractSearch(searchParams: URLSearchParams) {
  return searchSchema.parse({
    query: searchParams.get('query'),
    category: searchParams.get('category'),
    location: searchParams.get('location'),
    minPrice: searchParams.get('minPrice'),
    maxPrice: searchParams.get('maxPrice'),
    condition: searchParams.get('condition'),
    tags: searchParams.get('tags')
  })
}

/**
 * Parse JSON body from request
 * @param request - Next.js request object
 * @returns Parsed JSON data
 */
export async function parseJSONBody<T>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch (_error) {
    throw new Error('Invalid JSON body')
  }
}

/**
 * Validate request body with Zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema for validation
 * @returns Validated data
 */
export async function validateBody<T>(request: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  const body = await parseJSONBody(request)
  return schema.parse(body)
}

/**
 * Create standardized success response
 * @param data - Response data
 * @param message - Success message
 * @param metadata - Additional metadata
 * @returns Success response object
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  metadata?: Record<string, any>
) {
  return {
    success: true,
    data,
    message,
    ...metadata
  }
}

/**
 * Create paginated response
 * @param data - Array of data items
 * @param pagination - Pagination parameters
 * @param total - Total count of items
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number },
  total: number
) {
  const totalPages = Math.ceil(total / pagination.limit)
  const hasNextPage = pagination.page < totalPages
  const hasPreviousPage = pagination.page > 1

  return createSuccessResponse(data, undefined, {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  })
}

/**
 * Add CORS headers to response
 * @param response - Response object
 * @returns Response with CORS headers
 */
export function addCORSHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

/**
 * Add security headers to response
 * @param response - NextResponse object
 * @returns NextResponse with security headers
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

/**
 * Sanitize string input
 * @param input - Input string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential XSS characters
}

/**
 * Generate cache headers for response
 * @param maxAge - Cache max age in seconds
 * @param revalidate - Revalidation time in seconds
 * @returns Cache headers object
 */
export function getCacheHeaders(maxAge: number = 300, revalidate: number = 60) {
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${revalidate}`,
    'CDN-Cache-Control': `public, max-age=${maxAge}`,
    'Vercel-CDN-Cache-Control': `public, max-age=${maxAge}`
  }
}

/**
 * Log API request for debugging
 * @param request - Next.js request object
 * @param operation - Operation being performed
 * @param userId - User ID (if authenticated)
 */
export function logAPIRequest(
  request: NextRequest,
  operation: string,
  userId?: string
) {
  const timestamp = new Date().toISOString()
  const method = request.method
  const url = request.url
  const userAgent = request.headers.get('user-agent')
  
  console.log(`[${timestamp}] ${method} ${url} - ${operation}${userId ? ` (User: ${userId})` : ''} - ${userAgent}`)
}