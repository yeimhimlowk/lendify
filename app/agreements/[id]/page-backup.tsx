'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import RentalAgreementDisplay from '@/components/rental-agreement/RentalAgreementDisplay';
import { useRentalAgreement } from '@/hooks/useRentalAgreement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AgreementPage() {
  const params = useParams();
  const agreementId = params.id as string;
  const supabase = createClientComponentClient();
  const { fetchAgreement, signAgreement, sendAgreement } = useRentalAgreement();
  
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // First check if we have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Try to refresh the session
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          
          if (!refreshedSession) {
            setError('Please sign in to view this agreement');
            setAuthChecked(true);
            setLoading(false);
            return;
          }
        }
        
        // Get the user from the session
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          setUser(currentUser);
          setAuthChecked(true);
        } else {
          setError('Please sign in to view this agreement');
          setAuthChecked(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Authentication error occurred');
        setAuthChecked(true);
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [supabase.auth]);

  useEffect(() => {
    async function loadAgreement() {
      if (!authChecked || !user) return;
      
      try {
        // Fetch agreement
        const agreementData = await fetchAgreement(agreementId);
        console.log('Agreement data received:', agreementData);
        setAgreement(agreementData);
      } catch (err: any) {
        console.error('Error loading agreement:', err);
        console.error('Error details:', err.message);
        setError(err.message || 'Failed to load agreement');
      } finally {
        setLoading(false);
      }
    }

    loadAgreement();
  }, [agreementId, fetchAgreement, user, authChecked]);

  const handleSign = async (signatureData: string, agreedToTerms: boolean) => {
    try {
      await signAgreement({ agreementId, signatureData, agreedToTerms });
      
      // Refresh agreement data
      const updatedAgreement = await fetchAgreement(agreementId);
      setAgreement(updatedAgreement);
    } catch (err) {
      console.error('Error signing agreement:', err);
    }
  };

  const handleSend = async () => {
    try {
      await sendAgreement(agreementId);
      
      // Refresh agreement data
      const updatedAgreement = await fetchAgreement(agreementId);
      setAgreement(updatedAgreement);
    } catch (err) {
      console.error('Error sending agreement:', err);
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
        <Alert variant="error" className="max-w-4xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agreement || !user) {
    return null;
  }

  const isOwner = agreement.booking.owner_id === user.id;
  const isRenter = agreement.booking.renter_id === user.id;

  return (
    <div className="container mx-auto px-4 py-8">
      <RentalAgreementDisplay
        agreement={agreement}
        isOwner={isOwner}
        isRenter={isRenter}
        onSign={handleSign}
        onSend={isOwner ? handleSend : undefined}
      />
    </div>
  );
}