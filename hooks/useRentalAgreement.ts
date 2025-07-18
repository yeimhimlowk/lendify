import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateAgreementParams {
  bookingId: string;
  customTerms?: string;
  deliveryMethod?: 'self-pickup' | 'home-delivery' | 'meet-halfway';
  lateFeePerDay?: number;
}

interface SignAgreementParams {
  agreementId: string;
  signatureData: string;
  agreedToTerms?: boolean;
}

export function useRentalAgreement() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const generateAgreement = async ({ bookingId, customTerms, deliveryMethod, lateFeePerDay }: GenerateAgreementParams) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agreements', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          booking_id: bookingId, 
          custom_terms: customTerms 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate agreement');
      }

      // Success notification can be added here
      return data.data;
    } catch (error) {
      console.error('Error generating agreement:', error);
      console.error('Failed to generate agreement:', error instanceof Error ? error.message : error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signAgreement = async ({ agreementId, signatureData, agreedToTerms }: SignAgreementParams) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agreements/${agreementId}/sign`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signatureData, agreedToTerms }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Sign agreement response:', data);
        throw new Error(data.error || 'Failed to sign agreement');
      }

      // Success notification can be added here
      
      if (data.data.fullyExecuted) {
        // Agreement is now fully executed
      }
      
      return data.data;
    } catch (error) {
      console.error('Error signing agreement:', error);
      console.error('Failed to sign agreement:', error instanceof Error ? error.message : error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendAgreement = async (agreementId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agreements/${agreementId}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send agreement');
      }

      // Success notification can be added here
      return data.data;
    } catch (error) {
      console.error('Error sending agreement:', error);
      console.error('Failed to send agreement:', error instanceof Error ? error.message : error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgreement = async (agreementId: string) => {
    try {
      const response = await fetch(`/api/agreements/${agreementId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agreement');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching agreement:', error);
      console.error('Failed to fetch agreement:', error instanceof Error ? error.message : error);
      throw error;
    }
  };

  const deleteAgreement = async (agreementId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agreements/${agreementId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete agreement');
      }

      // Success notification can be added here
      return data;
    } catch (error) {
      console.error('Error deleting agreement:', error);
      console.error('Failed to delete agreement:', error instanceof Error ? error.message : error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generateAgreement,
    signAgreement,
    sendAgreement,
    fetchAgreement,
    deleteAgreement,
  };
}