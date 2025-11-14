/**
 * Fix missing stripe_customer_id for existing premium users
 * This script finds the Stripe customer ID from the user's email and updates the profile
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Load environment variables first
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

async function fixStripeCustomerId(email: string) {
  try {
    // Initialize clients
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });

    console.log(`\n🔍 Looking up user: ${email}`);

    // First, get user from auth.users to get the user ID
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    const authUser = authData?.users.find(u => u.email === email);

    if (!authUser) {
      console.error('❌ User not found in auth.users');
      return;
    }

    console.log(`✅ Found auth user: ${authUser.id}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ User profile not found:', profileError);
      return;
    }

    console.log(`✅ Found user profile:`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Tier: ${profile.subscription_tier}`);
    console.log(`   Current stripe_customer_id: ${profile.stripe_customer_id || 'NULL'}`);

    // Search for Stripe customer by email
    console.log(`\n🔍 Searching Stripe for customer with email: ${email}`);
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      console.log('❌ No Stripe customer found with this email');
      return;
    }

    console.log(`✅ Found ${customers.data.length} Stripe customer(s):`);
    customers.data.forEach((customer, index) => {
      console.log(`\n   Customer ${index + 1}:`);
      console.log(`   ID: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Name: ${customer.name || 'N/A'}`);
      console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);
    });

    // Use the first (most recent) customer
    const customerId = customers.data[0].id;

    if (profile.stripe_customer_id === customerId) {
      console.log('\n✅ stripe_customer_id is already set correctly');
      return;
    }

    // Update the profile
    console.log(`\n📝 Updating profile with stripe_customer_id: ${customerId}`);
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return;
    }

    console.log('✅ Successfully updated stripe_customer_id!');

    // Verify the update
    const { data: updatedProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', profile.id)
      .single();

    console.log(`\n✅ Verified: stripe_customer_id = ${updatedProfile?.stripe_customer_id}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
const email = process.argv[2] || 'owenhudsondesign@gmail.com';
fixStripeCustomerId(email).then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
