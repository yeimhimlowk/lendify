import { NextRequest, NextResponse } from 'next/server'
// import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware' // Removed for auth cleanup
import { handleAPIError, handleValidationError } from '@/lib/api/errors'
import { 
  extractPagination,
  extractSort,
  logAPIRequest
} from '@/lib/api/utils'
import { uuidSchema } from '@/lib/api/schemas'
// import type { Database } from '@/lib/supabase/types'

// type ListingWithDetails = Database['public']['Tables']['listings']['Row'] & {
//   category?: Database['public']['Tables']['categories']['Row']
//   owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
// }

/**
 * GET /api/categories/[id]/listings - Get all listings in a specific category
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_CATEGORY_LISTINGS')

    // Validate category ID format
    const validationResult = uuidSchema.safeParse(id)
    if (!validationResult.success) {
      return handleValidationError(validationResult.error)
    }
    const _categoryId = validationResult.data

    // Parse pagination and sorting parameters
    const _pagination = extractPagination(searchParams)
    const _sort = extractSort(searchParams)

    // Additional filters
    const _minPrice = searchParams.get('minPrice')
    const _maxPrice = searchParams.get('maxPrice')
    const _condition = searchParams.get('condition')
    const _location = searchParams.get('location')
    const _latitude = searchParams.get('latitude')
    const _longitude = searchParams.get('longitude')
    const _radius = searchParams.get('radius') || '10'

    // TODO: Replace with direct database access - auth removed
    // const supabase = await createServerSupabaseClient()
    throw new Error('Database access temporarily disabled - authentication removed')

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/categories/[id]/listings - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.public(), handleGET)