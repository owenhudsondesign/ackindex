import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe';
import { updateStripeCustomerId } from '@/lib/userProfile';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Stripe Checkout Request Started ===');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No authorization header provided');
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
      console.error('User authentication failed:', userError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.email);

    // Get or create Stripe customer
    console.log('Creating/fetching Stripe customer...');
    const customer = await getOrCreateCustomer(user.id, user.email);
    console.log('Stripe customer ID:', customer.id);

    // Update user profile with Stripe customer ID
    await updateStripeCustomerId(user.id, customer.id);

    // Create checkout session
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    console.log('Creating checkout session with origin:', origin);
    
    const session = await createCheckoutSession(
      user.id,
      user.email,
      `${origin}/account?success=true`,
      `${origin}/pricing?cancelled=true`
    );

    console.log('Checkout session created:', session.id);
    console.log('Checkout URL:', session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('=== Stripe Checkout Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    
    // Check for specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      console.error('Stripe Invalid Request - check your price ID and API keys');
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

