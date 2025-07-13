// Wrapper around global fetch to add error logging
export function createFetchWrapper() {
  if (typeof window === 'undefined') {
    // Server-side, return normal fetch
    return fetch
  }

  // Client-side, wrap fetch with error logging
  const originalFetch = window.fetch

  return async function wrappedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    
    // Create a new Headers object to safely merge headers
    const headers = new Headers(init?.headers)
    
    // Be more conservative with headers to avoid conflicts
    // Only set Content-Type for specific requests with bodies
    if (!headers.has('Content-Type') && 
        (init?.method === 'POST' || init?.method === 'PUT' || init?.method === 'PATCH') &&
        init?.body &&
        typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json')
    }
    
    const modifiedInit: RequestInit = {
      ...init,
      headers,
      // Add timeout to prevent hanging requests
      signal: init?.signal || AbortSignal.timeout(30000), // 30 second timeout
    }
    
    console.log('Fetch wrapper: Starting request', {
      url,
      method: modifiedInit.method || 'GET',
      hasBody: !!modifiedInit.body,
      headers: modifiedInit.headers,
    })

    try {
      const response = await originalFetch(input, modifiedInit)
      
      console.log('Fetch wrapper: Request completed', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })
      
      // Log response details for debugging 406 errors
      if (response.status === 406) {
        console.error('406 Not Acceptable error:', {
          url,
          requestHeaders: modifiedInit.headers,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          acceptHeader: response.headers.get('accept'),
          contentType: response.headers.get('content-type'),
        })
      }
      
      return response
    } catch (error) {
      console.error('Fetch wrapper: Request failed', {
        url,
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name,
        errorStack: error instanceof Error ? error.stack : undefined,
        input,
        init,
      })
      
      // Re-throw the error to maintain normal error flow
      throw error
    }
  }
}