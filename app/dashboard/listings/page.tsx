"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/lib/auth/use-auth"
import { Button } from "@/components/ui/button"
import ListingCard from "@/components/listings/ListingCard"
import {
  Plus,
  Package,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  AlertCircle,
  Loader2,
  CheckCircle,
  X
} from "lucide-react"

// Define listing status type
type ListingStatus = 'all' | 'active' | 'draft' | 'archived'

// Define listing type based on API response
interface Listing {
  id: string
  title: string
  photos: string[]
  price_per_day: number
  address?: string
  rating?: number
  rating_count?: number
  status: 'active' | 'draft' | 'archived'
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    slug: string
  }
  _count?: {
    bookings: number
    active_bookings: number
  }
}

// Status filter tabs
const statusTabs = [
  { id: 'all' as ListingStatus, label: 'All Listings', count: 0 },
  { id: 'active' as ListingStatus, label: 'Active', count: 0 },
  { id: 'draft' as ListingStatus, label: 'Draft', count: 0 },
  { id: 'archived' as ListingStatus, label: 'Archived', count: 0 }
]

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Enhanced listing card with management actions
function MyListingCard({ listing }: { listing: Listing }) {
  const [showDropdown, setShowDropdown] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element
        if (!target.closest('.dropdown-container')) {
          setShowDropdown(false)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  return (
    <div className="group relative">
      <div className="relative">
        <ListingCard listing={listing} />
        
        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={listing.status} />
        </div>

        {/* Actions dropdown */}
        <div className="absolute top-3 right-12">
          <div className="relative dropdown-container">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/80 hover:bg-white transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                    View Listing
                  </Link>
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Listing
                  </Link>
                  <Link
                    href={`/dashboard/listings/${listing.id}/analytics`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Link>
                  <hr className="my-1" />
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this listing?')) {
                        // TODO: Implement delete functionality
                        console.log('Delete listing:', listing.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Listing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listing stats */}
      {listing._count && (
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{listing._count.bookings} bookings</span>
          </div>
          {listing._count.active_bookings > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{listing._count.active_bookings} active</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Empty state component
function EmptyState({ status }: { status: ListingStatus }) {
  const getEmptyStateContent = () => {
    switch (status) {
      case 'active':
        return {
          title: 'No active listings',
          description: 'You don\'t have any active listings yet. Create your first listing to start earning!',
          action: 'Create Listing'
        }
      case 'draft':
        return {
          title: 'No draft listings',
          description: 'You don\'t have any draft listings. Drafts are saved automatically when you start creating a listing.',
          action: 'Create Listing'
        }
      case 'archived':
        return {
          title: 'No archived listings',
          description: 'You don\'t have any archived listings. Archived listings are hidden from renters.',
          action: 'View All Listings'
        }
      default:
        return {
          title: 'No listings yet',
          description: 'Start earning by renting out your unused items. Create your first listing today!',
          action: 'Create Your First Listing'
        }
    }
  }

  const content = getEmptyStateContent()

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <Package className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {content.title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {content.description}
      </p>
      <Button asChild>
        <Link href="/host">
          <Plus className="h-4 w-4 mr-2" />
          {content.action}
        </Link>
      </Button>
    </div>
  )
}

// Component that handles search params - needs to be wrapped in Suspense
function MyListingsContent() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<ListingStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Check for success message
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowSuccessMessage(true)
      // Clear the query parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('new')
      router.replace(url.pathname + url.search, { scroll: false })
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 5000)
    }
  }, [searchParams, router])

  // Fetch listings
  useEffect(() => {
    if (!user) return

    const fetchListings = async () => {
      try {
        setLoading(true)
        setError(null)

        const statusParam = activeStatus === 'all' ? '' : `?status=${activeStatus}`
        const response = await fetch(`/api/listings/user/${user.id}${statusParam}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch listings')
        }

        const data = await response.json()
        setListings(data.data || [])
      } catch (err) {
        console.error('Error fetching listings:', err)
        setError('Failed to load listings. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [user, activeStatus])

  // Filter listings based on search query
  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate status counts
  const statusCounts = {
    all: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    draft: listings.filter(l => l.status === 'draft').length,
    archived: listings.filter(l => l.status === 'archived').length
  }

  // Update status tabs with counts
  const updatedStatusTabs = statusTabs.map(tab => ({
    ...tab,
    count: statusCounts[tab.id]
  }))

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-600 mt-1">
            Manage your rental listings and track their performance
          </p>
        </div>
        <Button asChild>
          <Link href="/host">
            <Plus className="h-4 w-4 mr-2" />
            Add New Listing
          </Link>
        </Button>
      </div>

      {/* Success message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">Listing created successfully!</p>
            <p className="text-green-700 text-sm">Your listing is now live and available for rental.</p>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-gray-200">
        {updatedStatusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeStatus === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                activeStatus === tab.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      )}

      {/* Listings grid */}
      {!loading && !error && (
        <>
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map((listing) => (
                <MyListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState status={activeStatus} />
          )}
        </>
      )}
    </div>
  )
}

// Loading component for Suspense fallback
function ListingsLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
    </div>
  )
}

// Main component with Suspense wrapper
export default function MyListingsPage() {
  return (
    <Suspense fallback={<ListingsLoading />}>
      <MyListingsContent />
    </Suspense>
  )
}