import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkDocumentChunks() {
  console.log('Checking document chunks and content...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all completed documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      process.exit(1);
    }

    if (!docs || docs.length === 0) {
      console.log('No completed documents found.');
      process.exit(0);
    }

    console.log(`Found ${docs.length} completed document(s):\n`);

    for (const doc of docs) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📄 ${doc.title || doc.url}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Chunks: ${doc.chunk_count || 0}`);
      console.log(`   Total Tokens: ${doc.total_tokens || 0}`);
      console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);

      // Get chunk details
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('chunk_index, content, tokens, embedding')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true });

      if (chunksError) {
        console.log(`   ⚠️  Error fetching chunks: ${chunksError.message}`);
        continue;
      }

      if (!chunks || chunks.length === 0) {
        console.log(`   ❌ No chunks found!`);
        continue;
      }

      console.log(`\n   Chunk Details:`);
      for (const chunk of chunks.slice(0, 3)) { // Show first 3 chunks
        console.log(`   \n   Chunk ${chunk.chunk_index}:`);
        console.log(`      Tokens: ${chunk.tokens}`);
        console.log(`      Has Embedding: ${chunk.embedding ? 'Yes' : 'No'}`);
        console.log(`      Content Preview: ${chunk.content.substring(0, 200)}...`);
      }

      if (chunks.length > 3) {
        console.log(`\n   ... and ${chunks.length - 3} more chunk(s)`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary
    const totalChunks = docs.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0);
    const totalTokens = docs.reduce((sum, doc) => sum + (doc.total_tokens || 0), 0);

    console.log('Summary:');
    console.log(`Total Documents: ${docs.length}`);
    console.log(`Total Chunks: ${totalChunks}`);
    console.log(`Total Tokens: ${totalTokens}`);
    console.log(`Average Chunks per Document: ${(totalChunks / docs.length).toFixed(1)}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDocumentChunks().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
