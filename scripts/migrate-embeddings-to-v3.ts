/**
 * Migration Script: Upgrade embeddings to text-embedding-3-large
 *
 * This script regenerates ALL embeddings in the database using the new
 * text-embedding-3-large model. Run this before switching the production
 * code to use the new model.
 *
 * Usage:
 *   npx tsx scripts/migrate-embeddings-to-v3.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --batch=N    Process N chunks at a time (default: 100)
 *   --start=ID   Start from a specific chunk ID (for resuming)
 *
 * After migration completes:
 *   1. Verify embeddings work by testing a few queries
 *   2. Update src/lib/embeddings.ts to use text-embedding-3-large
 *   3. Deploy the code change
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// New embedding model configuration
const NEW_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 1536; // Reduce from 3072 for DB compatibility

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchArg = args.find(a => a.startsWith('--batch='));
const startArg = args.find(a => a.startsWith('--start='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1]) : 100;
const START_ID = startArg ? startArg.split('=')[1] : null;

interface Chunk {
  id: string;
  content: string;
  document_id: string;
}

async function generateEmbeddingV3(text: string): Promise<number[]> {
  const cleanText = text.trim().slice(0, 32000);

  const response = await openai.embeddings.create({
    model: NEW_MODEL,
    input: cleanText,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

async function generateEmbeddingsBatchV3(texts: string[]): Promise<number[][]> {
  const cleanTexts = texts.map(t => t.trim().slice(0, 32000));

  const response = await openai.embeddings.create({
    model: NEW_MODEL,
    input: cleanTexts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data.map(d => d.embedding);
}

async function getTotalChunks(): Promise<number> {
  const { count, error } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
}

async function getChunksBatch(lastId: string | null, limit: number): Promise<Chunk[]> {
  let query = supabase
    .from('document_chunks')
    .select('id, content, document_id')
    .order('id', { ascending: true })
    .limit(limit);

  if (lastId) {
    query = query.gt('id', lastId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function updateChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  const { error } = await supabase
    .from('document_chunks')
    .update({ embedding })
    .eq('id', chunkId);

  if (error) throw error;
}

async function updateChunkEmbeddingsBatch(updates: { id: string; embedding: number[] }[]): Promise<void> {
  // Supabase doesn't support batch updates well, so we'll use a transaction-like approach
  const promises = updates.map(({ id, embedding }) =>
    supabase
      .from('document_chunks')
      .update({ embedding })
      .eq('id', id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error('Some updates failed:', errors.map(e => e.error));
    throw new Error(`${errors.length} updates failed`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateEmbeddings() {
  console.log('='.repeat(60));
  console.log('Embedding Migration: text-embedding-ada-002 -> text-embedding-3-large');
  console.log('='.repeat(60));
  console.log(`\nModel: ${NEW_MODEL}`);
  console.log(`Dimensions: ${EMBEDDING_DIMENSIONS}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${isDryRun}`);
  if (START_ID) console.log(`Starting from ID: ${START_ID}`);
  console.log();

  // Get total count
  const totalChunks = await getTotalChunks();
  console.log(`Total chunks in database: ${totalChunks}`);

  if (isDryRun) {
    console.log('\n[DRY RUN] Would process all chunks but not making changes.\n');
  }

  let processedCount = 0;
  let lastId = START_ID;
  let errorCount = 0;
  const startTime = Date.now();

  while (true) {
    // Fetch batch of chunks
    const chunks = await getChunksBatch(lastId, BATCH_SIZE);

    if (chunks.length === 0) {
      break; // No more chunks
    }

    const batchStart = Date.now();

    try {
      if (!isDryRun) {
        // Generate embeddings for batch
        const embeddings = await generateEmbeddingsBatchV3(chunks.map(c => c.content));

        // Update database
        const updates = chunks.map((chunk, i) => ({
          id: chunk.id,
          embedding: embeddings[i],
        }));

        await updateChunkEmbeddingsBatch(updates);
      }

      processedCount += chunks.length;
      lastId = chunks[chunks.length - 1].id;

      const elapsed = Date.now() - startTime;
      const rate = processedCount / (elapsed / 1000);
      const remaining = totalChunks - processedCount;
      const eta = remaining / rate;

      const batchTime = Date.now() - batchStart;

      console.log(
        `[${new Date().toISOString()}] ` +
        `Processed: ${processedCount}/${totalChunks} (${((processedCount/totalChunks)*100).toFixed(1)}%) | ` +
        `Batch: ${batchTime}ms | ` +
        `Rate: ${rate.toFixed(1)}/s | ` +
        `ETA: ${Math.ceil(eta/60)}min`
      );

      // Rate limiting - OpenAI allows ~3000 RPM for embeddings
      // With batch size 100, we can do about 30 batches/min safely
      await sleep(2000); // 2 second delay between batches

    } catch (error) {
      errorCount++;
      console.error(`\nError processing batch starting at ${lastId}:`, error);

      if (errorCount > 10) {
        console.error('\nToo many errors, stopping migration.');
        console.log(`\nTo resume, run with: --start=${lastId}`);
        process.exit(1);
      }

      // Back off on error
      console.log('Waiting 10 seconds before retrying...');
      await sleep(10000);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('Migration Complete!');
  console.log('='.repeat(60));
  console.log(`\nTotal chunks processed: ${processedCount}`);
  console.log(`Total time: ${Math.floor(totalTime/60)}m ${Math.floor(totalTime%60)}s`);
  console.log(`Errors encountered: ${errorCount}`);

  if (!isDryRun) {
    console.log(`
Next steps:
1. Test the embeddings by running a few queries against the database
2. Update src/lib/embeddings.ts:
   - Change EMBEDDING_MODEL to 'text-embedding-3-large'
   - Add dimensions: EMBEDDING_DIMENSIONS to the API calls
3. Deploy the code change
4. Verify the chatbot works correctly
`);
  }
}

// Run migration
migrateEmbeddings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
