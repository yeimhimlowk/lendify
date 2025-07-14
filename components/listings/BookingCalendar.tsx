"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, ChevronLeft, ChevronRight, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addMonths, subMonths, differenceInDays, isSameDay, isAfter, isBefore } from "date-fns"
import { DateRange } from "react-day-picker"

interface BookingCalendarProps {
  pricePerDay: number
  unavailableDates: Date[]
  onDateRangeSelect?: (range: DateRange | undefined) => void
  selectedRange?: DateRange
  className?: string
}

export function BookingCalendar({
  pricePerDay,
  unavailableDates,
  onDateRangeSelect,
  selectedRange,
  className
}: BookingCalendarProps) {
  const [month, setMonth] = React.useState<Date>(new Date())
  const [, setIsTransitioning] = React.useState(false)

  const handleMonthChange = (newMonth: Date) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setMonth(newMonth)
      setIsTransitioning(false)
    }, 150)
  }

  // Calculate total price and days
  const totalDays = selectedRange?.from && selectedRange?.to 
    ? differenceInDays(selectedRange.to, selectedRange.from) 
    : 0
  const totalPrice = totalDays * pricePerDay

  // Create disabled days array
  const disabledDays = [
    ...unavailableDates,
    { before: new Date() } // Disable past dates
  ]

  // Handle date range selection
  const handleSelect = (range: DateRange | undefined) => {
    // If selecting a range that includes unavailable dates, prevent it
    if (range?.from && range?.to) {
      const hasUnavailableDate = unavailableDates.some(date => {
        return (isAfter(date, range.from!) || isSameDay(date, range.from!)) &&
               (isBefore(date, range.to!) || isSameDay(date, range.to!))
      })
      
      if (hasUnavailableDate) {
        return // Don't allow this selection
      }
    }
    
    onDateRangeSelect?.(range)
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <CalendarIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Select your dates</span>
        </div>
        <p className="text-xs text-gray-500">Choose your check-in and check-out dates</p>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => handleMonthChange(subMonths(month, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <AnimatePresence mode="wait">
            <motion.h2
              key={month.toISOString()}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-semibold text-gray-900"
            >
              {format(month, "MMMM yyyy")}
            </motion.h2>
          </AnimatePresence>

          <button
            onClick={() => handleMonthChange(addMonths(month, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={month.toISOString()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonth}
              disabled={disabledDays}
              showOutsideDays={false}
              numberOfMonths={1}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-4",
                month_caption: "hidden",
                table: "w-full border-collapse",
                weekdays: "flex justify-between mb-2",
                weekday: cn(
                  "text-gray-500 font-medium text-sm w-10 text-center",
                  "first:text-red-500" // Sunday
                ),
                week: "flex justify-between mb-1",
                day: cn(
                  "relative p-0 text-center text-sm",
                  "focus-within:relative focus-within:z-20",
                  "w-10 h-10"
                ),
                day_button: cn(
                  "w-10 h-10 p-0 font-normal rounded-lg",
                  "hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50",
                  "transition-all duration-200"
                ),
                today: "bg-gray-100 font-semibold",
                outside: "opacity-40",
                disabled: cn(
                  "text-gray-300 opacity-50",
                  "hover:bg-transparent hover:text-gray-300",
                  "cursor-not-allowed"
                ),
                range_start: "bg-[var(--primary)] text-white hover:bg-[var(--primary)] hover:text-white",
                range_end: "bg-[var(--primary)] text-white hover:bg-[var(--primary)] hover:text-white",
                range_middle: "bg-[var(--primary)]/10 text-[var(--primary)]",
                selected: "bg-[var(--primary)] text-white",
                hidden: "invisible",
              }}
              components={{
                DayButton: ({ className, day, ...props }) => {
                  const isUnavailable = unavailableDates.some(
                    date => date.toDateString() === day?.date.toDateString()
                  )
                  
                  return (
                    <button
                      className={cn(
                        className,
                        isUnavailable && "bg-red-100 text-red-600 hover:bg-red-200 cursor-not-allowed",
                        "transition-transform hover:scale-110 active:scale-95"
                      )}
                      {...props}
                    />
                  )
                }
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Price Summary */}
        {selectedRange?.from && selectedRange?.to && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total Price</span>
              <div className="flex items-center gap-1 text-lg font-bold text-[var(--primary)]">
                <DollarSign className="h-4 w-4" />
                <span>{totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {totalDays} {totalDays === 1 ? 'day' : 'days'} × ${pricePerDay}/day
            </div>
            <div className="mt-2 text-xs text-gray-600">
              <strong>Check-in:</strong> {format(selectedRange.from, "MMM d, yyyy")}
              <br />
              <strong>Check-out:</strong> {format(selectedRange.to, "MMM d, yyyy")}
            </div>
          </motion.div>
        )}

        {/* Unavailable Dates Info */}
        {unavailableDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 rounded-lg"
          >
            <h4 className="text-sm font-medium text-red-700 mb-1">
              Unavailable dates
            </h4>
            <p className="text-xs text-red-600">
              This item is already booked or unavailable for {unavailableDates.length} days this month
            </p>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[var(--primary)] rounded" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}