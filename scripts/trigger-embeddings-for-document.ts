/**
 * Manually trigger embedding generation for a specific document
 * Usage: npx tsx scripts/trigger-embeddings-for-document.ts <documentId>
 */

import { createClient } from '@supabase/supabase-js';
import { scrapingQueue, embeddingQueue } from '../src/lib/queues';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function triggerEmbeddings(documentId?: string) {
  console.log('\n🚀 Triggering Embedding Generation\n');

  let targetDocumentId = documentId;

  // If no document ID provided, get the most recent completed document
  if (!targetDocumentId) {
    console.log('📄 No document ID provided, finding most recent completed document...\n');

    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, status, total_chunks')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!docs || docs.length === 0) {
      console.error('❌ No completed documents found');
      process.exit(1);
    }

    targetDocumentId = docs[0].id;
    console.log(`✅ Found document: "${docs[0].title}"`);
    console.log(`   ID: ${targetDocumentId}`);
    console.log(`   Total chunks: ${docs[0].total_chunks}\n`);
  }

  // Get chunks without embeddings
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, content')
    .eq('document_id', targetDocumentId)
    .is('embedding', null)
    .limit(1000);

  if (error) {
    console.error('❌ Error fetching chunks:', error);
    process.exit(1);
  }

  if (!chunks || chunks.length === 0) {
    console.log('✅ All chunks already have embeddings!');
    process.exit(0);
  }

  console.log(`📊 Found ${chunks.length} chunks without embeddings\n`);
  console.log('⚙️  Queueing embedding generation job...\n');

  // Queue the embedding job
  const job = await embeddingQueue.add('generate-embeddings', { chunks });

  console.log(`✅ Embedding job queued successfully!`);
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Chunks to process: ${chunks.length}`);
  console.log(`\n💡 Monitor progress in Bull Board or check embedding status with:`);
  console.log(`   npx tsx scripts/test-long-video-query.ts\n`);

  process.exit(0);
}

const documentId = process.argv[2];
triggerEmbeddings(documentId).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
