/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
// import { createServerSupabaseClient } from '@/lib/supabase/server' // Removed for auth cleanup
import { withMiddleware, apiMiddleware } from '@/lib/api/middleware' // Re-enabled for build fix
import { 
  handleAPIError, 
  handleAuthError, // Re-enabled for build fix
  handleNotFoundError,
  handleValidationError 
} from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  updateCategorySchema,
  uuidSchema,
  type UpdateCategoryInput 
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
 * GET /api/categories/[id] - Get single category by ID
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'GET_CATEGORY')

    // Validate UUID format  
    const validationResult = uuidSchema.safeParse(id)
    if (!validationResult.success) {
      return handleValidationError(validationResult.error)
    }
    const categoryId = validationResult.data

    // TODO: Replace with direct database access - auth removed
    // const supabase = await createServerSupabaseClient()
    const supabase: any = null // Temporary fix for build
    throw new Error('Database access temporarily disabled - authentication removed')

    // Get category with parent information
    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        *,
        parent:categories!categories_parent_id_fkey(*)
      `)
      .eq('id', categoryId as any)
      .single()

    if (error || !category) {
      return handleNotFoundError('Category')
    }

    // Get children categories
    const { data: children } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', categoryId as any)
      .order('name', { ascending: true })

    // Get listing counts
    const [totalListingsResult, activeListingsResult] = await Promise.all([
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId as any),
      
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId as any)
        .eq('status', 'active' as any)
    ])

    const categoryWithDetails: CategoryWithDetails = {
      ...category,
      parent: Array.isArray(category.parent) ? category.parent[0] : category.parent,
      children: children || [],
      _count: {
        listings: totalListingsResult.count || 0,
        active_listings: activeListingsResult.count || 0
      }
    }

    const response = NextResponse.json(
      createSuccessResponse(categoryWithDetails)
    )

    // Cache category details
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
 * PUT /api/categories/[id] - Update category (Admin only)
 */
async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'UPDATE_CATEGORY')

    // TODO: Replace with proper admin check - auth removed
    // const supabase = await createServerSupabaseClient()
    const supabase: any = null // Temporary fix for build
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    throw new Error('Admin functionality temporarily disabled - authentication removed')

    // Validate UUID format
    const categoryId = uuidSchema.parse(id)

    // Parse and validate request body
    const body = await request.json()
    const validatedData: UpdateCategoryInput = updateCategorySchema.parse(body)

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId as any)
      .single()

    if (fetchError || !existingCategory) {
      return handleNotFoundError('Category')
    }

    // Check if slug is being changed and if new slug already exists
    if (validatedData.slug && validatedData.slug !== existingCategory.slug) {
      const { data: slugExists } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', validatedData.slug)
        .neq('id', categoryId)
        .single()

      if (slugExists) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Validate parent category if being changed
    if (validatedData.parent_id) {
      // Prevent circular references
      if (validatedData.parent_id === categoryId) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 }
        )
      }

      // Check if parent exists
      const { data: parentCategory, error: parentError } = await supabase
        .from('categories')
        .select('id, parent_id')
        .eq('id', validatedData.parent_id)
        .single()

      if (parentError || !parentCategory) {
        return NextResponse.json(
          { error: 'Invalid parent category ID' },
          { status: 400 }
        )
      }

      // Prevent deep nesting (check if parent's parent would create a cycle)
      if (parentCategory.parent_id === categoryId) {
        return NextResponse.json(
          { error: 'This would create a circular reference' },
          { status: 400 }
        )
      }
    }

    // Update the category
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update(validatedData)
      .eq('id', categoryId as any)
      .select(`
        *,
        parent:categories!categories_parent_id_fkey(id, name, slug, icon)
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`)
    }

    logAPIRequest(request, 'UPDATE_CATEGORY_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        updatedCategory,
        'Category updated successfully'
      )
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
 * DELETE /api/categories/[id] - Delete category (Admin only)
 */
async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logAPIRequest(request, 'DELETE_CATEGORY')

    // TODO: Replace with proper admin check - auth removed
    // const supabase = await createServerSupabaseClient()
    const supabase: any = null // Temporary fix for build
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    throw new Error('Admin functionality temporarily disabled - authentication removed')

    // Validate UUID format
    const categoryId = uuidSchema.parse(id)

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId as any)
      .single()

    if (fetchError || !existingCategory) {
      return handleNotFoundError('Category')
    }

    // Check if category has children
    const { data: children, error: childrenError } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', categoryId as any)

    if (childrenError) {
      throw new Error(`Failed to check for child categories: ${childrenError.message}`)
    }

    if (children && children.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with child categories',
          details: 'Move or delete child categories first'
        },
        { status: 409 }
      )
    }

    // Check if category has listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('category_id', categoryId)

    if (listingsError) {
      throw new Error(`Failed to check for category listings: ${listingsError.message}`)
    }

    if (listings && listings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with existing listings',
          details: 'Move or delete all listings in this category first'
        },
        { status: 409 }
      )
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId as any)

    if (deleteError) {
      throw new Error(`Failed to delete category: ${deleteError.message}`)
    }

    logAPIRequest(request, 'DELETE_CATEGORY_SUCCESS', user.id)

    const response = NextResponse.json(
      createSuccessResponse(
        null,
        'Category deleted successfully'
      )
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
 * OPTIONS /api/categories/[id] - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Export wrapped handlers with middleware
export const GET = withMiddleware(apiMiddleware.public(), handleGET)
export const PUT = withMiddleware(apiMiddleware.public(), handlePUT)
export const DELETE = withMiddleware(apiMiddleware.public(), handleDELETE)