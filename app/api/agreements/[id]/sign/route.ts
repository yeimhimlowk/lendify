import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { APIResponseError, ErrorCode } from '@/lib/api/errors';

const signAgreementSchema = z.object({
  signatureData: z.string().min(1),
  agreedToTerms: z.boolean().optional(), // For tracking checkbox confirmation
});

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
    const body = await request.json();
    const { signatureData, agreedToTerms } = signAgreementSchema.parse(body);

    // Fetch agreement with booking details
    const { data: agreement, error: agreementError } = await supabase
      .from('rental_agreements')
      .select(`
        *,
        booking:bookings(
          owner_id,
          renter_id
        )
      `)
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      throw new APIResponseError('Agreement not found', 404, ErrorCode.NOT_FOUND);
    }

    // Verify user is either owner or renter
    const isOwner = agreement.booking.owner_id === user.id;
    const isRenter = agreement.booking.renter_id === user.id;

    if (!isOwner && !isRenter) {
      throw new APIResponseError('Unauthorized to sign this agreement', 403, ErrorCode.AUTHORIZATION_ERROR);
    }

    // Determine which signature to update
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    const signatureMetadata = {
      dataUrl: signatureData,
      timestamp: new Date().toISOString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      agreedToTerms: agreedToTerms !== false, // Default to true for backward compatibility
    };

    if (isOwner) {
      if (agreement.signed_by_owner) {
        throw new APIResponseError('Agreement already signed by owner', 400, ErrorCode.BAD_REQUEST);
      }
      updateData.signed_by_owner = true;
      updateData.owner_signature_data = signatureMetadata;
      updateData.owner_signed_at = new Date().toISOString();
      updateData.agreed_by_owner = true;
    } else if (isRenter) {
      if (agreement.signed_by_renter) {
        throw new APIResponseError('Agreement already signed by renter', 400, ErrorCode.BAD_REQUEST);
      }
      updateData.signed_by_renter = true;
      updateData.renter_signature_data = signatureMetadata;
      updateData.renter_signed_at = new Date().toISOString();
      updateData.agreed_by_renter = true;
    }

    // Update agreement
    const { data: updatedAgreement, error: updateError } = await supabase
      .from('rental_agreements')
      .update(updateData)
      .eq('id', agreementId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new APIResponseError(
        `Database update failed: ${updateError.message}`,
        500,
        ErrorCode.DATABASE_ERROR
      );
    }

    // Check if both parties have signed and update status
    if (updatedAgreement.signed_by_owner && updatedAgreement.signed_by_renter) {
      const { error: statusError } = await supabase
        .from('rental_agreements')
        .update({ 
          status: 'signed',
          agreed_at: new Date().toISOString() 
        })
        .eq('id', agreementId);

      if (statusError) {
        console.error('Status update error:', statusError);
      }

      // Update booking status to confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', agreement.booking_id);

      if (bookingError) {
        console.error('Booking update error:', bookingError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agreementId,
        signed: true,
        signedBy: isOwner ? 'owner' : 'renter',
        fullyExecuted: updatedAgreement.signed_by_owner && updatedAgreement.signed_by_renter
      }
    });

  } catch (error) {
    console.error('Agreement signing error:', error);
    
    if (error instanceof APIResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature data' },
        { status: 400 }
      );
    }

    // Check for common database errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Database schema is outdated. Please run migrations.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Failed to sign agreement: ${errorMessage}` },
      { status: 500 }
    );
  }
}