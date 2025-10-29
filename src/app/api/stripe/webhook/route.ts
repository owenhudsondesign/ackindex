import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/stripe';
import {
  updateSubscription,
  logSubscriptionEvent,
  updateStripeCustomerId,
} from '@/lib/userProfile';
import Stripe from 'stripe';

// Disable body parsing, need raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    // Verify webhook signature
    const event = verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    console.log('Received Stripe webhook:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user ID in checkout session');
    return;
  }

  // Update customer ID
  await updateStripeCustomerId(userId, customerId);

  // Update subscription
  await updateSubscription(userId, {
    tier: 'premium',
    status: 'active',
    stripeSubscriptionId: subscriptionId,
    monthlyTokenLimit: 999999999, // Unlimited
  });

  // Log event
  await logSubscriptionEvent(userId, 'subscription_created', {
    tier: 'premium',
    status: 'active',
    stripeSubscriptionId: subscriptionId,
      amountCents: session.amount_total || 999,
    metadata: {
      sessionId: session.id,
    },
  });

  console.log(`Subscription created for user ${userId}`);
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  const status = mapStripeStatus(subscription.status);

  await updateSubscription(userId, {
    tier: 'premium',
    status: status,
    stripeSubscriptionId: subscription.id,
    monthlyTokenLimit: 999999999,
  });

  await logSubscriptionEvent(userId, 'subscription_updated', {
    tier: 'premium',
    status: subscription.status,
    stripeSubscriptionId: subscription.id,
    metadata: {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: (subscription as any).current_period_end,
    },
  });

  console.log(`Subscription updated for user ${userId}`);
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  // Downgrade to free tier
  await updateSubscription(userId, {
    tier: 'free',
    status: 'cancelled',
        monthlyTokenLimit: 3500,
  });

  await logSubscriptionEvent(userId, 'subscription_cancelled', {
    tier: 'free',
    status: 'cancelled',
    stripeSubscriptionId: subscription.id,
  });

  console.log(`Subscription cancelled for user ${userId}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  const userId = (invoice as any).subscription_details?.metadata?.userId;

  if (!userId) {
    console.log('No user ID in invoice, skipping');
    return;
  }

  await logSubscriptionEvent(userId, 'payment_succeeded', {
    tier: 'premium',
    status: 'active',
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id,
    amountCents: (invoice as any).amount_paid,
    currency: invoice.currency,
  });

  console.log(`Payment succeeded for user ${userId}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  const userId = (invoice as any).subscription_details?.metadata?.userId;

  if (!userId) {
    console.log('No user ID in invoice, skipping');
    return;
  }

  // Update subscription status to past_due
  await updateSubscription(userId, {
    tier: 'premium',
    status: 'past_due',
    stripeSubscriptionId: subscriptionId,
  });

  await logSubscriptionEvent(userId, 'payment_failed', {
    tier: 'premium',
    status: 'past_due',
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id,
    amountCents: (invoice as any).amount_due,
    currency: invoice.currency,
  });

  console.log(`Payment failed for user ${userId}`);
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'cancelled' | 'past_due' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'trialing':
      return 'trialing';
    default:
      return 'active';
  }
}

