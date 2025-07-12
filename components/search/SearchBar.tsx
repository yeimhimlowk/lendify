"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchSuggestion {
  id: string
  text: string
  type?: "item" | "category" | "location"
}

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  suggestions?: SearchSuggestion[]
  onFetchSuggestions?: (query: string) => void
  isLoadingSuggestions?: boolean
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search for items to rent...",
  suggestions = [],
  onFetchSuggestions,
  isLoadingSuggestions = false,
  className,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Debounced fetch suggestions
  const debouncedFetchSuggestions = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (query.trim().length < 2) {
        setIsOpen(false)
        return
      }

      debounceTimerRef.current = setTimeout(() => {
        onFetchSuggestions?.(query)
        setIsOpen(true)
      }, 300)
    },
    [onFetchSuggestions]
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
    debouncedFetchSuggestions(newValue)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    setIsOpen(false)
    onSearch?.(suggestion.text)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSuggestionClick(suggestions[selectedIndex])
      } else {
        onSearch?.(value)
        setIsOpen(false)
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  // Handle clear
  const handleClear = () => {
    onChange("")
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Handle search
  const handleSearch = () => {
    onSearch?.(value)
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const getSuggestionIcon = (type?: string) => {
    switch (type) {
      case "category":
        return "📁"
      case "location":
        return "📍"
      default:
        return "🔍"
    }
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim().length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSearch}
            className="h-7"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && (value.trim().length >= 2 || suggestions.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {isLoadingSuggestions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2 text-sm",
                      selectedIndex === index && "bg-accent"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="text-base">
                      {getSuggestionIcon(suggestion.type)}
                    </span>
                    <span className="flex-1">{suggestion.text}</span>
                    {suggestion.type && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {suggestion.type}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  )
}