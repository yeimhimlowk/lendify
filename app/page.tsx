import { Suspense } from "react"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedListings from "@/components/home/FeaturedListings"
import HeroSection from "@/components/home/HeroSection"
import LenaChat from "@/components/ai/LenaChat"

function CategoriesLoadingSkeleton() {
  return (
    <section className="px-4 py-16">
      <div className="max-w-screen-xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-6">
              <div className="w-16 h-16 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedListingsLoadingSkeleton() {
  return (
    <section className="px-4 py-16 bg-gray-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-gray-200 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <Suspense fallback={<CategoriesLoadingSkeleton />}>
          <CategoryGrid />
        </Suspense>
        <Suspense fallback={<FeaturedListingsLoadingSkeleton />}>
          <FeaturedListings />
        </Suspense>
      </main>
      <Footer />
      <LenaChat />
    </>
  )
}