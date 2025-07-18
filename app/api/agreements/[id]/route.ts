import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { APIResponseError, ErrorCode } from '@/lib/api/errors';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const params = await context.params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new APIResponseError('Unauthorized', 401, ErrorCode.AUTHENTICATION_ERROR);
    }

    const agreementId = params.id;
    console.log('Fetching agreement:', agreementId, 'for user:', user.id);

    // First, let's check if the agreement exists at all
    const { data: basicAgreement, error: basicError } = await supabase
      .from('rental_agreements')
      .select('id, booking_id, status')
      .eq('id', agreementId)
      .single();
      
    console.log('Basic agreement check:', {
      found: !!basicAgreement,
      error: basicError,
      data: basicAgreement
    });

    if (!basicAgreement) {
      throw new APIResponseError('Agreement not found', 404, ErrorCode.NOT_FOUND);
    }

    // Check the booking separately
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listing:listings(*),
        renter:profiles!bookings_renter_id_fkey(*),
        owner:profiles!bookings_owner_id_fkey(*)
      `)
      .eq('id', basicAgreement.booking_id)
      .single();
      
    console.log('Booking check:', {
      found: !!booking,
      error: bookingError,
      ownerId: booking?.owner_id,
      renterId: booking?.renter_id
    });

    // Now fetch with full details
    const { data: agreement, error: agreementError } = await supabase
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

    console.log('Agreement query result:', {
      hasData: !!agreement,
      error: agreementError,
      bookingExists: agreement?.booking ? true : false
    });

    if (agreementError || !agreement) {
      console.error('Agreement not found:', agreementError);
      // If we found the basic agreement but can't get full details, use the booking we fetched
      if (basicAgreement && booking) {
        // Verify user is either owner or renter
        const isOwner = booking.owner_id === user.id;
        const isRenter = booking.renter_id === user.id;
        
        if (!isOwner && !isRenter) {
          throw new APIResponseError('Unauthorized to view this agreement', 403, ErrorCode.AUTHORIZATION_ERROR);
        }
        
        // Fetch the full agreement data without the join
        const { data: fullAgreement } = await supabase
          .from('rental_agreements')
          .select('*')
          .eq('id', agreementId)
          .single();
          
        return NextResponse.json({
          success: true,
          data: {
            ...fullAgreement,
            booking: booking
          }
        });
      }
      throw new APIResponseError('Agreement not found', 404, ErrorCode.NOT_FOUND);
    }

    // Verify user is either owner or renter
    const isOwner = agreement.booking?.owner_id === user.id;
    const isRenter = agreement.booking?.renter_id === user.id;

    if (!isOwner && !isRenter) {
      console.error('Authorization check failed:', {
        userId: user.id,
        bookingOwnerId: agreement.booking?.owner_id,
        bookingRenterId: agreement.booking?.renter_id,
        isOwner,
        isRenter
      });
      throw new APIResponseError('Unauthorized to view this agreement', 403, ErrorCode.AUTHORIZATION_ERROR);
    }

    return NextResponse.json({
      success: true,
      data: agreement
    });

  } catch (error) {
    console.error('Agreement fetch error:', error);
    
    if (error instanceof APIResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch agreement' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const params = await context.params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new APIResponseError('Unauthorized', 401, ErrorCode.AUTHENTICATION_ERROR);
    }

    const agreementId = params.id;

    // Fetch agreement to verify ownership and status
    const { data: agreement, error: agreementError } = await supabase
      .from('rental_agreements')
      .select(`
        *,
        booking:bookings(owner_id)
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      throw new APIResponseError('Agreement not found', 404, ErrorCode.NOT_FOUND);
    }

    // Verify user is the owner
    if (agreement.booking.owner_id !== user.id) {
      throw new APIResponseError('Only the owner can delete agreements', 403, ErrorCode.AUTHORIZATION_ERROR);
    }

    // Verify agreement is in draft status
    if (agreement.status !== 'draft') {
      throw new APIResponseError('Only draft agreements can be deleted', 400, ErrorCode.BAD_REQUEST);
    }

    // Delete the agreement
    const { error: deleteError } = await supabase
      .from('rental_agreements')
      .delete()
      .eq('id', agreementId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Agreement deleted successfully'
    });

  } catch (error) {
    console.error('Agreement delete error:', error);
    
    if (error instanceof APIResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete agreement' },
      { status: 500 }
    );
  }
}