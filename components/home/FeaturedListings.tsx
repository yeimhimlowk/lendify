import { createServerSupabaseClient } from "@/lib/supabase/server"
import ListingCard from "@/components/listings/ListingCard"

export default async function FeaturedListings() {
  const supabase = await createServerSupabaseClient()
  
  // For now, we'll just show a placeholder since we don't have any listings yet
  const { data: listings } = await supabase
    .from('listings')
    .select(`
      *,
      owner:profiles(full_name, avatar_url),
      category:categories(name, slug)
    `)
    .eq('status', 'active')
    .limit(8)

  // Mock data for demonstration
  const mockListings = [
    {
      id: '1',
      title: 'Professional DSLR Camera Kit',
      photos: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
      price_per_day: 45,
      address: 'Downtown, San Francisco',
      rating: 4.8,
      rating_count: 127,
      owner: { full_name: 'John Doe' }
    },
    {
      id: '2',
      title: 'Electric Drill Set',
      photos: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'],
      price_per_day: 25,
      address: 'Mission District, SF',
      rating: 4.9,
      rating_count: 89,
      owner: { full_name: 'Jane Smith' }
    },
    {
      id: '3',
      title: 'Party Speaker System',
      photos: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400'],
      price_per_day: 60,
      address: 'Soma, San Francisco',
      rating: 4.7,
      rating_count: 203,
      owner: { full_name: 'Mike Johnson' }
    },
    {
      id: '4',
      title: 'Camping Tent (4 Person)',
      photos: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400'],
      price_per_day: 35,
      address: 'Richmond, SF',
      rating: 4.6,
      rating_count: 156,
      owner: { full_name: 'Sarah Wilson' }
    }
  ]

  const displayListings = listings?.length 
    ? listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        photos: listing.photos || [],
        price_per_day: listing.price_per_day,
        address: listing.address || undefined,
        rating: undefined,
        rating_count: undefined,
        owner: listing.owner ? { full_name: listing.owner.full_name || 'Unknown' } : undefined
      }))
    : mockListings

  return (
    <section className="px-4 py-16 bg-gray-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[var(--black)]">
            Popular near you
          </h2>
          <a href="/search" className="text-[var(--primary)] font-medium hover:underline">
            View all
          </a>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  )
}