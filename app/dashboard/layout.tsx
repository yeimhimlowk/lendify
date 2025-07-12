"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"
import { useUser } from "@/lib/auth/use-auth"
import {
  Home,
  Package,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft
} from "lucide-react"

const sidebarItems = [
  {
    name: "Overview",
    icon: Home,
    href: "/dashboard",
  },
  {
    name: "My Listings",
    icon: Package,
    href: "/dashboard/listings",
  },
  {
    name: "Bookings",
    icon: Calendar,
    href: "/dashboard/bookings",
  },
  {
    name: "Messages",
    icon: MessageSquare,
    href: "/dashboard/messages",
  },
  {
    name: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
  },
  {
    name: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const pathname = usePathname()
  const { user, profile } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user?.email?.[0].toUpperCase() || 'U'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Header */}
      <Header />
      
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-20 left-0 z-50 h-[calc(100vh-5rem)]
            bg-white border-r border-gray-200
            transition-all duration-300 ease-in-out
            lg:relative lg:top-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${sidebarCollapsed ? 'w-20' : 'w-72'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className={`font-semibold text-lg text-gray-900 transition-opacity ${
                sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
              }`}>
                Dashboard
              </h2>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className={`h-4 w-4 transition-transform ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`} />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-200 group
                      ${isActive
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                    }`} />
                    <span className={`font-medium transition-opacity ${
                      sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                    }`}>
                      {item.name}
                    </span>
                  </Link>
                )
              })}
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t">
              <div className={`flex items-center gap-3 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}>
                {profile?.avatar_url ? (
                  <div className="relative h-10 w-10 flex-shrink-0">
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || user?.email || 'User'}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-[var(--primary)] text-white rounded-full h-10 w-10 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {getUserInitials()}
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.full_name || 'Welcome'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Menu Button */}
          <div className="lg:hidden px-4 py-3 bg-white border-b">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <Menu className="h-5 w-5" />
              <span className="font-medium">Menu</span>
            </button>
          </div>
          
          {/* Page Content */}
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}