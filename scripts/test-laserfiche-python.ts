/**
 * Test Laserfiche scrape with Python PDF scraper (instead of Stagehand)
 * Run with: npx tsx scripts/test-laserfiche-python.ts
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
import { scrapeUrl } from '../src/lib/apifyScraper';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Override to force Python actor
process.env.ENABLE_STAGEHAND_AUTO_DETECT = 'false';

const LASERFICHE_URL = 'https://portal.laserfiche.com/Portal/Browse.aspx?id=215444&repo=r-ec7bdbfe';

async function testPythonScraper() {
  console.log('🔧 Testing Laserfiche with Python PDF Scraper\n');
  console.log('─'.repeat(80));
  console.log(`📍 Target URL: ${LASERFICHE_URL}`);
  console.log(`🐍 Using Python actor (Stagehand disabled)\n`);

  try {
    console.log('🚀 Starting scrape...\n');

    const { runId, results } = await scrapeUrl(LASERFICHE_URL, {
      maxDepth: 2,
      maxPages: 50,
      followLinks: true,
      extractPDFs: true,
    });

    console.log('─'.repeat(80));
    console.log('✅ Scrape Completed!\n');
    console.log(`📊 Run ID: ${runId}`);
    console.log(`📄 Results: ${results.length} items\n`);

    if (results.length === 0) {
      console.log('⚠️  No content extracted. Possible reasons:');
      console.log('   - Page requires authentication');
      console.log('   - Content is client-side rendered (needs Stagehand)');
      console.log('   - No PDFs or extractable content found\n');
      return;
    }

    // Display results
    console.log('─'.repeat(80));
    console.log('📑 Results:\n');

    results.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.title || 'Untitled'}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Text: ${result.text.length.toLocaleString()} chars`);
      console.log(`   PDFs: ${result.pdfs.length}`);
      console.log(`   Tables: ${result.tables?.length || 0}`);

      if (result.text.length > 0) {
        const preview = result.text.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   Preview: "${preview}..."`);
      }
      console.log('');
    });

    // Summary
    const totalText = results.reduce((sum, r) => sum + r.text.length, 0);
    const totalPDFs = results.reduce((sum, r) => sum + r.pdfs.length, 0);

    console.log('─'.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Items: ${results.length}`);
    console.log(`   Text: ${totalText.toLocaleString()} chars`);
    console.log(`   PDFs: ${totalPDFs}`);
    console.log(`   Run: https://console.apify.com/actors/runs/${runId}`);

  } catch (error) {
    console.error('─'.repeat(80));
    console.error('❌ Failed!\n');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testPythonScraper()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
