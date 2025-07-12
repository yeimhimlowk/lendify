# Search Components

This directory contains comprehensive search components for the Lendify app.

## Components

### SearchBar
A search input component with debounced autocomplete functionality.

**Props:**
- `value`: Current search query
- `onChange`: Handler for value changes
- `onSearch`: Handler for search submission
- `suggestions`: Array of search suggestions
- `onFetchSuggestions`: Handler to fetch suggestions (debounced)
- `isLoadingSuggestions`: Loading state for suggestions
- `placeholder`: Input placeholder text
- `className`: Additional CSS classes

**Features:**
- Debounced autocomplete (300ms delay)
- Keyboard navigation (arrow keys, enter, escape)
- Clear button
- Loading states
- Suggestion type icons (item, category, location)

### SearchFilters
A responsive filter sidebar that becomes a bottom sheet on mobile.

**Props:**
- `priceRange`: Current price range [min, max]
- `onPriceRangeChange`: Handler for price range changes
- `maxPrice`: Maximum price for the slider
- `categories`: Available categories array
- `selectedCategories`: Currently selected categories
- `onCategoriesChange`: Handler for category selection
- `location`: Current location filter
- `onLocationChange`: Handler for location changes
- `availableDate`: Selected availability date
- `onAvailableDateChange`: Handler for date changes
- `sortBy`: Current sort option
- `onSortByChange`: Handler for sort changes
- `onClearFilters`: Handler to clear all filters
- `className`: Additional CSS classes

**Features:**
- Price range slider
- Category checkboxes
- Location input (ready for autocomplete integration)
- Date picker for availability
- Sort dropdown
- Clear all filters button
- Mobile responsive (bottom sheet on small screens)
- Active filter count badge

### SearchResults
A grid layout component for displaying search results.

**Props:**
- `listings`: Array of listing objects
- `isLoading`: Loading state
- `totalCount`: Total number of results
- `className`: Additional CSS classes

**Features:**
- Responsive grid (1-4 columns based on screen size)
- Skeleton loading states
- Empty state with helpful suggestions
- Results count display
- Integration with existing ListingCard component

## Usage Example

```tsx
import { useState } from "react"
import SearchBar from "@/components/search/SearchBar"
import SearchFilters from "@/components/search/SearchFilters"
import SearchResults from "@/components/search/SearchResults"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [location, setLocation] = useState("")
  const [availableDate, setAvailableDate] = useState<Date | undefined>()
  const [sortBy, setSortBy] = useState("relevance")
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    // Fetch results from API
    const results = await fetchSearchResults({
      query,
      priceRange,
      categories: selectedCategories,
      location,
      availableDate,
      sortBy
    })
    setListings(results)
    setIsLoading(false)
  }

  const handleClearFilters = () => {
    setPriceRange([0, 1000])
    setSelectedCategories([])
    setLocation("")
    setAvailableDate(undefined)
    setSortBy("relevance")
  }

  return (
    <div>
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
      />
      
      <div className="flex gap-8">
        <SearchFilters
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          categories={["Electronics", "Tools", "Sports"]}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          location={location}
          onLocationChange={setLocation}
          availableDate={availableDate}
          onAvailableDateChange={setAvailableDate}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onClearFilters={handleClearFilters}
        />
        
        <SearchResults
          listings={listings}
          isLoading={isLoading}
          totalCount={listings.length}
        />
      </div>
    </div>
  )
}
```

## URL State Management

These components are designed to work with URL-based state management. You can sync the filter values with URL search params:

```tsx
const searchParams = useSearchParams()
const router = useRouter()

// Read from URL
const priceRange: [number, number] = [
  Number(searchParams.get("min_price") || 0),
  Number(searchParams.get("max_price") || 1000)
]

// Update URL
const updateURL = (filters: SearchFilters) => {
  const params = new URLSearchParams()
  params.set("q", filters.query)
  params.set("min_price", filters.priceRange[0].toString())
  params.set("max_price", filters.priceRange[1].toString())
  // ... other params
  router.push(`/search?${params.toString()}`)
}
```

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components for UI elements
- CSS variables for theme consistency
- Responsive design patterns

## Dependencies

- React
- shadcn/ui components (Button, Input, Slider, Checkbox, Calendar, Select, Popover, Sheet, Skeleton, Label)
- date-fns (for date formatting)
- lucide-react (for icons)