import { createClient } from '@supabase/supabase-js';

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
  tokens_used_this_month: number;
  queries_this_month: number;
  tokens_remaining: number;
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

/**
 * Update user profile
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
    console.error('Error updating user profile:', error);
    return null;
  }

  return data;
}

/**
 * Get user's dashboard data
 */
export async function getUserDashboard(userId: string): Promise<UserDashboard | null> {
  const { data, error } = await supabaseAdmin
    .from('user_dashboard')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user dashboard:', error);
    return null;
  }

  return data;
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
 * Check if user can make a query (has tokens remaining)
 */
export async function canUserQuery(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('can_user_query', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error checking user query limit:', error);
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
 * Update subscription
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
    console.error('Error updating subscription:', error);
    return false;
  }

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

