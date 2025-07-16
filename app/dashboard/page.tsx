"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
// import { useUser } from "@/lib/auth/use-auth" // Removed for auth cleanup
import {
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  Eye,
  MessageSquare,
  Star,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Camera
} from "lucide-react"
import LenaChat from "@/components/ai/LenaChat"

// Animated counter component
function AnimatedCounter({ 
  end, 
  duration = 2000,
  prefix = "",
  suffix = "" 
}: { 
  end: number
  duration?: number
  prefix?: string
  suffix?: string 
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      setCount(Math.floor(progress * end))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return (
    <span>{prefix}{count}{suffix}</span>
  )
}

// Stat card component
function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  gradient,
  prefix,
  suffix
}: {
  title: string
  value: number
  change?: number
  trend?: "up" | "down"
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  prefix?: string
  suffix?: string
}) {
  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Gradient background */}
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${gradient} bg-opacity-10`}>
            <Icon className={`h-6 w-6 ${gradient.includes('pink') ? 'text-[var(--primary)]' : 
              gradient.includes('teal') ? 'text-[var(--secondary)]' : 
              gradient.includes('purple') ? 'text-[var(--ai-accent)]' : 
              'text-[var(--success)]'}`} />
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend === "up" ? "text-[var(--success)]" : "text-[var(--warning)]"
            }`}>
              <ArrowUpRight className={`h-4 w-4 ${trend === "down" ? "rotate-180" : ""}`} />
              {Math.abs(change)}%
            </div>
          )}
        </div>
        
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">
          <AnimatedCounter end={value} prefix={prefix} suffix={suffix} />
        </p>
        
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${gradient} transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min(value / 100 * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Quick action card
function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}) {
  return (
    <Link 
      href={href}
      className="group relative overflow-hidden bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${color}`} />
      
      <div className="relative">
        <div className={`inline-flex p-3 rounded-lg ${color} bg-opacity-10 mb-4`}>
          <Icon className={`h-6 w-6 ${
            color.includes('pink') ? 'text-[var(--primary)]' : 
            color.includes('teal') ? 'text-[var(--secondary)]' : 
            'text-[var(--ai-accent)]'
          }`} />
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        
        <div className="flex items-center text-sm font-medium text-[var(--primary)] group-hover:gap-2 transition-all">
          Get started
          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

// Activity item component
function ActivityItem({
  title,
  description,
  time,
  icon: Icon,
  color
}: {
  title: string
  description: string
  time: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="flex gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`flex-shrink-0 p-2 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`h-5 w-5 ${
          color.includes('pink') ? 'text-[var(--primary)]' : 
          color.includes('teal') ? 'text-[var(--secondary)]' : 
          color.includes('purple') ? 'text-[var(--ai-accent)]' : 
          'text-[var(--success)]'
        }`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600 truncate">{description}</p>
      </div>
      
      <div className="flex-shrink-0 text-xs text-gray-500">
        {time}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // TODO: Replace with non-auth user state - auth removed
  // const { profile } = useUser()
  const firstName = 'there' // Simplified since auth is removed

  // State for dashboard statistics
  const [stats, setStats] = useState({
    activeListings: 0,
    totalBookings: 0,
    monthlyEarnings: 0,
    rating: 4.8
  })
  const [, setIsLoading] = useState(true)

  // Fetch real data from Supabase on component mount
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const supabase = createClient()
        
        // Count active listings
        const { count: activeListings } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
        
        // Count total bookings
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
        
        // Calculate total earnings (sum of completed bookings)
        const { data: completedBookings } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('status', 'completed')
        
        const monthlyEarnings = completedBookings?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0
        
        setStats({
          activeListings: activeListings || 0,
          totalBookings: totalBookings || 0,
          monthlyEarnings,
          rating: 4.8 // TODO: Calculate from reviews when implemented
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        // Keep default stats
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const recentActivity = [
    {
      type: "booking",
      title: "New booking received",
      description: "Canon 5D Mark IV - 3 days rental",
      time: "2 hours ago",
      icon: Calendar,
      color: "bg-gradient-to-br from-pink-500 to-rose-500"
    },
    {
      type: "message",
      title: "New message",
      description: "John asked about your camping tent",
      time: "4 hours ago",
      icon: MessageSquare,
      color: "bg-gradient-to-br from-teal-500 to-cyan-500"
    },
    {
      type: "listing",
      title: "Listing viewed 25 times",
      description: "DJI Mavic Pro drone",
      time: "6 hours ago",
      icon: Eye,
      color: "bg-gradient-to-br from-purple-500 to-indigo-500"
    },
    {
      type: "review",
      title: "New 5-star review",
      description: "Great experience renting the projector!",
      time: "1 day ago",
      icon: Star,
      color: "bg-gradient-to-br from-amber-500 to-orange-500"
    }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--primary)] to-pink-600 rounded-2xl p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-pink-100 text-lg">
            Here&apos;s what&apos;s happening with your rentals today
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Listings"
          value={stats.activeListings}
          change={15}
          trend="up"
          icon={Package}
          gradient="bg-gradient-to-br from-pink-500 to-rose-500"
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          change={8}
          trend="up"
          icon={Calendar}
          gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
        />
        <StatCard
          title="Monthly Earnings"
          value={stats.monthlyEarnings}
          change={12}
          trend="up"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-500"
          prefix="$"
        />
        <StatCard
          title="Average Rating"
          value={stats.rating}
          icon={Star}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          suffix="/5.0"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="List a New Item"
            description="Start earning by renting out your unused items"
            icon={Plus}
            href="/dashboard/listings/new"
            color="bg-gradient-to-br from-pink-500 to-rose-500"
          />
          <QuickActionCard
            title="View Analytics"
            description="Track your performance and optimize listings"
            icon={TrendingUp}
            href="/dashboard/analytics"
            color="bg-gradient-to-br from-teal-500 to-cyan-500"
          />
          <QuickActionCard
            title="Manage Bookings"
            description="Review and respond to booking requests"
            icon={Calendar}
            href="/dashboard/bookings"
            color="bg-gradient-to-br from-purple-500 to-indigo-500"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <Link 
              href="/dashboard/activity"
              className="text-sm font-medium text-[var(--primary)] hover:text-opacity-80 transition-colors"
            >
              View all
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentActivity.map((activity, index) => (
            <ActivityItem key={index} {...activity} />
          ))}
        </div>
        
        {recentActivity.length === 0 && (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400 mt-1">
              Start by listing your first item!
            </p>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="mt-8 bg-gradient-to-r from-[var(--ai-accent)] to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <Camera className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Pro Tip: Boost your listings with AI</h3>
            <p className="text-purple-100 text-sm">
              Use our AI-powered photo enhancement and description generator to make your listings stand out and attract more renters.
            </p>
          </div>
          <Link
            href="/dashboard/listings/optimize"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Learn more
          </Link>
        </div>
      </div>

      {/* Lena Chat Assistant */}
      <LenaChat />
    </div>
  )
}