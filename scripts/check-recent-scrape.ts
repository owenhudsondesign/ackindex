/**
 * Script to check recent Apify scrapes and what chunks were created
 * Run with: npx tsx scripts/check-recent-scrape.ts
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Try loading from .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nCurrent env state:');
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}`);
  console.error(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`);
  console.error('\nMake sure you have a .env.local or .env file with these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkRecentScrapes() {
  console.log('🔍 Checking recent Apify scrapes...\n');

  try {
    // Get recent documents from URL scrapes (Apify)
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('source_type', 'url')
      .order('created_at', { ascending: false })
      .limit(10);

    if (docError) {
      console.error('Error fetching documents:', docError);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('No URL scrapes found in the database.');
      return;
    }

    console.log(`Found ${documents.length} recent URL scrape(s):\n`);

    // For each document, get its scrape job and chunks
    for (const doc of documents) {
      console.log('─'.repeat(80));
      console.log(`📄 Document: ${doc.title || doc.source_url || 'Untitled'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   URL: ${doc.source_url || 'N/A'}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
      console.log(`   Chunks: ${doc.total_chunks}`);
      console.log(`   Tokens: ${doc.total_tokens.toLocaleString()}`);

      // Get scrape job info
      const { data: scrapeJob } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (scrapeJob) {
        console.log(`\n   🔧 Scrape Job Info:`);
        console.log(`      Apify Run ID: ${scrapeJob.apify_run_id || 'N/A'}`);
        console.log(`      Status: ${scrapeJob.apify_status || 'N/A'}`);
        console.log(`      Pages Crawled: ${scrapeJob.pages_crawled}`);
        console.log(`      PDFs Found: ${scrapeJob.pdfs_found}`);
        console.log(`      Completed: ${scrapeJob.completed_at ? new Date(scrapeJob.completed_at).toLocaleString() : 'Not completed'}`);
      }

      // Get sample chunks
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true })
        .limit(5); // Just show first 5 chunks as samples

      if (chunksError) {
        console.log(`   ⚠️  Error fetching chunks: ${chunksError.message}`);
      } else if (chunks && chunks.length > 0) {
        console.log(`\n   📦 Sample Chunks (showing first ${chunks.length} of ${doc.total_chunks}):`);
        chunks.forEach((chunk, idx) => {
          const contentPreview = chunk.content.substring(0, 150).replace(/\n/g, ' ');
          const metadataInfo = chunk.metadata ? Object.keys(chunk.metadata).join(', ') : 'none';
          console.log(`\n      Chunk ${chunk.chunk_index}:`);
          console.log(`         Content: "${contentPreview}${chunk.content.length > 150 ? '...' : ''}"`);
          console.log(`         Metadata: ${metadataInfo}`);
          console.log(`         Has Embedding: ${chunk.embedding ? 'Yes' : 'No'}`);
        });
        if (doc.total_chunks > chunks.length) {
          console.log(`\n      ... and ${doc.total_chunks - chunks.length} more chunks`);
        }
      } else {
        console.log(`   ⚠️  No chunks found for this document`);
      }

      console.log('');
    }

    // Summary statistics
    console.log('─'.repeat(80));
    console.log('\n📊 Summary:');
    const totalChunks = documents.reduce((sum, doc) => sum + (doc.total_chunks || 0), 0);
    const totalTokens = documents.reduce((sum, doc) => sum + (doc.total_tokens || 0), 0);
    const completed = documents.filter(doc => doc.status === 'completed').length;
    const processing = documents.filter(doc => doc.status === 'processing').length;
    const failed = documents.filter(doc => doc.status === 'failed').length;

    console.log(`   Total Documents: ${documents.length}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Processing: ${processing}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total Chunks: ${totalChunks.toLocaleString()}`);
    console.log(`   Total Tokens: ${totalTokens.toLocaleString()}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentScrapes()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

