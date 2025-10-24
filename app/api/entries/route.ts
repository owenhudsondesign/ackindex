import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Debug environment variables
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as Category | null;

    let query = supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch entries', details: error.message },
        { status: 500 }
      );
    }

    console.log('Successfully fetched entries:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
