'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RentalAgreementDisplay from '@/components/rental-agreement/RentalAgreementDisplay';
import { useRentalAgreement } from '@/hooks/useRentalAgreement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AgreementPage() {
  const params = useParams();
  const router = useRouter();
  const agreementId = params.id as string;
  const supabase = createClient();
  const { signAgreement, sendAgreement } = useRentalAgreement();
  
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('User not authenticated:', userError);
          setError('You need to be signed in to view this agreement');
          setLoading(false);
          return;
        }

        setUserId(user.id);
        console.log('Current user:', user.id);

        // Fetch the agreement directly from Supabase
        const { data: agreementData, error: agreementError } = await supabase
          .from('rental_agreements')
          .select(`
            *,
            booking:bookings!inner(
              *,
              listing:listings(*),
              renter:profiles!bookings_renter_id_fkey(*),
              owner:profiles!bookings_owner_id_fkey(*)
            )
          `)
          .eq('id', agreementId)
          .single();

        if (agreementError) {
          console.error('Error fetching agreement:', agreementError);
          
          // Try a simpler query
          const { data: simpleAgreement, error: simpleError } = await supabase
            .from('rental_agreements')
            .select('*')
            .eq('id', agreementId)
            .single();
            
          if (simpleError || !simpleAgreement) {
            setError('Agreement not found');
            setLoading(false);
            return;
          }
          
          // Fetch booking separately
          const { data: booking } = await supabase
            .from('bookings')
            .select(`
              *,
              listing:listings(*),
              renter:profiles!bookings_renter_id_fkey(*),
              owner:profiles!bookings_owner_id_fkey(*)
            `)
            .eq('id', simpleAgreement.booking_id)
            .single();
            
          if (booking) {
            setAgreement({
              ...simpleAgreement,
              booking: booking
            });
          } else {
            setError('Could not load agreement details');
          }
        } else if (agreementData) {
          console.log('Agreement loaded:', agreementData);
          setAgreement(agreementData);
        } else {
          setError('Agreement not found');
        }
      } catch (err: any) {
        console.error('Error in loadData:', err);
        setError('An error occurred while loading the agreement');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [agreementId, supabase]);

  const handleSign = async (signatureData: string, agreedToTerms: boolean) => {
    try {
      await signAgreement({ agreementId, signatureData, agreedToTerms });
      
      // Redirect to bookings page with success message
      router.push('/dashboard/bookings?success=agreement-signed');
    } catch (err) {
      console.error('Error signing agreement:', err);
      // The error is already handled in the component
      throw err; // Re-throw to let the component handle display
    }
  };

  const handleSend = async () => {
    try {
      await sendAgreement(agreementId);
      
      // Refresh the agreement data instead of reloading
      const { data: updatedAgreement } = await supabase
        .from('rental_agreements')
        .select(`
          *,
          booking:bookings!inner(
            *,
            listing:listings(*),
            renter:profiles!bookings_renter_id_fkey(*),
            owner:profiles!bookings_owner_id_fkey(*)
          )
        `)
        .eq('id', agreementId)
        .single();
        
      if (updatedAgreement) {
        setAgreement(updatedAgreement);
      }
    } catch (err) {
      console.error('Error sending agreement:', err);
      alert('Failed to send agreement. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/bookings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Link>
          </Button>
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!agreement || !userId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Loading agreement details...</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isOwner = agreement.booking?.owner_id === userId;
  const isRenter = agreement.booking?.renter_id === userId;

  if (!isOwner && !isRenter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/bookings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Link>
          </Button>
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to view this agreement.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/bookings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Link>
        </Button>
        
        <RentalAgreementDisplay
          agreement={agreement}
          isOwner={isOwner}
          isRenter={isRenter}
          onSign={handleSign}
          onSend={isOwner ? handleSend : undefined}
        />
      </div>
    </div>
  );
}