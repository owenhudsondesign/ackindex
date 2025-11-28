import { createClient } from '@supabase/supabase-js';
import {
  getCachedUserProfile,
  setCachedUserProfile,
  invalidateUserProfile,
  getCachedSubscription,
  setCachedSubscription,
  invalidateSubscription,
  invalidateUserCaches
} from './cache';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface UserProfile {
  id: string;
  full_name: string | null;
  email_updates_enabled: boolean;
  email_updates_frequency: 'daily' | 'weekly' | 'monthly';
  subscription_tier: 'free' | 'premium';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  monthly_token_limit: number;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  user_id: string;
  year: number;
  month: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  query_count: number;
  estimated_cost_cents: number;
}

export interface UserDashboard {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: 'free' | 'premium';
  subscription_status: string;
  monthly_token_limit: number;
  email_updates_enabled: boolean;
  preferred_language: 'en' | 'es' | 'pt';
  tokens_used_this_month: number;
  queries_this_month: number;
  tokens_remaining: number;
  stripe_customer_id: string | null;
  role?: string | null;
}

/**
 * Get user profile by user ID (with caching)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Try cache first
  const cached = await getCachedUserProfile(userId);
  if (cached) {
    return cached as UserProfile;
  }

  // Cache miss - fetch from database
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error({ error, userId }, 'Error fetching user profile');
    return null;
  }

  // Cache the result
  if (data) {
    await setCachedUserProfile(userId, data);
  }

  return data;
}

/**
 * Update user profile (invalidates cache)
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error({ error, userId }, 'Error updating user profile');
    return null;
  }

  // Invalidate caches after update
  await invalidateUserCaches(userId);

  return data;
}

/**
 * Get user's dashboard data
 * Note: Email is fetched separately from auth.users (server-side only)
 * to avoid exposing auth.users table in the view
 */
export async function getUserDashboard(userId: string): Promise<UserDashboard | null> {
  try {
    // Build dashboard data manually instead of using the view
    // The view uses auth.uid() which doesn't work with service role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logger.error({ error: profileError, userId }, 'Error fetching user profile');
      return null;
    }

    // Get current month's usage
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: usage } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .single();

    const tokensUsed = usage?.total_tokens || 0;
    const queriesThisMonth = usage?.query_count || 0;
    const tokensRemaining = profile.monthly_token_limit - tokensUsed;

    // Fetch email from auth.users (server-side only, using service role)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError) {
      logger.error({ error: userError, userId }, 'Error fetching user email');
    }

    // Fetch language preference from email_subscribers
    const { data: subscriber } = await supabaseAdmin
      .from('email_subscribers')
      .select('preferred_language')
      .eq('user_id', userId)
      .single();

    // Build the dashboard object
    return {
      id: profile.id,
      email: userData?.user?.email || '',
      full_name: profile.full_name,
      subscription_tier: profile.subscription_tier,
      subscription_status: profile.subscription_status,
      monthly_token_limit: profile.monthly_token_limit,
      email_updates_enabled: profile.email_updates_enabled,
      preferred_language: (subscriber?.preferred_language as 'en' | 'es' | 'pt') || 'en',
      tokens_used_this_month: tokensUsed,
      queries_this_month: queriesThisMonth,
      tokens_remaining: tokensRemaining,
      stripe_customer_id: profile.stripe_customer_id,
      role: profile.role,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Exception in getUserDashboard');
    return null;
  }
}

/**
 * Get user's current month usage
 */
export async function getCurrentUsage(userId: string): Promise<UsageStats | null> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, error } = await supabaseAdmin
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching usage:', error);
    return null;
  }

  return data;
}

/**
 * Get subscription status with caching (5 min TTL)
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  tier: 'free' | 'premium';
  status: string;
  canQuery: boolean;
} | null> {
  // Try cache first
  const cached = await getCachedSubscription(userId);
  if (cached) {
    return cached as { tier: 'free' | 'premium'; status: string; canQuery: boolean };
  }

  // Cache miss - fetch from database
  const profile = await getUserProfile(userId);
  if (!profile) {
    return null;
  }

  const subscriptionStatus = {
    tier: profile.subscription_tier,
    status: profile.subscription_status,
    canQuery: profile.subscription_tier === 'premium' || profile.subscription_status === 'active'
  };

  // Cache with 5 min TTL
  await setCachedSubscription(userId, subscriptionStatus);

  return subscriptionStatus;
}

/**
 * Check if user can make a query (has tokens remaining)
 * Uses cached subscription status
 */
export async function canUserQuery(userId: string): Promise<boolean> {
  // First check cached subscription status
  const subscription = await getSubscriptionStatus(userId);
  if (subscription && !subscription.canQuery) {
    return false;
  }

  // Then check actual token usage
  const { data, error } = await supabaseAdmin.rpc('can_user_query', {
    p_user_id: userId,
  });

  if (error) {
    logger.error({ error, userId }, 'Error checking user query limit');
    return false;
  }

  return data === true;
}

/**
 * Record usage after a chat query
 */
export async function recordUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  costCents: number = 0
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('record_usage', {
    p_user_id: userId,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_cost_cents: costCents,
  });

  if (error) {
    console.error('Error recording usage:', error);
  }
}

/**
 * Subscribe to email updates
 */
export async function subscribeToEmails(
  email: string,
  userId?: string,
  frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('email_subscribers')
    .upsert({
      email,
      user_id: userId || null,
      is_subscribed: true,
      frequency,
      verified: !!userId, // Auto-verify if associated with user account
    });

  if (error) {
    console.error('Error subscribing to emails:', error);
    return false;
  }

  return true;
}

/**
 * Update Stripe customer ID
 */
export async function updateStripeCustomerId(
  userId: string,
  customerId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId);

  if (error) {
    console.error('Error updating Stripe customer ID:', error);
    return false;
  }

  return true;
}

/**
 * Update subscription (invalidates cache)
 */
export async function updateSubscription(
  userId: string,
  data: {
    tier: 'free' | 'premium';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    stripeSubscriptionId?: string;
    monthlyTokenLimit?: number;
  }
): Promise<boolean> {
  const updates: any = {
    subscription_tier: data.tier,
    subscription_status: data.status,
  };

  if (data.stripeSubscriptionId) {
    updates.stripe_subscription_id = data.stripeSubscriptionId;
  }

  if (data.monthlyTokenLimit !== undefined) {
    updates.monthly_token_limit = data.monthlyTokenLimit;
  }

  if (data.status === 'active') {
    updates.subscription_starts_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    logger.error({ error, userId }, 'Error updating subscription');
    return false;
  }

  // Invalidate caches after subscription update
  await invalidateUserCaches(userId);

  return true;
}

/**
 * Log subscription history event
 */
export async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  data: {
    tier: string;
    status: string;
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    amountCents?: number;
    currency?: string;
    metadata?: any;
  }
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('subscription_history')
    .insert({
      user_id: userId,
      tier: data.tier,
      status: data.status,
      event_type: eventType,
      stripe_subscription_id: data.stripeSubscriptionId,
      stripe_invoice_id: data.stripeInvoiceId,
      amount_cents: data.amountCents,
      currency: data.currency || 'usd',
      metadata: data.metadata || {},
    });

  if (error) {
    console.error('Error logging subscription event:', error);
    return false;
  }

  return true;
}

