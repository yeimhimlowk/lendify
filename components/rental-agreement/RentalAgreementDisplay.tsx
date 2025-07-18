'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import SignaturePad from './SignaturePad';
import { RentalAgreement } from '@/lib/supabase/types';

interface RentalAgreementDisplayProps {
  agreement: RentalAgreement & {
    booking: {
      start_date: string;
      end_date: string;
      total_price: number;
      listing: {
        title: string;
        deposit_amount: number;
      };
      renter: {
        full_name: string;
        email: string;
      };
      owner: {
        full_name: string;
        email: string;
      };
    };
    delivery_method?: string;
    late_fee_per_day?: number;
    deposit_amount?: number;
    cancellation_policy?: string;
    damage_policy?: string;
    liability_terms?: string;
    platform_terms?: string;
  };
  isOwner: boolean;
  isRenter: boolean;
  onSign: (signatureData: string, agreedToTerms: boolean) => Promise<void>;
  onSend?: () => Promise<void>;
}

export default function RentalAgreementDisplay({
  agreement,
  isOwner,
  isRenter,
  onSign,
  onSend
}: RentalAgreementDisplayProps) {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const signaturePadRef = useRef<any>(null);

  const handleSign = async () => {
    if (!signatureData || !isAgreed) return;

    setIsSigning(true);
    setError(null);
    try {
      await onSign(signatureData, isAgreed);
    } catch (error) {
      console.error('Error signing agreement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign agreement';
      
      // Check for specific database errors
      if (errorMessage.includes('Database schema is outdated')) {
        setError('Database schema needs updating. Please contact support or run database migrations.');
      } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        setError('Database is missing required columns. Please run: npx supabase db push');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleClearSignature = () => {
    setSignatureData('');
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const getStatusBadge = () => {
    switch (agreement.status) {
      case 'draft':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Draft
          </div>
        );
      case 'sent':
        return (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Clock className="h-4 w-4" />
            Awaiting Signatures
          </div>
        );
      case 'signed':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Fully Signed
          </div>
        );
      default:
        return null;
    }
  };

  const canSign = () => {
    // Agreement must be at least sent to be signed by renter
    if (agreement.status === 'signed' || agreement.status === 'expired') return false;
    
    // Owner can sign at draft or sent status
    if (isOwner && !agreement.signed_by_owner && (agreement.status === 'draft' || agreement.status === 'sent')) {
      return true;
    }
    
    // Renter can only sign when status is sent
    if (isRenter && !agreement.signed_by_renter && agreement.status === 'sent') {
      return true;
    }
    
    return false;
  };

  const needsOtherPartySignature = () => {
    if (isOwner && agreement.signed_by_owner && !agreement.signed_by_renter) return true;
    if (isRenter && agreement.signed_by_renter && !agreement.signed_by_owner) return true;
    return false;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rental Agreement</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Agreement for {agreement.booking.listing.title}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Rental Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(agreement.booking.start_date), 'MMM d, yyyy')} - 
                  {format(new Date(agreement.booking.end_date), 'MMM d, yyyy')}
                </span>
              </div>
              <p>Total Amount: ${agreement.booking.total_price}</p>
              <p>Security Deposit: ${agreement.deposit_amount || agreement.booking.listing.deposit_amount || 0}</p>
              {agreement.late_fee_per_day && (
                <p>Late Fee: ${agreement.late_fee_per_day}/day</p>
              )}
              {agreement.delivery_method && (
                <p>Delivery: {agreement.delivery_method === 'self-pickup' ? 'Self Pickup' : 
                             agreement.delivery_method === 'home-delivery' ? 'Home Delivery' : 
                             'Meet Halfway'}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Parties</h3>
            <div className="text-sm space-y-1">
              <p><strong>Owner:</strong> {agreement.booking.owner.full_name}</p>
              <p className="text-muted-foreground">{agreement.booking.owner.email}</p>
              <p><strong>Renter:</strong> {agreement.booking.renter.full_name}</p>
              <p className="text-muted-foreground">{agreement.booking.renter.email}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-3">Rental Agreement Terms</h3>
          <ScrollArea className="h-[500px] rounded-md border p-4 bg-gray-50">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {agreement.agreement_text}
              </pre>
            </div>
          </ScrollArea>
        </div>

        {agreement.custom_terms && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Additional Terms</h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{agreement.custom_terms}</AlertDescription>
              </Alert>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold">Signatures</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Owner Signature</p>
              {agreement.signed_by_owner ? (
                <div className="border rounded-md p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Signed by {agreement.booking.owner.full_name}
                  </p>
                  {agreement.owner_signed_at && (
                    <p className="text-xs text-muted-foreground">
                      on {format(new Date(agreement.owner_signed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="border rounded-md p-4 border-dashed">
                  <p className="text-sm text-muted-foreground">Awaiting signature</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Renter Signature</p>
              {agreement.signed_by_renter ? (
                <div className="border rounded-md p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Signed by {agreement.booking.renter.full_name}
                  </p>
                  {agreement.renter_signed_at && (
                    <p className="text-xs text-muted-foreground">
                      on {format(new Date(agreement.renter_signed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="border rounded-md p-4 border-dashed">
                  <p className="text-sm text-muted-foreground">Awaiting signature</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {canSign() && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold">Sign Agreement</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="agree" 
                  checked={isAgreed}
                  onCheckedChange={(checked) => setIsAgreed(checked as boolean)}
                />
                <label 
                  htmlFor="agree" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read and agree to the terms of this rental agreement
                </label>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Your Signature</p>
                <SignaturePad
                  ref={signaturePadRef}
                  onSave={(data) => setSignatureData(data)}
                  onClear={handleClearSignature}
                />
              </div>
            </div>
          </>
        )}

        {needsOtherPartySignature() && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have signed this agreement. Waiting for the other party to sign.
            </AlertDescription>
          </Alert>
        )}
        
        {agreement.status === 'draft' && isRenter && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This agreement is still in draft status. The owner needs to send it to you before you can sign.
            </AlertDescription>
          </Alert>
        )}
        
        {agreement.status === 'signed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              This agreement has been fully executed by both parties. The booking is now confirmed.
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="error" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {agreement.status === 'draft' && isOwner && onSend && (
          <Button onClick={onSend} variant="outline">
            Send to Renter
          </Button>
        )}
        
        {canSign() && (
          <Button 
            onClick={handleSign}
            disabled={!isAgreed || !signatureData || isSigning}
            className="ml-auto"
          >
            {isSigning ? 'Signing...' : 'Sign Agreement'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}