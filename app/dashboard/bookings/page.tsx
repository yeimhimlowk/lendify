'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/auth/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReviewPrompt } from '@/components/reviews/ReviewPrompt'
import { MessageUserIconButton } from '@/components/chat/MessageUserButton'
import BookingAgreementManager from '@/components/host/BookingAgreementManager'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react'

interface Booking {
  id: string
  listing_id: string
  renter_id: string
  owner_id: string
  rental_agreements?: Array<{
    id: string
    status: string
    created_at: string
    signed_by_owner: boolean
    signed_by_renter: boolean
    sent_at: string | null
    expires_at: string | null
  }>
  start_date: string
  end_date: string
  total_price: number
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  listing: {
    id: string
    title: string
    location?: string
    address?: string
    images?: string[]
    photos?: string[]
    price_per_day: number
  }
  renter?: {
    id: string
    full_name: string
    avatar_url: string
    email?: string
  }
  owner?: {
    id: string
    full_name: string
    avatar_url: string
    email?: string
  }
}

type BookingStatus = 'all' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
}

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  active: Calendar,
  completed: CheckCircle,
  cancelled: XCircle
}

type ViewMode = 'all' | 'guest' | 'host'

function BookingsContent() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [activeTab, setActiveTab] = useState<BookingStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
  // Check for success message
  useEffect(() => {
    if (searchParams.get('success') === 'agreement-signed') {
      setShowSuccessMessage(true)
      // Hide message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Fetch bookings function
  const fetchBookings = async () => {
    if (!user) {
      console.log('No user found, skipping bookings fetch')
      return
    }

    console.log('Fetching bookings for user:', user.id, user.email)

    try {
      setLoading(true)
      const response = await fetch('/api/bookings', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const data = await response.json()
      console.log('Bookings API response:', data)
      setBookings(data.bookings || data.data || [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('Failed to load bookings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch bookings data on mount
  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Filter bookings based on view mode, status and search
  useEffect(() => {
    let filtered = bookings

    // Filter by view mode
    if (viewMode === 'guest') {
      filtered = filtered.filter(booking => booking.renter_id === user?.id)
    } else if (viewMode === 'host') {
      filtered = filtered.filter(booking => booking.owner_id === user?.id)
    }

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(booking => booking.status === activeTab)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.listing.address || booking.listing.location || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredBookings(filtered)
  }, [bookings, activeTab, searchQuery, viewMode, user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getStatusCounts = () => {
    // Filter bookings by view mode first
    let viewFilteredBookings = bookings
    if (viewMode === 'guest') {
      viewFilteredBookings = bookings.filter(b => b.renter_id === user?.id)
    } else if (viewMode === 'host') {
      viewFilteredBookings = bookings.filter(b => b.owner_id === user?.id)
    }

    const counts = {
      all: viewFilteredBookings.length,
      pending: viewFilteredBookings.filter(b => b.status === 'pending').length,
      confirmed: viewFilteredBookings.filter(b => b.status === 'confirmed').length,
      active: viewFilteredBookings.filter(b => b.status === 'active').length,
      completed: viewFilteredBookings.filter(b => b.status === 'completed').length,
      cancelled: viewFilteredBookings.filter(b => b.status === 'cancelled').length
    }
    return counts
  }

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update booking status')
      }

      // Refresh bookings
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus as any }
          : booking
      ))
    } catch (err) {
      console.error('Error updating booking status:', err)
      setError('Failed to update booking status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getDaysCount = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const tabs = [
    { id: 'all' as BookingStatus, label: 'All Bookings' },
    { id: 'pending' as BookingStatus, label: 'Pending' },
    { id: 'confirmed' as BookingStatus, label: 'Confirmed' },
    { id: 'active' as BookingStatus, label: 'Active' },
    { id: 'completed' as BookingStatus, label: 'Completed' },
    { id: 'cancelled' as BookingStatus, label: 'Cancelled' }
  ]

  const counts = getStatusCounts()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">
            Manage your rental bookings and reservations
          </p>
        </div>
        <Button asChild>
          <Link href="/listings">
            Browse Items
          </Link>
        </Button>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Rental agreement signed successfully! The booking is now confirmed.
          </AlertDescription>
        </Alert>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => {
            setViewMode('all')
            setActiveTab('all')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Bookings
        </button>
        <button
          onClick={() => {
            setViewMode('guest')
            setActiveTab('all')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'guest'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Rentals
        </button>
        <button
          onClick={() => {
            setViewMode('host')
            setActiveTab('all')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'host'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Listings
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id 
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {viewMode === 'guest' 
              ? (activeTab === 'all' ? 'No rentals yet' : `No ${activeTab} rentals`)
              : viewMode === 'host'
              ? (activeTab === 'all' ? 'No bookings for your listings' : `No ${activeTab} bookings`)
              : (activeTab === 'all' ? 'No bookings yet' : `No ${activeTab} bookings`)
            }
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {viewMode === 'guest' 
              ? "You haven't rented any items yet. Start exploring items to rent!"
              : viewMode === 'host'
              ? "Your listings haven't received any bookings yet."
              : activeTab === 'all' 
              ? "You haven't made any bookings yet. Start exploring items to rent!"
              : `You don't have any ${activeTab} bookings at the moment.`
            }
          </p>
          <Button asChild>
            <Link href="/listings">Browse Items</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const StatusIcon = statusIcons[booking.status]
            const isOwner = user?.id === booking.owner_id
            
            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <Image
                          src={booking.listing.photos?.[0] || booking.listing.images?.[0] || '/placeholder-image.jpg'}
                          alt={booking.listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {booking.listing.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[booking.status]}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 gap-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {booking.listing.address || booking.listing.location || 'Unknown location'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getDaysCount(booking.start_date, booking.end_date)} days
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(booking.total_price)}
                          </span>
                          <span className="text-sm text-gray-500">total</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {isOwner ? (
                            <span>Rented by: {booking.renter?.full_name || 'Unknown'}</span>
                          ) : (
                            <span>Rented from: {booking.owner?.full_name || 'Unknown'}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/listings/${booking.listing_id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Item
                          </Link>
                        </Button>
                        
                        <MessageUserIconButton
                          userId={isOwner ? booking.renter_id : booking.owner_id}
                          userName={isOwner ? booking.renter?.full_name || undefined : booking.owner?.full_name || undefined}
                          bookingId={booking.id}
                          variant="outline"
                          size="sm"
                        />

                        <div className="dropdown-container relative">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDropdownOpen(dropdownOpen === booking.id ? null : booking.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          
                          {dropdownOpen === booking.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                              <div className="py-1">
                                {booking.status === 'pending' && isOwner && (
                                  <button 
                                    onClick={() => {
                                      handleStatusUpdate(booking.id, 'confirmed')
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    Confirm Booking
                                  </button>
                                )}
                                {booking.status === 'confirmed' && isOwner && (
                                  <button 
                                    onClick={() => {
                                      handleStatusUpdate(booking.id, 'active')
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    Mark as Active
                                  </button>
                                )}
                                {booking.status === 'active' && isOwner && (
                                  <button 
                                    onClick={() => {
                                      handleStatusUpdate(booking.id, 'completed')
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    Mark as Completed
                                  </button>
                                )}
                                {['pending', 'confirmed'].includes(booking.status) && (
                                  <button 
                                    onClick={() => {
                                      handleStatusUpdate(booking.id, 'cancelled')
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Cancel Booking
                                  </button>
                                )}
                                {booking.status === 'cancelled' && (
                                  <button 
                                    onClick={async () => {
                                      if (confirm('Are you sure you want to permanently delete this cancelled booking?')) {
                                        try {
                                          const response = await fetch(`/api/bookings/${booking.id}`, {
                                            method: 'DELETE'
                                          })
                                          if (response.ok) {
                                            // Remove booking from list
                                            setBookings(prev => prev.filter(b => b.id !== booking.id))
                                          }
                                        } catch (err) {
                                          console.error('Error deleting booking:', err)
                                        }
                                      }
                                      setDropdownOpen(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Delete Permanently
                                  </button>
                                )}
                                {isOwner && booking.status === 'confirmed' && (
                                  <Link
                                    href={`/dashboard/bookings/${booking.id}/agreement`}
                                    onClick={() => setDropdownOpen(null)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Manage Agreement
                                  </Link>
                                )}
                                <button 
                                  onClick={() => setDropdownOpen(null)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rental Agreement Section - Show for pending/confirmed bookings for both parties */}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {isOwner ? (
                          // Owner can create and manage agreements
                          <BookingAgreementManager
                            booking={{
                              id: booking.id,
                              start_date: booking.start_date,
                              end_date: booking.end_date,
                              status: booking.status,
                              listing: {
                                title: booking.listing.title
                              },
                              renter: {
                                full_name: booking.renter?.full_name || 'Unknown',
                                email: booking.renter?.email || ''
                              }
                            }}
                            agreements={booking.rental_agreements || []}
                            onAgreementCreated={() => {
                              // Refresh bookings to show new agreement
                              fetchBookings()
                            }}
                          />
                        ) : (
                          // Renter can view agreements
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">Rental Agreement</h4>
                              {booking.status === 'pending' && (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                  Waiting for owner to create agreement
                                </span>
                              )}
                            </div>
                            
                            {booking.rental_agreements && booking.rental_agreements.length > 0 ? (
                              <div className="space-y-2">
                                {booking.rental_agreements.map((agreement: any) => (
                                  <div key={agreement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-5 w-5 text-gray-500" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          Agreement #{agreement.id.slice(0, 8)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Status: {agreement.status === 'draft' ? 'Draft' : 
                                                  agreement.status === 'sent' ? 'Ready to Sign' :
                                                  agreement.status === 'signed' ? 'Fully Signed' : 
                                                  agreement.status}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {agreement.status === 'sent' && !agreement.signed_by_renter && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                          Action required
                                        </span>
                                      )}
                                      <Button variant="outline" size="sm" asChild>
                                        <Link href={`/agreements/${agreement.id}`}>
                                          <Eye className="h-4 w-4 mr-1" />
                                          {agreement.status === 'sent' && !agreement.signed_by_renter ? 'Sign' : 'View'}
                                        </Link>
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">
                                  No rental agreement yet
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  The owner will create one soon
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review Prompt for Completed Bookings */}
                    {booking.status === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <ReviewPrompt
                          booking={{
                            ...booking,
                            listing: {
                              title: booking.listing.title
                            } as any,
                            renter: {
                              id: booking.renter?.id || '',
                              full_name: booking.renter?.full_name || '',
                              avatar_url: booking.renter?.avatar_url || ''
                            } as any,
                            owner: {
                              id: booking.owner?.id || '',
                              full_name: booking.owner?.full_name || '',
                              avatar_url: booking.owner?.avatar_url || ''
                            } as any
                          }}
                          onReviewSubmitted={() => {
                            // Optionally refresh the bookings or show a success message
                            console.log('Review submitted for booking', booking.id)
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    }>
      <BookingsContent />
    </Suspense>
  )
}