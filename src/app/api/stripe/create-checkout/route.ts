import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe';
import { updateStripeCustomerId } from '@/lib/userProfile';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
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

