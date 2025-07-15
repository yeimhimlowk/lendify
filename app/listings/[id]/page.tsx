import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Image from 'next/image'
import { Calendar, MapPin, Star, User, Shield, Clock, DollarSign } from 'lucide-react'
import { Database } from '@/lib/supabase/types'
import { BookingForm } from '@/components/listings/BookingForm'
import { ListingMap } from '@/components/maps/ListingMap'
import { ReviewsList } from '@/components/reviews/ReviewsList'
import { MessageUserButton } from '@/components/chat/MessageUserButton'

type Listing = Database['public']['Tables']['listings']['Row']
type ListingWithDetails = Listing & {
  category?: Database['public']['Tables']['categories']['Row']
  owner?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'rating' | 'verified'>
  latitude?: number
  longitude?: number
  _count?: {
    bookings: number
    reviews: number
  }
  _avgRating?: number
}

async function getListingById(id: string): Promise<ListingWithDetails | null> {
  const supabase = await createServerSupabaseClient()
  
  // First get the listing data
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      category:categories(*),
      owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, rating, verified)
    `)
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (error || !listing) {
    return null
  }

  // Extract coordinates from PostGIS location if available
  let latitude: number | undefined
  let longitude: number | undefined

  if (listing.location) {
    try {
      // Use the RPC function to extract coordinates
      const { data: coordData, error: coordError } = await supabase
        .rpc('get_listing_coordinates', { listing_id: id })

      if (!coordError && coordData && coordData.length > 0) {
        longitude = coordData[0].longitude
        latitude = coordData[0].latitude
      }
    } catch (coordinateError) {
      // If coordinate extraction fails, continue without coordinates
      console.warn('Failed to extract coordinates:', coordinateError)
    }
  }

  // Get booking and review stats
  const [bookingsData, reviewsData] = await Promise.all([
    supabase
      .from('bookings')
      .select('id')
      .eq('listing_id', id),
    
    supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', listing.owner_id)
  ])

  const reviews = reviewsData.data || []
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0

  return {
    ...listing,
    category: listing.category || undefined,
    owner: listing.owner || undefined,
    latitude,
    longitude,
    _count: {
      bookings: bookingsData.data?.length || 0,
      reviews: reviews.length
    },
    _avgRating: Math.round(avgRating * 10) / 10
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params
  const listing = await getListingById(id)

  if (!listing) {
    notFound()
  }

  const primaryImage = listing.photos?.[0]
  const additionalImages = listing.photos?.slice(1, 5) || []

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Image Gallery */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Primary Image */}
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-200">
              {primaryImage ? (
                <Image
                  src={primaryImage}
                  alt={listing.title}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-400 rounded-lg flex items-center justify-center">
                      📷
                    </div>
                    <p>No image available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Images Grid */}
            <div className="grid grid-cols-2 gap-4">
              {additionalImages.map((photo, index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden bg-gray-200">
                  <Image
                    src={photo}
                    alt={`${listing.title} - Image ${index + 2}`}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ))}
              {additionalImages.length < 4 && (
                <>
                  {Array.from({ length: 4 - additionalImages.length }).map((_, index) => (
                    <div key={`placeholder-${index}`} className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  {listing.category && (
                    <span className="bg-[var(--primary)] text-white px-3 py-1 rounded-full text-sm font-medium">
                      {listing.category.name}
                    </span>
                  )}
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Available
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-[var(--black)] mb-4">
                  {listing.title}
                </h1>

                <div className="flex items-center gap-6 text-[var(--gray-dark)]">
                  {listing.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <span>{listing.address}</span>
                    </div>
                  )}
                  
                  {listing._count?.reviews && listing._count.reviews > 0 ? (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span>{listing._avgRating} ({listing._count.reviews} reviews)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-gray-300" />
                      <span className="text-gray-500">No reviews yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[var(--black)] mb-4">Description</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-[var(--gray-dark)] leading-relaxed">
                    {listing.description || 'No description available for this item.'}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[var(--black)] mb-4">Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listing.condition && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Shield className="h-5 w-5 text-[var(--primary)]" />
                      <div>
                        <p className="font-medium text-[var(--black)]">Condition</p>
                        <p className="text-[var(--gray-dark)] capitalize">{listing.condition}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-[var(--primary)]" />
                    <div>
                      <p className="font-medium text-[var(--black)]">Availability</p>
                      <p className="text-[var(--gray-dark)]">Available now</p>
                    </div>
                  </div>

                  {listing.deposit_amount && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-[var(--primary)]" />
                      <div>
                        <p className="font-medium text-[var(--black)]">Security Deposit</p>
                        <p className="text-[var(--gray-dark)]">${listing.deposit_amount}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-[var(--primary)]" />
                    <div>
                      <p className="font-medium text-[var(--black)]">Total Bookings</p>
                      <p className="text-[var(--gray-dark)]">{listing._count?.bookings || 0} times rented</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              {(listing.latitude && listing.longitude) || listing.address ? (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-[var(--black)] mb-4">Location</h2>
                  
                  {listing.latitude && listing.longitude ? (
                    <ListingMap
                      latitude={listing.latitude}
                      longitude={listing.longitude}
                      address={listing.address || undefined}
                      title={listing.title}
                      height="400px"
                      className="mb-4"
                    />
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-[var(--primary)]" />
                        <div>
                          <p className="font-medium text-[var(--black)]">Address</p>
                          <p className="text-[var(--gray-dark)]">{listing.address}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {listing.address && (
                    <div className="text-sm text-[var(--gray-dark)] mt-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{listing.address}</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Tags */}
              {listing.tags && listing.tags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-[var(--black)] mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-[var(--gray-dark)] px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[var(--black)] mb-4">Reviews</h2>
                <ReviewsList 
                  userId={listing.owner_id}
                  showBooking={true}
                  className="border-t pt-6"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Booking Form */}
                <BookingForm
                  listingId={listing.id}
                  listingTitle={listing.title}
                  pricePerDay={listing.price_per_day}
                  ownerId={listing.owner_id}
                  className="mb-6"
                />

                {/* Contact Owner */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg mb-6">
                  <MessageUserButton
                    userId={listing.owner_id}
                    userName={listing.owner?.full_name || undefined}
                    variant="outline"
                    className="w-full py-3 px-6 border-2 border-[var(--primary)] text-[var(--primary)] font-semibold hover:bg-[var(--primary)] hover:text-white transition-all duration-200"
                  />
                </div>

                {/* Owner Card */}
                {listing.owner && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-[var(--black)] mb-4">Owner</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        {listing.owner.avatar_url ? (
                          <Image
                            src={listing.owner.avatar_url}
                            alt={listing.owner.full_name || 'Owner'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--black)]">
                          {listing.owner.full_name || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-[var(--gray-dark)]">
                            {listing.owner.rating || 'New'} rating
                          </span>
                          {listing.owner.verified && (
                            <Shield className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}