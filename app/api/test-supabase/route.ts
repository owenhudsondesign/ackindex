import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Supabase config check:', {
      url: supabaseUrl,
      keyLength: supabaseKey?.length,
      keyStart: supabaseKey?.substring(0, 20) + '...',
      keyEnd: '...' + supabaseKey?.substring(supabaseKey.length - 10),
    });

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        }
      }, { status: 500 });
    }

    // Test the connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('entries')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        error: 'Supabase connection failed',
        details: {
          message: error.message,
          hint: error.hint,
          code: error.code,
          url: supabaseUrl,
          keyLength: supabaseKey.length,
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      data: data
    });

  } catch (error: any) {
    console.error('Supabase test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}
