import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/userProfile';
import { createPortalSession } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/stripe/portal' });

  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Not authenticated - no authorization header' },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client and verify the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated - invalid token' },
        { status: 401 }
      );
    }

    // Get user profile to get Stripe customer ID
    const profile = await getUserProfile(user.id);
    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 400 }
      );
    }

    // Create portal session
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const session = await createPortalSession(
      profile.stripe_customer_id,
      `${origin}/account`
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    log.error({ err: error }, 'Error creating portal session');
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

