/**
 * Update token limits for all users to new values
 * Free: 15,000 tokens/month
 * Premium: 500,000 tokens/month
 */

import { supabaseAdmin } from '../src/lib/supabase';

async function updateTokenLimits() {
  console.log('\n🔄 Updating token limits for all users...\n');

  // Update Free tier users
  const { data: freeUsers, error: freeError } = await supabaseAdmin
    .from('user_profiles')
    .update({ monthly_token_limit: 15000 })
    .eq('subscription_tier', 'free')
    .select('id, full_name, subscription_tier');

  if (freeError) {
    console.error('❌ Error updating free users:', freeError);
  } else {
    console.log(`✅ Updated ${freeUsers?.length || 0} free tier users to 15,000 tokens/month`);
    freeUsers?.forEach(user => {
      console.log(`   - ${user.full_name || user.id}`);
    });
  }

  // Update Premium tier users
  const { data: premiumUsers, error: premiumError } = await supabaseAdmin
    .from('user_profiles')
    .update({ monthly_token_limit: 500000 })
    .eq('subscription_tier', 'premium')
    .select('id, full_name, subscription_tier');

  if (premiumError) {
    console.error('❌ Error updating premium users:', premiumError);
  } else {
    console.log(`\n✅ Updated ${premiumUsers?.length || 0} premium tier users to 500,000 tokens/month`);
    premiumUsers?.forEach(user => {
      console.log(`   - ${user.full_name || user.id}`);
    });
  }

  console.log('\n✅ Token limit update complete!\n');
}

updateTokenLimits();
