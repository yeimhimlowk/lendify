"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Filter, X, MapPin, Crosshair } from "lucide-react"

export interface SearchFiltersProps {
  priceRange: [number, number]
  onPriceRangeChange: (range: number[]) => void
  maxPrice?: number
  categories: string[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  condition?: string
  onConditionChange: (condition: string) => void
  location: string
  onLocationChange: (location: string) => void
  coordinates?: { lat: number; lng: number }
  onCoordinatesChange: (coordinates: { lat: number; lng: number } | undefined) => void
  radius: number
  onRadiusChange: (radius: number) => void
  availableDate: Date | undefined
  onAvailableDateChange: (date: Date | undefined) => void
  sortBy: string
  onSortByChange: (sortBy: string) => void
  onClearFilters: () => void
  onUseMyLocation: () => void
  isGettingLocation?: boolean
  className?: string
}

const sortOptions = [
  { value: "relevance", label: "Most Relevant" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "distance", label: "Distance" },
]

export default function SearchFilters({
  priceRange,
  onPriceRangeChange,
  maxPrice = 1000,
  categories,
  selectedCategories,
  onCategoriesChange,
  condition,
  onConditionChange,
  location,
  onLocationChange,
  coordinates,
  onCoordinatesChange,
  radius,
  onRadiusChange,
  availableDate,
  onAvailableDateChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  onUseMyLocation,
  isGettingLocation = false,
  className,
}: SearchFiltersProps) {

  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, category])
    } else {
      onCategoriesChange(selectedCategories.filter((c) => c !== category))
    }
  }

  const activeFilterCount = [
    priceRange[0] > 0 || priceRange[1] < maxPrice,
    selectedCategories.length > 0,
    condition !== undefined && condition !== "",
    location.trim() !== "",
    coordinates !== undefined,
    radius !== 10,
    availableDate !== undefined,
    sortBy && sortBy !== "relevance"
  ].filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Price Range
        </Label>
        <div className="space-y-3">
          <Slider
            value={priceRange}
            onValueChange={onPriceRangeChange}
            max={maxPrice}
            step={10}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              ${priceRange[0]}
            </span>
            <span className="text-muted-foreground">
              ${priceRange[1]}
            </span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Categories
        </Label>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={(checked) =>
                  handleCategoryToggle(category, checked as boolean)
                }
              />
              <label
                htmlFor={category}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Condition Filter */}
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Condition
        </Label>
        <Select 
          value={condition} 
          onValueChange={(value) => onConditionChange(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="like_new">Like New</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
          </SelectContent>
        </Select>
        {condition && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onConditionChange('')}
            className="mt-2 h-7 text-xs"
          >
            Clear condition
          </Button>
        )}
      </div>

      {/* Location */}
      <div>
        <Label htmlFor="location" className="text-base font-semibold mb-4 block">
          Location
        </Label>
        <div className="space-y-3">
          <div className="relative">
            <Input
              id="location"
              placeholder="Enter location..."
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full"
            />
            <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Use My Location Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onUseMyLocation}
            disabled={isGettingLocation}
            className="w-full gap-2"
          >
            <Crosshair className={cn("h-4 w-4", isGettingLocation && "animate-spin")} />
            {isGettingLocation ? "Getting location..." : "Use my location"}
          </Button>
          
          {/* Current coordinates display */}
          {coordinates && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <div className="flex items-center justify-between">
                <span>Current search location</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCoordinatesChange(undefined)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-1">
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Radius Filter */}
      {coordinates && (
        <div>
          <Label className="text-base font-semibold mb-4 block">
            Search Radius
          </Label>
          <div className="space-y-3">
            <Slider
              value={[radius]}
              onValueChange={(value) => onRadiusChange(value[0])}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">1 km</span>
              <span className="text-muted-foreground font-medium">
                {radius} km
              </span>
              <span className="text-muted-foreground">50 km</span>
            </div>
          </div>
        </div>
      )}

      {/* Availability Date */}
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Available From
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !availableDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {availableDate ? format(availableDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={availableDate}
              onSelect={onAvailableDateChange}
              initialFocus
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Sort By */}
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Sort By
        </Label>
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sorting" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="w-full"
        >
          <X className="mr-2 h-4 w-4" />
          Clear All Filters
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block w-64 p-6 border-r bg-background h-fit sticky top-4",
          className
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Filters</h2>
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <FilterContent />
      </aside>

      {/* Mobile Filter Sheet */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Refine your search results
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 overflow-y-auto h-[calc(100%-80px)] pb-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}