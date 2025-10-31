/**
 * Quick script to check scheduled scrapes in the database
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

async function checkScheduledScrapes() {
  console.log('🔍 Checking scheduled scrapes...\n');

  const { data, error, count } = await supabase
    .from('scheduled_scrapes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total scheduled scrapes: ${count || 0}\n`);

  if (data && data.length > 0) {
    console.log('URLs in database:');
    data.forEach((scrape, idx) => {
      console.log(`${idx + 1}. [${scrape.status}] ${scrape.url}`);
      console.log(`   Priority: ${scrape.priority}, Frequency: ${scrape.scrape_frequency}`);
    });
  } else {
    console.log('✅ No scheduled scrapes found - database is clean!');
  }
}

checkScheduledScrapes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
