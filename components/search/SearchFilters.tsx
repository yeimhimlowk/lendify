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
import { Calendar as CalendarIcon, Filter, X } from "lucide-react"

export interface SearchFiltersProps {
  priceRange: [number, number]
  onPriceRangeChange: (range: [number, number]) => void
  maxPrice?: number
  categories: string[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  location: string
  onLocationChange: (location: string) => void
  availableDate: Date | undefined
  onAvailableDateChange: (date: Date | undefined) => void
  sortBy: string
  onSortByChange: (sortBy: string) => void
  onClearFilters: () => void
  className?: string
}

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "recent", label: "Recently Added" },
]

export default function SearchFilters({
  priceRange,
  onPriceRangeChange,
  maxPrice = 1000,
  categories,
  selectedCategories,
  onCategoriesChange,
  location,
  onLocationChange,
  availableDate,
  onAvailableDateChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  className,
}: SearchFiltersProps) {

  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, category])
    } else {
      onCategoriesChange(selectedCategories.filter((c) => c !== category))
    }
  }

  const hasActiveFilters =
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice ||
    selectedCategories.length > 0 ||
    location.trim() !== "" ||
    availableDate !== undefined ||
    sortBy !== "relevance"

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

      {/* Location */}
      <div>
        <Label htmlFor="location" className="text-base font-semibold mb-4 block">
          Location
        </Label>
        <div className="relative">
          <Input
            id="location"
            placeholder="Enter location..."
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full"
          />
          {/* Location suggestions would be shown here when API is integrated */}
        </div>
      </div>

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
        <h2 className="text-lg font-semibold mb-6">Filters</h2>
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
                  {selectedCategories.length +
                    (location ? 1 : 0) +
                    (availableDate ? 1 : 0) +
                    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0)}
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