import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAPIError, handleValidationError } from '@/lib/api/errors'
import { 
  createSuccessResponse,
  logAPIRequest,
  getCacheHeaders,
  addSecurityHeaders
} from '@/lib/api/utils'
import { 
  searchSuggestionsSchema,
  type SearchSuggestions 
} from '@/lib/api/schemas'

interface Suggestion {
  type: 'category' | 'location' | 'item' | 'tag'
  value: string
  display: string
  count?: number
  icon?: string
}

/**
 * GET /api/search/suggestions - Get search autocomplete suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    logAPIRequest(request, 'SEARCH_SUGGESTIONS')

    // Parse and validate query parameters
    // Filter out null values to prevent Zod coercion errors
    const params = {
      query: searchParams.get('query'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null)
    )
    
    const query: SearchSuggestions = searchSuggestionsSchema.parse(cleanParams)

    if (!query.query || query.query.length < 2) {
      return NextResponse.json(
        createSuccessResponse([], 'Query too short for suggestions')
      )
    }

    const supabase = await createServerSupabaseClient()
    const suggestions: Suggestion[] = []
    const searchTerm = query.query.toLowerCase().trim()

    // Category suggestions
    if (query.type === 'all' || query.type === 'categories') {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .ilike('name', `%${searchTerm}%`)
        .limit(Math.min(query.limit, 5))

      if (categories) {
        for (const category of categories) {
          // Get listing count for this category
          const { count } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('status', 'active')

          suggestions.push({
            type: 'category',
            value: category.slug,
            display: category.name,
            count: count || 0,
            icon: category.icon || undefined
          })
        }
      }
    }

    // Location suggestions
    if (query.type === 'all' || query.type === 'locations') {
      const { data: locations } = await supabase
        .from('listings')
        .select('address')
        .eq('status', 'active')
        .not('address', 'is', null)
        .ilike('address', `%${searchTerm}%`)
        .limit(Math.min(query.limit, 5))

      if (locations) {
        // Extract unique city/area names from addresses
        const locationSet = new Set<string>()
        
        locations.forEach(listing => {
          if (listing.address) {
            // Extract city/area from address (simple approach)
            const parts = listing.address.split(',')
            if (parts.length >= 2) {
              const cityArea = parts[parts.length - 2].trim()
              if (cityArea.toLowerCase().includes(searchTerm)) {
                locationSet.add(cityArea)
              }
            }
          }
        })

        // Convert to suggestions with counts
        for (const location of Array.from(locationSet).slice(0, 5)) {
          const { count } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .ilike('address', `%${location}%`)

          suggestions.push({
            type: 'location',
            value: location,
            display: location,
            count: count || 0
          })
        }
      }
    }

    // Item/listing suggestions
    if (query.type === 'all' || query.type === 'items') {
      const { data: items } = await supabase
        .from('listings')
        .select('id, title, price_per_day, photos')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%, description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(Math.min(query.limit, 5))

      if (items) {
        items.forEach(item => {
          suggestions.push({
            type: 'item',
            value: item.title,
            display: `${item.title} - $${item.price_per_day}/day`,
            count: 1
          })
        })
      }
    }

    // Tag suggestions
    if (query.type === 'all' || query.type === 'items') {
      const { data: taggedListings } = await supabase
        .from('listings')
        .select('tags')
        .eq('status', 'active')
        .not('tags', 'is', null)
        .limit(100) // Get a sample to extract tags from

      if (taggedListings) {
        const tagCounts = new Map<string, number>()
        
        taggedListings.forEach(listing => {
          if (listing.tags) {
            listing.tags.forEach((tag: string) => {
              const lowerTag = tag.toLowerCase()
              if (lowerTag.includes(searchTerm)) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
              }
            })
          }
        })

        // Convert to suggestions, sorted by frequency
        Array.from(tagCounts.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .forEach(([tag, count]) => {
            suggestions.push({
              type: 'tag',
              value: tag,
              display: `#${tag}`,
              count
            })
          })
      }
    }

    // Sort suggestions by relevance and count
    suggestions.sort((a, b) => {
      // Exact matches first
      const aExact = a.display.toLowerCase() === searchTerm
      const bExact = b.display.toLowerCase() === searchTerm
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // Then by count (popularity)
      const aCount = a.count || 0
      const bCount = b.count || 0
      if (aCount !== bCount) return bCount - aCount

      // Then alphabetically
      return a.display.localeCompare(b.display)
    })

    // Limit final results
    const finalSuggestions = suggestions.slice(0, query.limit)

    const response = NextResponse.json(
      createSuccessResponse(
        finalSuggestions,
        `Found ${finalSuggestions.length} suggestions`
      )
    )

    // Cache suggestions for better performance
    const cacheHeaders = getCacheHeaders(300, 60) // 5 min cache, 1 min revalidate
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
 * OPTIONS /api/search/suggestions - Handle preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}