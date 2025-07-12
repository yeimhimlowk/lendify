import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standard API error response structure
 */
export interface APIError {
  error: string
  message: string
  code?: string
  details?: any
}

/**
 * API error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST'
}

/**
 * Custom API error class
 */
export class APIResponseError extends Error {
  public statusCode: number
  public code: ErrorCode
  public details?: any

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.name = 'APIResponseError'
  }
}

/**
 * Create standardized error response
 * @param error - Error message
 * @param statusCode - HTTP status code
 * @param code - Error code
 * @param details - Additional error details
 * @returns NextResponse with error
 */
export function createErrorResponse(
  error: string,
  statusCode: number,
  code: ErrorCode,
  details?: any
): NextResponse {
  const errorResponse: APIError = {
    error: code,
    message: error,
    code,
    details
  }

  return NextResponse.json(errorResponse, { status: statusCode })
}

/**
 * Handle Zod validation errors
 * @param error - Zod error object
 * @returns NextResponse with validation error
 */
export function handleValidationError(error: ZodError): NextResponse {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))

  return createErrorResponse(
    'Validation failed',
    400,
    ErrorCode.VALIDATION_ERROR,
    details
  )
}

/**
 * Handle authentication errors
 * @param message - Error message
 * @returns NextResponse with authentication error
 */
export function handleAuthError(message: string = 'Authentication required'): NextResponse {
  return createErrorResponse(
    message,
    401,
    ErrorCode.AUTHENTICATION_ERROR
  )
}

/**
 * Handle authorization errors
 * @param message - Error message
 * @returns NextResponse with authorization error
 */
export function handleAuthorizationError(message: string = 'Insufficient permissions'): NextResponse {
  return createErrorResponse(
    message,
    403,
    ErrorCode.AUTHORIZATION_ERROR
  )
}

/**
 * Handle not found errors
 * @param resource - Resource name
 * @returns NextResponse with not found error
 */
export function handleNotFoundError(resource: string = 'Resource'): NextResponse {
  return createErrorResponse(
    `${resource} not found`,
    404,
    ErrorCode.NOT_FOUND
  )
}

/**
 * Handle conflict errors
 * @param message - Error message
 * @returns NextResponse with conflict error
 */
export function handleConflictError(message: string): NextResponse {
  return createErrorResponse(
    message,
    409,
    ErrorCode.CONFLICT
  )
}

/**
 * Handle internal server errors
 * @param message - Error message
 * @param details - Additional error details
 * @returns NextResponse with internal server error
 */
export function handleInternalError(
  message: string = 'Internal server error',
  details?: any
): NextResponse {
  // Log the error for debugging
  console.error('Internal server error:', message, details)
  
  return createErrorResponse(
    message,
    500,
    ErrorCode.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? details : undefined
  )
}

/**
 * Handle rate limit errors
 * @param message - Error message
 * @returns NextResponse with rate limit error
 */
export function handleRateLimitError(message: string = 'Rate limit exceeded'): NextResponse {
  return createErrorResponse(
    message,
    429,
    ErrorCode.RATE_LIMIT
  )
}

/**
 * Global error handler for API routes
 * @param error - Error object
 * @returns NextResponse with appropriate error response
 */
export function handleAPIError(error: unknown): NextResponse {
  // Handle custom API errors
  if (error instanceof APIResponseError) {
    return createErrorResponse(
      error.message,
      error.statusCode,
      error.code,
      error.details
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleValidationError(error)
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes('Authentication')) {
      return handleAuthError(error.message)
    }
    
    if (error.message.includes('authorization') || error.message.includes('permission')) {
      return handleAuthorizationError(error.message)
    }
    
    if (error.message.includes('not found')) {
      return handleNotFoundError()
    }

    // Default to internal server error
    return handleInternalError(error.message, {
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }

  // Handle unknown errors
  return handleInternalError('An unexpected error occurred')
}