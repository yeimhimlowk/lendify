export interface Listing {
  id: string
  title: string
  photos: string[]
  price_per_day: number
  address?: string
  rating?: number
  rating_count?: number
  owner?: {
    full_name: string
  }
  category?: string
  available_from?: Date
  description?: string
}

export interface SearchFilters {
  query?: string
  priceRange: [number, number]
  categories: string[]
  location?: string
  availableDate?: Date
  sortBy: SortOption
}

export type SortOption = 
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "recent"

export interface SearchSuggestion {
  id: string
  text: string
  type?: "item" | "category" | "location"
}

export interface SearchParams {
  q?: string
  min_price?: string
  max_price?: string
  categories?: string
  location?: string
  available_date?: string
  sort?: string
  page?: string
  limit?: string
}