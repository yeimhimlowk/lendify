"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar } from "@/components/ui/calendar"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isSameMonth, addMonths, subMonths } from "date-fns"

interface AvailabilityCalendarProps {
  blockedDates: Date[]
  onDateSelect?: (date: Date | undefined) => void
  selectedDate?: Date
  className?: string
}

export function AvailabilityCalendar({
  blockedDates,
  onDateSelect,
  selectedDate,
  className
}: AvailabilityCalendarProps) {
  const [month, setMonth] = React.useState<Date>(new Date())
  const [_isTransitioning, setIsTransitioning] = React.useState(false)

  const handleMonthChange = (newMonth: Date) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setMonth(newMonth)
      setIsTransitioning(false)
    }, 150)
  }

  const disabledDays = [
    ...blockedDates,
    { before: new Date() } // Disable past dates
  ]

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-600 mb-2">
          <CalendarIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Select available dates</span>
        </div>
        <p className="text-xs text-slate-500">Click on dates to mark them as unavailable</p>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => handleMonthChange(subMonths(month, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          
          <AnimatePresence mode="wait">
            <motion.h2
              key={month.toISOString()}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-semibold text-slate-900"
            >
              {format(month, "MMMM yyyy")}
            </motion.h2>
          </AnimatePresence>

          <button
            onClick={() => handleMonthChange(addMonths(month, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
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
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              month={month}
              onMonthChange={setMonth}
              disabled={disabledDays}
              showOutsideDays={false}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-4",
                month_caption: "hidden",
                table: "w-full border-collapse",
                weekdays: "flex justify-between mb-2",
                weekday: cn(
                  "text-slate-500 font-medium text-sm w-10 text-center",
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
                  "hover:bg-primary/10 hover:text-primary",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "aria-selected:bg-primary aria-selected:text-white",
                  "transition-all duration-200"
                ),
                today: "bg-slate-100 font-semibold",
                outside: "opacity-40",
                disabled: cn(
                  "text-slate-300 opacity-50",
                  "hover:bg-transparent hover:text-slate-300",
                  "cursor-not-allowed"
                ),
                hidden: "invisible",
                range_middle: cn(
                  "aria-selected:bg-primary/10",
                  "aria-selected:text-primary"
                ),
              }}
              components={{
                DayButton: ({ className, ...props }) => {
                  const isBlocked = blockedDates.some(
                    date => date.toDateString() === props.day?.date.toDateString()
                  )
                  
                  return (
                    <button
                      className={cn(
                        className,
                        isBlocked && "bg-red-100 text-red-600 hover:bg-red-200",
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

        {/* Blocked Dates Summary */}
        {blockedDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-slate-50 rounded-lg"
          >
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              Blocked dates: {blockedDates.length}
            </h3>
            <div className="flex flex-wrap gap-2">
              {blockedDates
                .filter(date => isSameMonth(date, month))
                .slice(0, 5)
                .map((date, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md"
                  >
                    {format(date, "MMM d")}
                  </span>
                ))
              }
              {blockedDates.filter(date => isSameMonth(date, month)).length > 5 && (
                <span className="text-xs text-slate-500">
                  +{blockedDates.filter(date => isSameMonth(date, month)).length - 5} more
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary rounded" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-100 rounded" />
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}