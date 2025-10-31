/**
 * Test what the cron job would find when it runs
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function testCronQuery() {
  console.log('🔍 Testing what the cron job would scrape...\n');

  // This is the exact query used by the cron job
  const { data: urlsToScrape, error } = await supabase.rpc(
    'get_urls_for_scraping',
    { batch_size: 10 }
  );

  if (error) {
    console.error('❌ Error calling get_urls_for_scraping:', error);
    return;
  }

  console.log(`📊 URLs that would be scraped: ${urlsToScrape?.length || 0}\n`);

  if (urlsToScrape && urlsToScrape.length > 0) {
    console.log('⚠️  These URLs would be processed by the cron job:');
    urlsToScrape.forEach((url: any, idx: number) => {
      console.log(`${idx + 1}. ${url.url}`);
      console.log(`   Priority: ${url.priority}, Last scraped: ${url.last_scraped_at || 'Never'}`);
    });
  } else {
    console.log('✅ Cron job would find NOTHING to scrape - all clear!');
  }
}

testCronQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
