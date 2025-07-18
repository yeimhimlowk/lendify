import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { APIResponseError, ErrorCode } from '@/lib/api/errors';
import { generateRentalAgreement } from '@/lib/ai/openrouter';

const generateAgreementSchema = z.object({
  bookingId: z.string().uuid(),
  customTerms: z.string().optional(),
  deliveryMethod: z.enum(['self-pickup', 'home-delivery', 'meet-halfway']).optional(),
  lateFeePerDay: z.number().optional(),
});


export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new APIResponseError('Unauthorized', 401, ErrorCode.AUTHENTICATION_ERROR);
    }

    // Parse and validate request body
    const body = await request.json();
    const { bookingId, customTerms, deliveryMethod, lateFeePerDay } = generateAgreementSchema.parse(body);

    // Fetch booking details with related data
    console.log('Fetching booking with ID:', bookingId);
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listing:listings(*, category:categories(*)),
        renter:profiles!bookings_renter_id_fkey(*),
        owner:profiles!bookings_owner_id_fkey(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Booking query error:', bookingError);
      console.error('Booking query error code:', bookingError.code);
      console.error('Booking query error message:', bookingError.message);
      throw new APIResponseError(
        `Failed to fetch booking: ${bookingError.message}`, 
        bookingError.code === 'PGRST116' ? 404 : 500, 
        bookingError.code === 'PGRST116' ? ErrorCode.NOT_FOUND : ErrorCode.DATABASE_ERROR
      );
    }

    if (!booking) {
      throw new APIResponseError('Booking not found', 404, ErrorCode.NOT_FOUND);
    }

    console.log('Booking fetched successfully:', {
      id: booking.id,
      hasListing: !!booking.listing,
      hasRenter: !!booking.renter,
      hasOwner: !!booking.owner
    });

    // Check for required related data
    if (!booking.listing) {
      throw new APIResponseError('Booking listing data not found', 500, ErrorCode.DATABASE_ERROR);
    }
    if (!booking.renter || !booking.owner) {
      throw new APIResponseError('Booking user data not found', 500, ErrorCode.DATABASE_ERROR);
    }

    // Verify user is either owner or renter
    if (booking.owner_id !== user.id && booking.renter_id !== user.id) {
      throw new APIResponseError('Unauthorized to access this booking', 403, ErrorCode.AUTHORIZATION_ERROR);
    }

    // Calculate late fee
    const pricePerDay = booking.listing?.price_per_day || 0;
    const defaultLateFee = pricePerDay * 0.1; // 10% of daily rate
    const actualLateFee = lateFeePerDay || defaultLateFee;

    // Generate comprehensive agreement text using Claude
    let agreementText: string;
    
    try {
      // Use Claude to generate a professional rental agreement
      agreementText = await generateRentalAgreement({
        renterName: booking.renter?.full_name || 'Renter',
        ownerName: booking.owner?.full_name || 'Owner',
        listingTitle: booking.listing?.title || 'Rental Item',
        listingDescription: booking.listing?.description || undefined,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalPrice: booking.total_price || 0,
        pricePerDay: booking.listing?.price_per_day || 0,
        listingAddress: booking.listing?.address || undefined,
        category: booking.listing?.category?.name || undefined,
        condition: booking.listing?.condition || undefined,
        deposit: booking.listing?.deposit_amount || 0,
        specialTerms: customTerms || undefined
      });
      
      console.log('Successfully generated agreement using Claude');
    } catch (aiError) {
      console.error('Failed to generate agreement with Claude:', aiError);
      
      // Fallback to basic template if Claude fails
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      const rentalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      agreementText = `RENTAL AGREEMENT

This Rental Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} between:

PARTIES INVOLVED:
================

OWNER (Lessor): ${booking.owner?.full_name || 'Unknown'}
Email: ${booking.owner?.email || 'Unknown'}
${booking.owner?.phone ? `Phone: ${booking.owner.phone}` : ''}

RENTER (Lessee): ${booking.renter?.full_name || 'Unknown'}
Email: ${booking.renter?.email || 'Unknown'}
${booking.renter?.phone ? `Phone: ${booking.renter.phone}` : ''}

1. ITEM DETAILS
===============
Item: ${booking.listing?.title || 'Unknown Item'}
Category: ${booking.listing?.category?.name || 'General'}
Condition: ${booking.listing?.condition || 'Good'}
Description: ${booking.listing?.description || 'As shown in photos'}
Location: ${booking.listing?.address || 'To be confirmed with owner'}
${(booking.listing?.photos?.length ?? 0) > 0 ? 'Photos: Item condition has been documented with photos' : ''}

2. RENTAL TERMS
===============
Rental Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} (${rentalDays} days)
Daily Rate: $${pricePerDay}
Total Rental Price: $${booking.total_price || 0}
Security Deposit: $${booking.listing?.deposit_amount || 0}
Delivery Method: ${deliveryMethod === 'self-pickup' ? 'Self Pickup' : deliveryMethod === 'home-delivery' ? 'Home Delivery' : deliveryMethod === 'meet-halfway' ? 'Meet Halfway' : 'To be arranged'}

3. RESPONSIBILITY CLAUSES
========================
RENTER RESPONSIBILITIES:
- Return the item in the same condition as received (normal wear and tear excepted)
- Use the item only for its intended purpose
- Notify the owner immediately of any damage or malfunction
- Be liable for any damage, loss, or theft during the rental period
- Ensure safe and proper use of the item at all times

OWNER RESPONSIBILITIES:
- Provide the item in clean, working condition as described
- Ensure the item is functional and safe to use
- Be available for questions or support during rental period
- Provide accurate description and photos of the item

4. CANCELLATIONS & REFUNDS
=========================
- Full refund if cancelled within 24 hours of booking
- 50% refund if cancelled 24-48 hours before rental start
- No refund for cancellations less than 48 hours before rental start
- No-shows forfeit the full rental amount

5. LATE RETURNS
===============
- Late returns incur a fee of $${actualLateFee.toFixed(2)} per day
- After 3 days late without communication, the renter may be reported to Lendify
- Continued late returns may result in platform suspension

6. LIABILITY & DAMAGES
=====================
- Renter is responsible for any damage beyond normal wear and tear
- Security deposit will be used first for any damages
- If damages exceed deposit, renter agrees to pay the difference within 7 days
- Owner must provide evidence of damage (photos, receipts for repairs)
- Lendify platform is not liable for lost, stolen, or damaged items
- Both parties agree to resolve disputes through Lendify's resolution process

7. PLATFORM TERMS
=================
- This agreement is facilitated through Lendify
- Both parties agree to abide by Lendify's Terms of Service
- Disputes will first be handled through Lendify's resolution process
- Users participate in rentals at their own risk

8. DIGITAL AGREEMENT
===================
By clicking "I agree to these terms" and providing digital confirmation:
- Both parties acknowledge they have read and understood all terms
- This constitutes a legally binding agreement
- Timestamp and IP addresses will be recorded for verification

${customTerms ? `\n9. ADDITIONAL TERMS\n===================\n${customTerms}\n` : ''}

GOVERNING LAW
=============
This Agreement shall be governed by the laws of the jurisdiction where the rental takes place.

By agreeing to this rental agreement, both parties acknowledge they have read, understood, and agree to all terms and conditions outlined above.`;
    }

    // Prepare contact info with safe access
    const renterContactInfo = {
      email: booking.renter?.email || 'Unknown',
      phone: booking.renter?.phone || null,
      name: booking.renter?.full_name || 'Unknown'
    };

    const ownerContactInfo = {
      email: booking.owner?.email || 'Unknown',
      phone: booking.owner?.phone || null,
      name: booking.owner?.full_name || 'Unknown'
    };

    // Check if enhanced columns exist by attempting insert with all fields
    let insertData: any = {
      booking_id: bookingId,
      agreement_text: agreementText,
      created_by: user.id,
      status: 'draft',
      custom_terms: customTerms
    };

    // Try to insert with enhanced fields first
    const enhancedInsertData = {
      ...insertData,
      delivery_method: deliveryMethod || 'to-be-arranged',
      item_condition: booking.listing?.condition || 'Good',
      item_photos: booking.listing?.photos || [],
      deposit_amount: booking.listing?.deposit_amount || 0,
      late_fee_per_day: actualLateFee,
      cancellation_policy: 'Full refund within 24 hours, 50% refund 24-48 hours, no refund after 48 hours',
      damage_policy: 'Renter responsible for damage beyond normal wear. Deposit used first, excess charged separately.',
      liability_terms: 'Platform not liable for disputes or damages. Users participate at own risk.',
      platform_terms: 'Both parties agree to Lendify Terms of Service and dispute resolution process.',
      renter_contact_info: renterContactInfo,
      owner_contact_info: ownerContactInfo
    };

    // First try with all enhanced fields
    let { data: agreement, error: agreementError } = await supabase
      .from('rental_agreements')
      .insert(enhancedInsertData)
      .select()
      .single();

    // If enhanced fields don't exist, fall back to basic insert
    if (agreementError && (agreementError.code === '42703' || agreementError.code === '42P10')) { // Column doesn't exist or function error
      console.log('Enhanced rental_agreements columns not found, using basic schema');
      console.log('Error code:', agreementError.code);
      console.log('Error message:', agreementError.message);
      
      const { data: basicAgreement, error: basicError } = await supabase
        .from('rental_agreements')
        .insert(insertData)
        .select()
        .single();
      
      agreement = basicAgreement;
      agreementError = basicError;
    }

    if (agreementError || !agreement) {
      // Check if table doesn't exist
      if (agreementError?.code === '42P01') {
        throw new APIResponseError('Rental agreements table not found. Please run database migrations.', 500, ErrorCode.INTERNAL_ERROR);
      }
      throw agreementError || new Error('Failed to create agreement');
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agreement.id,
        agreementText,
        bookingId,
        status: 'draft'
      }
    });

  } catch (error: any) {
    console.error('Agreement generation error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    if (error instanceof APIResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    // Add more detailed error response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate agreement';
    const errorDetails = {
      message: errorMessage,
      code: error?.code,
      hint: error?.hint,
      details: error?.details
    };

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}