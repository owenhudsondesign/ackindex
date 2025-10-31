import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('scheduled_scrapes')
  .select('url, title, status, scrape_frequency, priority, last_scraped_at, next_scrape_at, error_count')
  .order('priority', { ascending: false });

if (error) {
  console.log('Error:', error.message);
  process.exit(1);
}

console.log(`\nScheduled URLs (${data.length} total):\n`);
console.log('='.repeat(100));

data.forEach((row, i) => {
  const status = row.status === 'active' ? '✅' : row.status === 'paused' ? '⏸️' : '❌';
  const lastScraped = row.last_scraped_at
    ? new Date(row.last_scraped_at).toLocaleDateString()
    : 'Never';
  const nextScrape = row.next_scrape_at
    ? new Date(row.next_scrape_at).toLocaleString()
    : 'Not scheduled';
  const errors = row.error_count > 0 ? ` (${row.error_count} errors)` : '';

  console.log(`${i+1}. ${status} [${row.status.toUpperCase()}] Priority: ${row.priority}`);
  console.log(`   URL: ${row.url}`);
  console.log(`   Title: ${row.title || 'No title'}`);
  console.log(`   Frequency: ${row.scrape_frequency}`);
  console.log(`   Last scraped: ${lastScraped} | Next: ${nextScrape}${errors}`);
  console.log('');
});

console.log('='.repeat(100));
