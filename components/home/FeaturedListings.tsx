import { createServerSupabaseClient } from "@/lib/supabase/server"
import ListingCard from "@/components/listings/ListingCard"
import { Package, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function FeaturedListings() {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        *,
        owner:profiles(full_name, avatar_url),
        category:categories(name, slug)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching featured listings:', error)
      return null
    }

    const displayListings = listings?.map(listing => ({
      id: listing.id,
      title: listing.title,
      photos: listing.photos || [],
      price_per_day: listing.price_per_day,
      address: listing.address || undefined,
      rating: undefined, // TODO: Calculate from reviews when implemented
      rating_count: undefined,
      owner: listing.owner ? { full_name: listing.owner.full_name || 'Anonymous' } : undefined
    })) || []

    // Empty state component
    if (displayListings.length === 0) {
      return (
        <section className="px-4 py-16 bg-gray-50">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-[var(--black)]">
                Popular near you
              </h2>
              <Link href="/search" className="text-[var(--primary)] font-medium hover:underline">
                View all
              </Link>
            </div>
            
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--black)] mb-2">
                No listings yet
              </h3>
              <p className="text-[var(--gray-dark)] mb-6 max-w-md mx-auto">
                Be the first to list an item! Share something from your collection and start earning.
              </p>
              <Link 
                href="/host"
                className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all duration-200"
              >
                List your first item
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      )
    }

    // Normal display with listings
    return (
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-[var(--black)]">
              Popular near you
            </h2>
            <Link href="/search" className="text-[var(--primary)] font-medium hover:underline">
              View all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>
    )
  } catch (error) {
    console.error('Error in FeaturedListings component:', error)
    return null
  }
}