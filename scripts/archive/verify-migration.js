/**
 * Verify migration status
 * Run with: node scripts/verify-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying migration status...\n');

  // Check if scheduled_scrapes table exists
  console.log('1. Checking scheduled_scrapes table...');
  const { data: scheduledData, error: scheduledError } = await supabase
    .from('scheduled_scrapes')
    .select('count')
    .limit(1);

  if (scheduledError) {
    console.log('   ❌ Table does not exist:', scheduledError.message);
  } else {
    console.log('   ✅ Table exists');
  }

  // Check if content_hashes table exists
  console.log('\n2. Checking content_hashes table...');
  const { data: hashData, error: hashError } = await supabase
    .from('content_hashes')
    .select('count')
    .limit(1);

  if (hashError) {
    console.log('   ❌ Table does not exist:', hashError.message);
  } else {
    console.log('   ✅ Table exists');
  }

  // Check if get_urls_for_scraping function exists
  console.log('\n3. Checking get_urls_for_scraping function...');
  const { data: funcData, error: funcError } = await supabase.rpc('get_urls_for_scraping', {
    batch_size: 1,
  });

  if (funcError) {
    console.log('   ❌ Function does not exist:', funcError.message);
    console.log('   💡 You need to apply the migration SQL in Supabase SQL Editor');
  } else {
    console.log('   ✅ Function exists');
    console.log(`   📊 Found ${funcData?.length || 0} URLs ready to scrape`);
  }

  console.log('\n✨ Verification complete!');
}

verifyMigration().catch(console.error);
