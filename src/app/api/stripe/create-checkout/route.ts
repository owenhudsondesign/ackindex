import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe';
import { updateStripeCustomerId } from '@/lib/userProfile';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/stripe/create-checkout' });

  try {
    log.info('Stripe checkout request started');

    // Get the authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      log.error('No authorization header provided');
      return NextResponse.json(
        { error: 'Not authenticated' },
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

    if (userError || !user || !user.email) {
      log.error({ err: userError }, 'User authentication failed');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    log.info({ email: user.email }, 'User authenticated');

    // Get or create Stripe customer
    log.info('Creating/fetching Stripe customer');
    const customer = await getOrCreateCustomer(user.id, user.email);
    log.info({ customerId: customer.id }, 'Stripe customer retrieved');

    // Update user profile with Stripe customer ID
    await updateStripeCustomerId(user.id, customer.id);

    // Create checkout session
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    log.info({ origin }, 'Creating checkout session');

    const session = await createCheckoutSession(
      user.id,
      user.email,
      `${origin}/account?success=true`,
      `${origin}/pricing?cancelled=true`
    );

    log.info({ sessionId: session.id, url: session.url }, 'Checkout session created');

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    log.error({
      err: error,
      errorName: error.name,
      errorType: error.type,
      errorMessage: error.message
    }, 'Stripe checkout error');

    // Check for specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      log.error('Stripe Invalid Request - check your price ID and API keys');
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to create checkout session',
        details: error.type || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

