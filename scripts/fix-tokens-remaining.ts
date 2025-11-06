/**
 * Fix tokens_remaining calculation in user_dashboard view
 *
 * This updates the view to show actual remaining tokens for premium users
 * instead of showing 999,999,999
 *
 * Run with: npx tsx scripts/fix-tokens-remaining.ts
 */

import { supabaseAdmin } from '../src/lib/supabase';

const migration = `
-- Fix tokens_remaining calculation for premium users
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
  u.id,
  u.email,
  p.full_name,
  p.subscription_tier,
  p.subscription_status,
  p.monthly_token_limit,
  p.email_updates_enabled,
  COALESCE(ut.total_tokens, 0) as tokens_used_this_month,
  COALESCE(ut.query_count, 0) as queries_this_month,
  -- Calculate actual remaining tokens for all users (including premium)
  p.monthly_token_limit - COALESCE(ut.total_tokens, 0) as tokens_remaining
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
  AND ut.year = EXTRACT(YEAR FROM NOW())
  AND ut.month = EXTRACT(MONTH FROM NOW());
`;

async function fixTokensRemaining() {
  console.log('🔧 Fixing tokens_remaining calculation...\n');

  try {
    // Execute the migration
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: migration
    });

    if (error) {
      // Try direct query if RPC doesn't exist
      console.log('Trying direct query...');
      const { error: directError } = await supabaseAdmin.from('_').select('*').limit(0);

      console.error('❌ Error: This script requires database admin access.');
      console.error('Please run the SQL directly in Supabase Dashboard > SQL Editor:\n');
      console.log(migration);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nThe user_dashboard view now shows:');
    console.log('  Before: 999,999,999 tokens remaining (for premium)');
    console.log('  After:  Actual tokens remaining (e.g., 40,579)');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nPlease run this SQL in Supabase Dashboard > SQL Editor:\n');
    console.log(migration);
    process.exit(1);
  }
}

fixTokensRemaining();
