"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Menu, User, Globe, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const { user, profile, loading, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Logout error:', error)
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Unexpected logout error:', err)
    } finally {
      setShowUserMenu(false)
    }
  }

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

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (searchLocation) params.set('location', searchLocation)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-[var(--primary)]">
              Lendify
            </span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <div className="flex items-center bg-white border rounded-full shadow-sm hover:shadow-md transition-shadow">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for anything..."
                  className="flex-1 px-6 py-3 text-sm outline-none rounded-l-full"
                />
                <div className="h-8 w-px bg-gray-300 mx-2" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Location"
                  className="flex-1 px-4 py-3 text-sm outline-none"
                />
                <button type="submit" className="bg-[var(--primary)] text-white p-2 rounded-full mr-2 hover:bg-opacity-90 transition">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Nav */}
          <nav className="flex items-center gap-4">
            {isAuthenticated && (
              <Link
                href="/host"
                className="hidden md:block text-sm font-medium hover:bg-gray-100 px-4 py-2 rounded-full transition"
              >
                List your items
              </Link>
            )}
            
            <button className="p-2 hover:bg-gray-100 rounded-full transition">
              <Globe className="h-5 w-5" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 border rounded-full p-2 hover:shadow-md transition"
                disabled={loading}
              >
                <Menu className="h-4 w-4" />
                {loading ? (
                  <div className="bg-gray-300 rounded-full p-1 animate-pulse">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                  </div>
                ) : isAuthenticated && profile?.avatar_url ? (
                  <div className="relative h-7 w-7">
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || user?.email || 'User'}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : isAuthenticated ? (
                  <div className="bg-[var(--primary)] text-white rounded-full h-7 w-7 flex items-center justify-center text-sm font-medium">
                    {getUserInitials()}
                  </div>
                ) : (
                  <div className="bg-gray-500 text-white rounded-full p-1">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 border">
                  {isAuthenticated ? (
                    <>
                      {/* User info section */}
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.full_name || 'Welcome'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.email}
                        </p>
                      </div>
                      
                      {/* Authenticated menu items */}
                      <Link
                        href="/dashboard"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/bookings"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Bookings
                      </Link>
                      <Link
                        href="/messages"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Messages
                      </Link>
                      <Link
                        href="/host"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        List your items
                      </Link>
                      <hr className="my-2" />
                      <Link
                        href="/dashboard/settings"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/help"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Help
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-red-600"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Unauthenticated menu items */}
                      <Link
                        href="/signup"
                        className="block px-4 py-3 text-sm font-medium hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Sign up
                      </Link>
                      <Link
                        href="/login"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Log in
                      </Link>
                      <hr className="my-2" />
                      <Link
                        href="/host"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        List your items
                      </Link>
                      <Link
                        href="/help"
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Help
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="w-full">
            <div className="flex items-center bg-white border rounded-full shadow-sm">
              <Search className="h-4 w-4 ml-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for anything..."
                className="flex-1 px-4 py-3 text-sm outline-none rounded-full"
              />
              <button type="submit" className="bg-[var(--primary)] text-white p-2 rounded-full mr-2 hover:bg-opacity-90 transition">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>
  )
}