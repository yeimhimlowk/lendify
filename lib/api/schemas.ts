import { z } from 'zod'

/**
 * Common validation schemas
 */
export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const phoneSchema = z.string().min(10).max(15)
export const urlSchema = z.string().url()
export const dateSchema = z.string().datetime()

/**
 * Location schema for PostGIS point data
 */
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

/**
 * Listing validation schemas
 */
export const listingStatusSchema = z.enum(['active', 'inactive', 'draft', 'archived'])
export const conditionSchema = z.enum(['new', 'like_new', 'good', 'fair', 'poor'])

export const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  category_id: uuidSchema,
  price_per_day: z.number().min(0.01),
  price_per_week: z.number().min(0.01).optional(),
  price_per_month: z.number().min(0.01).optional(),
  deposit_amount: z.number().min(0).optional(),
  condition: conditionSchema,
  address: z.string().min(5).max(500),
  location: locationSchema,
  photos: z.array(z.string().url()).min(1).max(10),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  availability: z.record(z.boolean()).optional(),
  status: listingStatusSchema.default('draft')
})

export const updateListingSchema = createListingSchema.partial()

export const listingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: conditionSchema.optional(),
  tags: z.string().optional(), // Comma-separated tags
  status: listingStatusSchema.optional(),
  sortBy: z.enum(['created_at', 'price_per_day', 'title', 'updated_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).default(10), // km
  featured: z.coerce.boolean().optional()
})

/**
 * Booking validation schemas
 */
export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'active', 'completed', 'cancelled'])

export const createBookingSchema = z.object({
  listing_id: uuidSchema,
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  total_price: z.number().min(0.01)
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"]
})

export const updateBookingSchema = z.object({
  status: bookingStatusSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  total_price: z.number().min(0.01).optional()
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) > new Date(data.start_date)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

export const bookingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: bookingStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  listing_id: uuidSchema.optional(),
  renter_id: uuidSchema.optional(),
  owner_id: uuidSchema.optional(),
  sortBy: z.enum(['created_at', 'start_date', 'end_date', 'total_price']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * User/Profile validation schemas
 */
export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: phoneSchema.optional(),
  address: z.string().min(5).max(500).optional(),
  location: locationSchema.optional(),
  avatar_url: urlSchema.optional()
})

export const userQuerySchema = z.object({
  include_stats: z.coerce.boolean().default(false),
  include_reviews: z.coerce.boolean().default(false)
})

/**
 * Category validation schemas
 */
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  icon: z.string().min(1).max(50).optional(),
  parent_id: uuidSchema.optional()
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryQuerySchema = z.object({
  parent_id: uuidSchema.optional(),
  include_children: z.coerce.boolean().default(false),
  include_counts: z.coerce.boolean().default(false)
})

/**
 * Search validation schemas
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  location: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).default(10),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: conditionSchema.optional(),
  tags: z.string().optional(),
  available_from: z.string().datetime().optional(),
  available_to: z.string().datetime().optional(),
  sortBy: z.enum(['relevance', 'price_per_day', 'created_at', 'distance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const searchSuggestionsSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(10),
  type: z.enum(['all', 'categories', 'locations', 'items']).default('all')
})

/**
 * AI validation schemas
 */
export const analyzePhotosSchema = z.object({
  photos: z.array(z.string().url()).min(1).max(10),
  listing_id: uuidSchema.optional(),
  analysis_type: z.enum(['description', 'condition', 'pricing', 'tags']).default('description')
})

export const generateContentSchema = z.object({
  type: z.enum(['title', 'description', 'tags']),
  context: z.object({
    category: z.string().optional(),
    condition: conditionSchema.optional(),
    price_range: z.string().optional(),
    photos: z.array(z.string().url()).optional(),
    existing_content: z.string().optional()
  }),
  tone: z.enum(['professional', 'casual', 'friendly', 'technical']).default('friendly'),
  length: z.enum(['short', 'medium', 'long']).default('medium')
})

export const priceSuggestionSchema = z.object({
  category_id: uuidSchema,
  condition: conditionSchema,
  location: locationSchema,
  photos: z.array(z.string().url()).optional(),
  description: z.string().optional(),
  comparable_listings: z.array(uuidSchema).optional()
})

/**
 * Review validation schemas
 */
export const createReviewSchema = z.object({
  booking_id: uuidSchema,
  reviewee_id: uuidSchema,
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(1000).optional()
})

export const reviewQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  reviewer_id: uuidSchema.optional(),
  reviewee_id: uuidSchema.optional(),
  booking_id: uuidSchema.optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sortBy: z.enum(['created_at', 'rating']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * Message validation schemas
 */
export const createMessageSchema = z.object({
  recipient_id: uuidSchema,
  content: z.string().min(1).max(5000),
  booking_id: uuidSchema.optional()
})

export const messageQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  conversation_with: uuidSchema.optional(),
  booking_id: uuidSchema.optional(),
  unread_only: z.coerce.boolean().default(false),
  sortBy: z.enum(['created_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * Analytics validation schemas
 */
export const analyticsQuerySchema = z.object({
  listing_id: uuidSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum(['views', 'clicks', 'bookings', 'revenue'])).optional()
})

/**
 * Export type definitions for better TypeScript support
 */
export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
export type ListingQuery = z.infer<typeof listingQuerySchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type BookingQuery = z.infer<typeof bookingQuerySchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>
export type SearchSuggestions = z.infer<typeof searchSuggestionsSchema>
export type AnalyzePhotosInput = z.infer<typeof analyzePhotosSchema>
export type GenerateContentInput = z.infer<typeof generateContentSchema>
export type PriceSuggestionInput = z.infer<typeof priceSuggestionSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>