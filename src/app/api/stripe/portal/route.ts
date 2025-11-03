import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserProfile } from '@/lib/userProfile';
import { createPortalSession } from '@/lib/stripe';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/stripe/portal' });

  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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

