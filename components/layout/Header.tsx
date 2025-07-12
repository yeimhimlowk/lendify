"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Menu, User, Globe } from "lucide-react"

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)

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
            <div className="w-full relative">
              <div className="flex items-center bg-white border rounded-full shadow-sm hover:shadow-md transition-shadow">
                <input
                  type="text"
                  placeholder="Search for anything..."
                  className="flex-1 px-6 py-3 text-sm outline-none rounded-l-full"
                />
                <div className="h-8 w-px bg-gray-300 mx-2" />
                <input
                  type="text"
                  placeholder="Location"
                  className="flex-1 px-4 py-3 text-sm outline-none"
                />
                <button className="bg-[var(--primary)] text-white p-2 rounded-full mr-2 hover:bg-opacity-90 transition">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Nav */}
          <nav className="flex items-center gap-4">
            <Link
              href="/host"
              className="hidden md:block text-sm font-medium hover:bg-gray-100 px-4 py-2 rounded-full transition"
            >
              List your items
            </Link>
            
            <button className="p-2 hover:bg-gray-100 rounded-full transition">
              <Globe className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 border rounded-full p-2 hover:shadow-md transition"
              >
                <Menu className="h-4 w-4" />
                <div className="bg-gray-500 text-white rounded-full p-1">
                  <User className="h-5 w-5" />
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 border">
                  <Link
                    href="/signup"
                    className="block px-4 py-3 text-sm font-medium hover:bg-gray-50"
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/login"
                    className="block px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    Log in
                  </Link>
                  <hr className="my-2" />
                  <Link
                    href="/host"
                    className="block px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    List your items
                  </Link>
                  <Link
                    href="/help"
                    className="block px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    Help
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="flex items-center bg-white border rounded-full shadow-sm">
            <Search className="h-4 w-4 ml-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for anything..."
              className="flex-1 px-4 py-3 text-sm outline-none rounded-full"
            />
          </div>
        </div>
      </div>
    </header>
  )
}