/**
 * Test script to scrape a Laserfiche portal URL using Stagehand
 * Run with: npx tsx scripts/test-laserfiche-scrape.ts
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
import { scrapeUrl, validateUrl } from '../src/lib/apifyScraper';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const LASERFICHE_URL = 'https://portal.laserfiche.com/Portal/Browse.aspx?id=215444&repo=r-ec7bdbfe';

async function testLaserficheScrape() {
  console.log('🔧 Testing Laserfiche Scrape with Stagehand\n');
  console.log('─'.repeat(80));
  console.log(`📍 Target URL: ${LASERFICHE_URL}\n`);

  // Check environment variables
  console.log('🔑 Environment Check:');
  console.log(`   APIFY_API_TOKEN: ${process.env.APIFY_API_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`   STAGEHAND_ACTOR_ID: ${process.env.STAGEHAND_ACTOR_ID || 'Using default'}`);
  console.log(`   ENABLE_STAGEHAND_AUTO_DETECT: ${process.env.ENABLE_STAGEHAND_AUTO_DETECT}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set (required for Stagehand)' : '✗ Missing'}\n`);

  if (!process.env.APIFY_API_TOKEN) {
    console.error('❌ Missing APIFY_API_TOKEN environment variable');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY environment variable (required for Stagehand AI)');
    process.exit(1);
  }

  // Validate URL
  const validation = validateUrl(LASERFICHE_URL);
  if (!validation.valid) {
    console.error(`❌ Invalid URL: ${validation.error}`);
    process.exit(1);
  }
  console.log('✓ URL is valid\n');

  console.log('─'.repeat(80));

  try {
    console.log('🚀 Starting scrape job...\n');

    const { runId, results } = await scrapeUrl(LASERFICHE_URL, {
      maxDepth: 2,
      maxPages: 50,
      followLinks: true,
      extractPDFs: true,
    });

    console.log('─'.repeat(80));
    console.log('✅ Scrape Completed!\n');
    console.log(`📊 Run ID: ${runId}`);
    console.log(`📄 Pages Found: ${results.length}\n`);

    if (results.length === 0) {
      console.log('⚠️  No content was extracted. This could mean:');
      console.log('   - The page requires authentication');
      console.log('   - JavaScript didn\'t load properly');
      console.log('   - The content is behind a paywall/login');
      console.log('   - The page structure is incompatible\n');
      return;
    }

    // Display results
    console.log('─'.repeat(80));
    console.log('📑 Scraped Content:\n');

    results.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.title || 'Untitled'}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Text Length: ${result.text.length.toLocaleString()} characters`);
      console.log(`   PDFs: ${result.pdfs.length}`);
      console.log(`   Tables: ${result.tables?.length || 0}`);

      if (result.pdfs.length > 0) {
        console.log(`   PDF Files:`);
        result.pdfs.forEach(pdf => {
          console.log(`      - ${pdf.filename}`);
        });
      }

      if (result.tables && result.tables.length > 0) {
        console.log(`   Tables Found:`);
        result.tables.forEach((table, tableIdx) => {
          console.log(`      - Table ${tableIdx + 1}: ${table.rows}x${table.cols} (page ${table.page})`);
        });
      }

      // Show content preview
      if (result.text.length > 0) {
        const preview = result.text.substring(0, 300).replace(/\n/g, ' ');
        console.log(`   Preview: "${preview}${result.text.length > 300 ? '...' : ''}"`);
      }

      console.log(`   Metadata:`, JSON.stringify(result.metadata, null, 2));
      console.log('');
    });

    // Summary
    console.log('─'.repeat(80));
    console.log('📊 Summary:');
    const totalText = results.reduce((sum, r) => sum + r.text.length, 0);
    const totalPDFs = results.reduce((sum, r) => sum + r.pdfs.length, 0);
    const totalTables = results.reduce((sum, r) => sum + (r.tables?.length || 0), 0);

    console.log(`   Total Pages: ${results.length}`);
    console.log(`   Total Text: ${totalText.toLocaleString()} characters`);
    console.log(`   Total PDFs: ${totalPDFs}`);
    console.log(`   Total Tables: ${totalTables}`);
    console.log(`   Apify Run ID: ${runId}`);
    console.log(`   View in Apify: https://console.apify.com/actors/runs/${runId}`);

  } catch (error) {
    console.error('─'.repeat(80));
    console.error('❌ Scrape Failed!\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

testLaserficheScrape()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
