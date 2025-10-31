/**
 * Utility script to clean up concatenated URLs in the scheduled_scrapes table
 *
 * This script:
 * 1. Finds URLs that contain multiple concatenated URLs (e.g., "http://example.com/meetinghttp://example.com/meeting2")
 * 2. Splits them into individual URLs
 * 3. Removes the concatenated entry
 * 4. Creates separate entries for each individual URL
 *
 * Usage: npx tsx scripts/cleanup-concatenated-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
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

interface ScheduledScrape {
  id: string;
  url: string;
  title: string | null;
  scrape_frequency: string;
  priority: number;
  status: string;
  created_by: string | null;
}

/**
 * Detects if a URL string contains multiple concatenated URLs
 */
function isConcatenated(url: string): boolean {
  // Look for patterns like "http://...http://" or "https://...https://"
  const httpCount = (url.match(/https?:\/\//g) || []).length;
  return httpCount > 1;
}

/**
 * Splits a concatenated URL string into individual URLs
 */
function splitConcatenatedUrl(concatenated: string): string[] {
  // Split on http:// or https:// but keep the protocol
  const urls: string[] = [];
  const parts = concatenated.split(/(https?:\/\/)/);

  let currentUrl = '';
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].match(/https?:\/\//)) {
      // If we have a current URL being built, save it
      if (currentUrl) {
        urls.push(currentUrl);
      }
      // Start new URL with the protocol
      currentUrl = parts[i];
    } else if (currentUrl && parts[i]) {
      // Add the part to the current URL
      currentUrl += parts[i];
    }
  }

  // Don't forget the last URL
  if (currentUrl) {
    urls.push(currentUrl);
  }

  // Validate and clean URLs
  return urls
    .map(url => url.trim())
    .filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
}

async function cleanupConcatenatedUrls() {
  console.log('🔍 Starting URL cleanup process...\n');

  // Fetch all scheduled scrapes
  const { data: scrapes, error: fetchError } = await supabase
    .from('scheduled_scrapes')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching scheduled scrapes:', fetchError);
    return;
  }

  if (!scrapes || scrapes.length === 0) {
    console.log('✅ No scheduled scrapes found.');
    return;
  }

  console.log(`📊 Found ${scrapes.length} total scheduled scrapes`);

  // Find concatenated URLs
  const concatenated = scrapes.filter(scrape => isConcatenated(scrape.url));

  if (concatenated.length === 0) {
    console.log('✅ No concatenated URLs found. Database is clean!');
    return;
  }

  console.log(`\n⚠️  Found ${concatenated.length} concatenated URLs:\n`);

  let totalFixed = 0;
  let totalCreated = 0;

  for (const scrape of concatenated) {
    console.log(`\n📝 Processing: ${scrape.url.substring(0, 100)}...`);

    const individualUrls = splitConcatenatedUrl(scrape.url);
    console.log(`   Split into ${individualUrls.length} URLs:`);

    individualUrls.forEach((url, idx) => {
      console.log(`   ${idx + 1}. ${url}`);
    });

    // Check which URLs already exist
    const { data: existing } = await supabase
      .from('scheduled_scrapes')
      .select('url')
      .in('url', individualUrls);

    const existingUrls = new Set(existing?.map(e => e.url) || []);
    const newUrls = individualUrls.filter(url => !existingUrls.has(url));

    // Create entries for new URLs
    if (newUrls.length > 0) {
      const newEntries = newUrls.map(url => ({
        url,
        title: scrape.title || new URL(url).hostname,
        scrape_frequency: scrape.scrape_frequency,
        priority: scrape.priority,
        status: scrape.status,
        created_by: scrape.created_by,
        next_scrape_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('scheduled_scrapes')
        .insert(newEntries);

      if (insertError) {
        console.error(`   ❌ Error creating new entries:`, insertError);
        continue;
      }

      console.log(`   ✅ Created ${newUrls.length} new entries`);
      totalCreated += newUrls.length;
    } else {
      console.log(`   ℹ️  All URLs already exist, skipping creation`);
    }

    // Delete the concatenated entry
    const { error: deleteError } = await supabase
      .from('scheduled_scrapes')
      .delete()
      .eq('id', scrape.id);

    if (deleteError) {
      console.error(`   ❌ Error deleting concatenated entry:`, deleteError);
      continue;
    }

    console.log(`   🗑️  Removed concatenated entry`);
    totalFixed++;
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Fixed ${totalFixed} concatenated entries`);
  console.log(`   - Created ${totalCreated} new individual entries`);
}

// Run the cleanup
cleanupConcatenatedUrls()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
