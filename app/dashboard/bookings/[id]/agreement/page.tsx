'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import BookingAgreementManager from '@/components/host/BookingAgreementManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, DollarSign, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface BookingWithAgreements {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  listing: {
    id: string;
    title: string;
    price_per_day: number;
    deposit_amount: number;
    photos: string[];
  };
  renter: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  owner: {
    id: string;
    full_name: string;
    email: string;
  };
  agreements: any[];
}

export default function BookingAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const supabase = createClientComponentClient();
  
  const [booking, setBooking] = useState<BookingWithAgreements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchBookingWithAgreements = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setError('Please sign in to view this page');
        return;
      }
      setUser(currentUser);

      // Fetch booking with all related data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          listing:listings(*),
          renter:profiles!bookings_renter_id_fkey(*),
          owner:profiles!bookings_owner_id_fkey(*),
          agreements:rental_agreements(*)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !bookingData) {
        throw new Error('Booking not found');
      }

      // Verify user is the owner
      if (bookingData.owner_id !== currentUser.id) {
        setError('You do not have permission to view this page');
        return;
      }

      setBooking(bookingData as BookingWithAgreements);
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingWithAgreements();
  }, [bookingId, fetchBookingWithAgreements]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/dashboard/bookings')}>
          Back to Bookings
        </Button>
      </div>
    );
  }

  if (!booking || !user) {
    return null;
  }

  const getDaysCount = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/dashboard/bookings')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bookings
      </Button>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Rental Agreement Management
        </h1>
        <p className="text-gray-600">
          Manage the rental agreement for this booking
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking Details Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{booking.listing.title}</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(booking.start_date), 'MMM d')} - 
                      {format(new Date(booking.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${booking.total_price} total ({getDaysCount(booking.start_date, booking.end_date)} days)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Renter Information</h4>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{booking.renter.full_name}</p>
                    <p className="text-muted-foreground">{booking.renter.email}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Booking Status</h4>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  booking.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800' 
                    : booking.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agreement Manager */}
        <div className="lg:col-span-2">
          <BookingAgreementManager
            booking={{
              id: booking.id,
              start_date: booking.start_date,
              end_date: booking.end_date,
              status: booking.status,
              listing: {
                title: booking.listing.title
              },
              renter: {
                full_name: booking.renter.full_name,
                email: booking.renter.email
              }
            }}
            agreements={booking.agreements || []}
            onAgreementCreated={() => {
              // Refresh booking data
              fetchBookingWithAgreements();
            }}
          />
        </div>
      </div>
    </div>
  );
}