import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Test all the components that could fail
    const tests = {
      environment: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      supabase: null as any,
      ai: null as any,
    };

    // Test Supabase connection
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data, error } = await supabase
        .from('entries')
        .select('count')
        .limit(1);
      
      tests.supabase = {
        success: !error,
        error: error?.message || null,
      };
    } catch (supabaseError: any) {
      tests.supabase = {
        success: false,
        error: supabaseError.message,
      };
    }

    // Test AI service (Claude)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });
      
      tests.ai = {
        success: response.ok,
        status: response.status,
        error: response.ok ? null : await response.text(),
      };
    } catch (aiError: any) {
      tests.ai = {
        success: false,
        error: aiError.message,
      };
    }

    console.log('Upload test results:', tests);

    return NextResponse.json({
      success: true,
      tests,
      message: 'Upload components test complete'
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}
