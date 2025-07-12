import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Type guard to check if an error is ZodError-like
 * @param error - The error to check
 * @returns true if the error is a ZodError or has ZodError-like properties
 */
export function isZodErrorLike(error: unknown): boolean {
  return (
    error instanceof ZodError ||
    (error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ZodError')
  )
}

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
 * @param error - Zod error object or error with ZodError-like structure
 * @returns NextResponse with validation error
 */
export function handleValidationError(error: unknown): NextResponse {
  // Type guard to ensure we have a proper ZodError
  if (!(error instanceof ZodError)) {
    // If it's not a ZodError instance but has the name property, log warning
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      console.warn('Received error with ZodError name but not a ZodError instance:', error)
    }
    
    // Fallback to generic validation error
    return createErrorResponse(
      'Validation failed',
      400,
      ErrorCode.VALIDATION_ERROR,
      { message: error instanceof Error ? error.message : 'Unknown validation error' }
    )
  }

  // Defensive check for errors array
  if (!error.errors || !Array.isArray(error.errors)) {
    console.error('ZodError missing errors array:', error)
    return createErrorResponse(
      'Validation failed',
      400,
      ErrorCode.VALIDATION_ERROR,
      { message: error.message || 'Unknown validation error' }
    )
  }

  // Safe mapping of error details
  const details = error.errors.map(err => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message || 'Validation error',
    code: err.code || 'custom'
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
  
  // Also handle errors that claim to be ZodErrors but aren't instances
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
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