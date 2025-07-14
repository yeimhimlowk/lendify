import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware'
import { handleAPIError, handleAuthError, handleValidationError } from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  createCategorySchema,
  categoryQuerySchema,
  type CreateCategoryInput 
} from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryWithDetails = Category & {
  children?: Category[]
  parent?: Category
  _count?: {
    listings: number
    active_listings: number
  }
}

/**
 * GET /api/categories - Get all categories with optional hierarchy and counts
 */
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'GET_CATEGORIES')

    // Parse query parameters
    // Filter out null values to prevent Zod coercion errors
    const params = {
      parent_id: searchParams.get('parent_id'),
      include_children: searchParams.get('include_children'),
      include_counts: searchParams.get('include_counts')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query = categoryQuerySchema.parse(cleanParams)

    const supabase = await createServerSupabaseClient()

    // Build base query
    let dbQuery = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    // Filter by parent_id if specified
    if (query.parent_id) {
      dbQuery = dbQuery.eq('parent_id', query.parent_id)
    } else {
      // Default to root categories (no parent)
      dbQuery = dbQuery.is('parent_id', null)
    }

    const { data: categories, error } = await dbQuery

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!categories) {
      return NextResponse.json(createSuccessResponse([]))
    }

    // Enhance categories with additional data
    const enhancedCategories: CategoryWithDetails[] = await Promise.all(
      categories.map(async (category) => {
        const enhanced: CategoryWithDetails = { ...category }

        // Include children if requested
        if (query.include_children) {
          const { data: children } = await supabase
            .from('categories')
            .select('*')
            .eq('parent_id', category.id)
            .order('name', { ascending: true })

          enhanced.children = children || []
        }

        // Include listing counts if requested
        if (query.include_counts) {
          // Get total listings count
          const { count: totalListings } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)

          // Get active listings count
          const { count: activeListings } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('status', 'active')

          enhanced._count = {
            listings: totalListings || 0,
            active_listings: activeListings || 0
          }
        }

        return enhanced
      })
    )

    const response = NextResponse.json(
      createSuccessResponse(
        enhancedCategories,
        `Found ${enhancedCategories.length} categories`
      )
    )

    // Cache categories for better performance
    const cacheHeaders = getCacheHeaders(1800, 300) // 30 min cache, 5 min revalidate
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * POST /api/categories - Create a new category (Admin only)
 * Note: In a production app, you'd want proper admin role checking
 */
async function handlePOST(request: NextRequest) {
  try {
    logAPIRequest(request, 'CREATE_CATEGORY')

    // Get authenticated user (in production, check for admin role)
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData: CreateCategoryInput = createCategorySchema.parse(body)

    // Check if category with same slug exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', validatedData.slug)
      .single()

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 409 }
      )
    }

    // Validate parent category if specified
    if (validatedData.parent_id) {
      const { data: parentCategory, error: parentError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', validatedData.parent_id)
        .single()

      if (parentError || !parentCategory) {
        return NextResponse.json(
          { error: 'Invalid parent category ID' },
          { status: 400 }
        )
      }
    }

    // Create the category
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`)
    }

    logAPIRequest(request, 'CREATE_CATEGORY_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        category,
        'Category created successfully'
      ),
      { status: 201 }
    )

    return addSecurityHeaders(response)

  } catch (error: any) {
    if (error.message.includes('Authentication')) {
      return handleAuthError(error.message)
    }
    if (error.name === 'ZodError') {
      return handleValidationError(error)
    }
    return handleAPIError(error)
  }
}

/**
 * OPTIONS /api/categories - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.public(), handleGET)
export const POST = withMiddleware(apiMiddleware.authenticated(), handlePOST)