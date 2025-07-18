import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { APIResponseError, ErrorCode } from '@/lib/api/errors';

export async function POST(
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
    const agreementId = id;

    // Fetch agreement with booking details
    const { data: agreement, error: agreementError } = await supabase
      .from('rental_agreements')
      .select(`
        *,
        booking:bookings(
          owner_id,
          renter_id,
          renter:profiles!bookings_renter_id_fkey(
            full_name,
            email
          )
        )
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      throw new APIResponseError('Agreement not found', 404, ErrorCode.NOT_FOUND);
    }

    // Verify user is the owner
    if (agreement.booking.owner_id !== user.id) {
      throw new APIResponseError('Only the owner can send the agreement', 403, ErrorCode.AUTHORIZATION_ERROR);
    }

    // Verify agreement is in draft status
    if (agreement.status !== 'draft') {
      throw new APIResponseError('Agreement has already been sent or signed', 400, ErrorCode.BAD_REQUEST);
    }

    // Update agreement status to sent
    const { error: updateError } = await supabase
      .from('rental_agreements')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .eq('id', agreementId);

    if (updateError) {
      throw updateError;
    }

    // Create a notification message for the renter
    await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: agreement.booking.renter_id,
        booking_id: agreement.booking_id,
        content: `A rental agreement has been sent to you for review and signature. Please review and sign the agreement within 7 days.`,
        is_ai_response: false,
      });

    // TODO: Send email notification to renter
    // This would integrate with your email service

    return NextResponse.json({
      success: true,
      data: {
        id: agreementId,
        status: 'sent',
        sentTo: agreement.booking.renter.email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Agreement send error:', error);
    
    if (error instanceof APIResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send agreement' },
      { status: 500 }
    );
  }
}