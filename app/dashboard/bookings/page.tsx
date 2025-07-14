'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@/lib/auth/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  MessageSquare,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface Booking {
  id: string
  listing_id: string
  renter_id: string
  owner_id: string
  start_date: string
  end_date: string
  total_price: number
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  listing: {
    id: string
    title: string
    location: string
    images: string[]
    price_per_day: number
  }
  renter?: {
    id: string
    full_name: string
    avatar_url: string
  }
  owner?: {
    id: string
    full_name: string
    avatar_url: string
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

export default function BookingsPage() {
  const { user } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BookingStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  // Fetch bookings data
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return

      try {
        setLoading(true)
        const response = await fetch('/api/bookings', {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch bookings')
        }

        const data = await response.json()
        setBookings(data.bookings || [])
      } catch (err) {
        console.error('Error fetching bookings:', err)
        setError('Failed to load bookings. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [user])

  // Filter bookings based on status and search
  useEffect(() => {
    let filtered = bookings

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(booking => booking.status === activeTab)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.listing.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredBookings(filtered)
  }, [bookings, activeTab, searchQuery])

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
    const counts = {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      active: bookings.filter(b => b.status === 'active').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    }
    return counts
  }

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
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
            {activeTab === 'all' ? 'No bookings yet' : `No ${activeTab} bookings`}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {activeTab === 'all' 
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
                          src={booking.listing.images[0] || '/placeholder-image.jpg'}
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
                            {booking.listing.location}
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
                        
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>

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