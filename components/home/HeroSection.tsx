"use client"

import { Search } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const router = useRouter()

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (location) params.set('location', location)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <section className="relative bg-gradient-to-b from-pink-50 to-white px-4 pt-24 pb-16">
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[var(--black)] mb-4">
            Rent anything from your neighbors
          </h1>
          <p className="text-xl text-[var(--gray-dark)] max-w-2xl mx-auto">
            Share more, own less. Join the circular economy and save money while reducing waste.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-full shadow-lg p-2 flex flex-col md:flex-row gap-2">
            <div className="flex-1 px-6 py-4 border-r border-gray-200">
              <label className="block text-xs font-semibold text-[var(--black)] mb-1">
                What
              </label>
              <input
                type="text"
                placeholder="Search for anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full outline-none text-sm"
              />
            </div>
            
            <div className="flex-1 px-6 py-4">
              <label className="block text-xs font-semibold text-[var(--black)] mb-1">
                Where
              </label>
              <input
                type="text"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full outline-none text-sm"
              />
            </div>

            <button 
              onClick={handleSearch}
              className="bg-[var(--primary)] hover:bg-opacity-90 text-white px-8 py-4 rounded-full flex items-center gap-2 transition-all"
            >
              <Search className="h-5 w-5" />
              <span className="font-semibold">Search</span>
            </button>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--gray-dark)] mb-3">Popular searches:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Power Tools", "Cameras", "Party Supplies", "Sports Equipment", "Baby Gear"].map((item) => (
              <button
                key={item}
                className="px-5 py-2.5 bg-white border border-gray-100 rounded-full text-sm font-medium text-gray-600
                           transform transition-all duration-300 ease-out
                           shadow-[0_2px_8px_rgba(0,0,0,0.04)] 
                           hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] 
                           hover:-translate-y-0.5 hover:border-gray-200 hover:text-gray-900
                           active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}