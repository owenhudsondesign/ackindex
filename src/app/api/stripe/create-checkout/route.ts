import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe';
import { updateStripeCustomerId } from '@/lib/userProfile';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
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
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(user.id, user.email);

    // Update user profile with Stripe customer ID
    await updateStripeCustomerId(user.id, customer.id);

    // Create checkout session
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const session = await createCheckoutSession(
      user.id,
      user.email,
      `${origin}/account?success=true`,
      `${origin}/pricing?cancelled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

