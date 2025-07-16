"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookingCalendar } from "./BookingCalendar"
import { Calendar, CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface BookingFormProps {
  listingId: string
  listingTitle: string
  pricePerDay: number
  ownerId: string
  className?: string
}

interface BookingData {
  listing_id: string
  start_date: string
  end_date: string
  total_price: number
}

type BookingStatus = 'selecting' | 'confirming' | 'processing' | 'success' | 'error'

export function BookingForm({
  listingId,
  listingTitle,
  pricePerDay,
  ownerId,
  className
}: BookingFormProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>()
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('selecting')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingDates, setIsLoadingDates] = useState(true)

  // Function to fetch unavailable dates
  const fetchUnavailableDates = async () => {
    try {
      setIsLoadingDates(true)
      const supabase = createClient()
      
      // Fetch confirmed/active bookings for this listing
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('start_date, end_date')
        .eq('listing_id', listingId)
        .in('status', ['confirmed', 'active'])
      
      if (error) {
        console.error('Error fetching bookings:', error)
        return
      }

      // Convert booking date ranges to unavailable date array
      const unavailable: Date[] = []
      bookings?.forEach(booking => {
        const start = new Date(booking.start_date)
        const end = new Date(booking.end_date)
        const current = new Date(start)
        
        while (current <= end) {
          unavailable.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }
      })
      
      setUnavailableDates(unavailable)
    } catch (error) {
      console.error('Error fetching unavailable dates:', error)
    } finally {
      setIsLoadingDates(false)
    }
  }

  // Fetch unavailable dates on component mount
  useEffect(() => {
    fetchUnavailableDates()
  }, [listingId])

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range)
    if (bookingStatus === 'error') {
      setBookingStatus('selecting')
      setError(null)
    }
  }

  const handleConfirmBooking = () => {
    if (selectedRange?.from && selectedRange?.to) {
      setBookingStatus('confirming')
    }
  }

  const handleSubmitBooking = async () => {
    if (!selectedRange?.from || !selectedRange?.to) return

    setBookingStatus('processing')
    setError(null)

    try {
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError('Please log in to make a booking')
        setBookingStatus('error')
        return
      }

      // Prevent self-booking
      if (user.id === ownerId) {
        setError('You cannot book your own listing')
        setBookingStatus('error')
        return
      }

      const totalDays = differenceInDays(selectedRange.to, selectedRange.from)
      const totalPrice = totalDays * pricePerDay

      const bookingData: BookingData = {
        listing_id: listingId,
        start_date: selectedRange.from.toISOString(),
        end_date: selectedRange.to.toISOString(),
        total_price: totalPrice
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      setBookingId(result.data.id)
      setBookingStatus('success')
      
      // Refresh unavailable dates
      fetchUnavailableDates()
      
    } catch (error) {
      console.error('Booking error:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      setBookingStatus('error')
    }
  }

  const resetBooking = () => {
    setSelectedRange(undefined)
    setBookingStatus('selecting')
    setBookingId(null)
    setError(null)
  }

  const totalDays = selectedRange?.from && selectedRange?.to 
    ? differenceInDays(selectedRange.to, selectedRange.from) 
    : 0
  const totalPrice = totalDays * pricePerDay

  // Loading state for unavailable dates
  if (isLoadingDates) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          <span className="ml-3 text-gray-600">Loading availability...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-lg ${className}`}>
      <AnimatePresence mode="wait">
        {/* Date Selection */}
        {bookingStatus === 'selecting' && (
          <motion.div
            key="selecting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="text-lg font-semibold text-gray-900">Book this item</h3>
            </div>

            <BookingCalendar
              pricePerDay={pricePerDay}
              unavailableDates={unavailableDates}
              onDateRangeSelect={handleDateRangeSelect}
              selectedRange={selectedRange}
            />

            {selectedRange?.from && selectedRange?.to && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Button
                  onClick={handleConfirmBooking}
                  className="w-full bg-[var(--primary)] text-white hover:bg-opacity-90 py-3"
                >
                  Continue to Booking Details
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Booking Confirmation */}
        {bookingStatus === 'confirming' && selectedRange?.from && selectedRange?.to && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm your booking</h3>
            </div>

            {/* Booking Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">{listingTitle}</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in</span>
                  <span className="font-medium">{format(selectedRange.from, "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out</span>
                  <span className="font-medium">{format(selectedRange.to, "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                  <span className="text-gray-600">Total Price</span>
                  <span className="font-bold text-lg text-[var(--primary)]">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setBookingStatus('selecting')}
                className="flex-1"
              >
                Back to Calendar
              </Button>
              <Button
                onClick={handleSubmitBooking}
                className="flex-1 bg-[var(--primary)] text-white hover:bg-opacity-90"
              >
                Confirm Booking
              </Button>
            </div>
          </motion.div>
        )}

        {/* Processing */}
        {bookingStatus === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6"
          >
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing your booking</h3>
              <p className="text-gray-600">Please wait while we confirm your request...</p>
            </div>
          </motion.div>
        )}

        {/* Success */}
        {bookingStatus === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6"
          >
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
              <p className="text-gray-600 mb-4">
                Your booking request has been sent to the owner. You&apos;ll receive a confirmation once they approve it.
              </p>
              {bookingId && (
                <p className="text-sm text-gray-500 mb-6">
                  Booking ID: {bookingId}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetBooking}
                  className="flex-1"
                >
                  Book Another Date
                </Button>
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 bg-[var(--primary)] text-white hover:bg-opacity-90"
                >
                  View My Bookings
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {bookingStatus === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6"
          >
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Failed</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetBooking}
                  className="flex-1"
                >
                  Start Over
                </Button>
                <Button
                  onClick={() => setBookingStatus('selecting')}
                  className="flex-1 bg-[var(--primary)] text-white hover:bg-opacity-90"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}