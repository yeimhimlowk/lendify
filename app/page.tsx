import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedListings from "@/components/home/FeaturedListings"
import HeroSection from "@/components/home/HeroSection"

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <CategoryGrid />
        <FeaturedListings />
      </main>
      <Footer />
    </>
  )
}