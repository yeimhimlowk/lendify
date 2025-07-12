"use client"

import { Search } from "lucide-react"
import { useState } from "react"

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")

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

            <button className="bg-[var(--primary)] hover:bg-opacity-90 text-white px-8 py-4 rounded-full flex items-center gap-2 transition-all">
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
                className="px-4 py-2 bg-white border rounded-full text-sm hover:border-[var(--black)] transition-colors"
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