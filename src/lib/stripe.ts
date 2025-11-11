import Stripe from 'stripe';

// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
  console.error('❌ STRIPE_PREMIUM_PRICE_ID is not set in environment variables');
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

// Pricing configuration
export const PRICING = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price ID for free tier
    features: [
      '15,000 tokens per month',
      '~9 questions per month',
      'Full chatbot access',
      'Search all documents',
      'Weekly email updates',
      'Community support',
    ],
    tokenLimit: 15000,
  },
  PREMIUM: {
    name: 'Premium',
    price: 999, // $9.99 in cents
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || '', // Set in env
    features: [
      '500,000 tokens per month',
      '~293 questions per month',
      'Priority support',
      'Everything in Free, plus...',
    ],
    tokenLimit: 500000,
  },
} as const;

/**
 * Create a Stripe checkout session for premium subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const priceId = PRICING.PREMIUM.priceId;
  
  if (!priceId) {
    throw new Error(
      'STRIPE_PREMIUM_PRICE_ID is not configured. Please set it in your environment variables.'
    );
  }

  console.log('Creating Stripe checkout with price ID:', priceId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        userId: userId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe portal session for subscription management
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Try to find existing customer
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: email,
    name: name,
    metadata: {
      userId: userId,
    },
  });

  return customer;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancel at period end
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Reactivate a subscription
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

