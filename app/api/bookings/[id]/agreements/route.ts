import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { APIResponseError, ErrorCode } from '@/lib/api/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new APIResponseError('Unauthorized', 401, ErrorCode.AUTHENTICATION_ERROR);
    }

    const { id } = await params;
    const bookingId = id;

    // First verify the user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('owner_id, renter_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new APIResponseError('Booking not found', 404, ErrorCode.NOT_FOUND);
    }

    // Check if user is either owner or renter
    if (booking.owner_id !== user.id && booking.renter_id !== user.id) {
      throw new APIResponseError('Unauthorized to view agreements for this booking', 403, ErrorCode.AUTHORIZATION_ERROR);
    }

    // Fetch all agreements for this booking
    const { data: agreements, error: agreementsError } = await supabase
      .from('rental_agreements')
      .select(`
        *,
        created_by_profile:profiles!rental_agreements_created_by_fkey(
          full_name,
          email
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (agreementsError) {
      throw agreementsError;
    }

    return NextResponse.json({
      success: true,
      data: agreements || []
    });

  } catch (error) {
    console.error('Agreements fetch error:', error);
    
    if (error instanceof APIResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch agreements' },
      { status: 500 }
    );
  }
}