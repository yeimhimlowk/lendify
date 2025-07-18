import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: authError 
      }, { status: 401 });
    }

    // Test 1: Check if rental_agreements table exists
    const { error: tableError } = await supabase
      .from('rental_agreements')
      .select('id')
      .limit(1);

    // Test 2: Get a sample booking for the user
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        owner_id,
        renter_id,
        listing:listings(id, title, condition, photos, deposit_amount, price_per_day),
        owner:profiles!bookings_owner_id_fkey(id, full_name, email, phone),
        renter:profiles!bookings_renter_id_fkey(id, full_name, email, phone)
      `)
      .or(`owner_id.eq.${user.id},renter_id.eq.${user.id}`)
      .limit(1)
      .single();

    // Test 3: Check table columns - commented out as RPC function not in types
    // const { data: columns, error: columnsError } = await supabase
    //   .rpc('get_table_columns', { table_name: 'rental_agreements' })
    //   .select('*');
    const columns = null;
    const columnsError = null;

    return NextResponse.json({
      success: true,
      tests: {
        authentication: {
          userId: user.id,
          email: user.email
        },
        tableExists: {
          success: !tableError || tableError.code !== '42P01',
          error: tableError
        },
        sampleBooking: {
          found: !!bookings,
          bookingId: bookings?.id,
          hasListing: !!bookings?.listing,
          hasOwner: !!bookings?.owner,
          hasRenter: !!bookings?.renter,
          error: bookingError
        },
        tableColumns: {
          data: columns,
          error: columnsError
        }
      }
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}

// Create the RPC function to get table columns if it doesn't exist
// Commented out POST function as it uses untyped RPC functions
/*
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Create helper function
    const { error } = await supabase.rpc('execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
        RETURNS TABLE(column_name text, data_type text, is_nullable text)
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT 
            column_name::text,
            data_type::text,
            is_nullable::text
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          ORDER BY ordinal_position;
        $$;
      `
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to create helper function', details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Helper function created' });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to create helper function',
      details: error instanceof Error ? error.message : error 
    }, { status: 500 });
  }
}
*/