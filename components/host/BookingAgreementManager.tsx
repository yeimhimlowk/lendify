'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Eye, Plus, CheckCircle2, Clock, AlertCircle, Truck, MapPin, Users } from 'lucide-react';
import { useRentalAgreement } from '@/hooks/useRentalAgreement';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BookingAgreementManagerProps {
  booking: {
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    listing: {
      title: string;
    };
    renter: {
      full_name: string;
      email: string;
    };
  };
  agreements: any[];
  onAgreementCreated?: () => void;
}

export default function BookingAgreementManager({ 
  booking, 
  agreements,
  onAgreementCreated 
}: BookingAgreementManagerProps) {
  const router = useRouter();
  const { generateAgreement, isLoading } = useRentalAgreement();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customTerms, setCustomTerms] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'self-pickup' | 'home-delivery' | 'meet-halfway'>('self-pickup');

  const latestAgreement = agreements && agreements.length > 0 
    ? agreements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  const handleCreateAgreement = async () => {
    try {
      const result = await generateAgreement({
        bookingId: booking.id,
        customTerms: customTerms.trim() || undefined,
        deliveryMethod: deliveryMethod,
      });
      
      setShowCreateDialog(false);
      setCustomTerms('');
      setDeliveryMethod('self-pickup');
      
      if (onAgreementCreated) {
        onAgreementCreated();
      }
      
      // Navigate to the agreement page with a slight delay to ensure auth state is synced
      setTimeout(() => {
        router.push(`/agreements/${result.id}`);
      }, 100);
    } catch (error) {
      console.error('Error creating agreement:', error);
    }
  };

  const getAgreementStatusBadge = (agreement: any) => {
    switch (agreement.status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'signed':
        return <Badge variant="default" className="bg-green-600">Signed</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return null;
    }
  };

  const getAgreementStatusIcon = (agreement: any) => {
    if (agreement.status === 'signed') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (agreement.status === 'sent') {
      return <Clock className="h-4 w-4 text-blue-600" />;
    } else if (agreement.status === 'expired') {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rental Agreement</CardTitle>
          <CardDescription>
            Manage rental agreements for this booking
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {latestAgreement ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getAgreementStatusIcon(latestAgreement)}
                  <div>
                    <p className="font-medium">
                      Agreement #{latestAgreement.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created {format(new Date(latestAgreement.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getAgreementStatusBadge(latestAgreement)}
                  <Link href={`/agreements/${latestAgreement.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
              
              {latestAgreement.status === 'signed' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Agreement fully executed</span>
                </div>
              )}
              
              {latestAgreement.status === 'sent' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>Waiting for signatures</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {latestAgreement.signed_by_owner ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-gray-300" />
                      )}
                      <span>Owner signature</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {latestAgreement.signed_by_renter ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-gray-300" />
                      )}
                      <span>Renter signature</span>
                    </div>
                  </div>
                </div>
              )}
              
              {booking.status === 'confirmed' && !latestAgreement && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Agreement
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No rental agreement created yet
              </p>
              {booking.status === 'confirmed' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agreement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Rental Agreement</DialogTitle>
            <DialogDescription>
              Generate a rental agreement for {booking.renter.full_name} to rent {booking.listing.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <RadioGroup value={deliveryMethod} onValueChange={(value: any) => setDeliveryMethod(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="self-pickup" id="self-pickup" />
                  <Label htmlFor="self-pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Self Pickup</div>
                      <div className="text-sm text-muted-foreground">Renter will pick up the item</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="home-delivery" id="home-delivery" />
                  <Label htmlFor="home-delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Truck className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Home Delivery</div>
                      <div className="text-sm text-muted-foreground">Owner will deliver the item</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="meet-halfway" id="meet-halfway" />
                  <Label htmlFor="meet-halfway" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Meet Halfway</div>
                      <div className="text-sm text-muted-foreground">Meet at a convenient location</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-terms">Additional Terms (Optional)</Label>
              <Textarea
                id="custom-terms"
                placeholder="Enter any custom terms or conditions specific to this rental..."
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These terms will be added to the standard rental agreement
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAgreement}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}