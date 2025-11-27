/**
 * Test Script: Verify text-embedding-3-large works with your database
 *
 * Run this AFTER the migration to verify embeddings are working correctly
 * before switching the production code to the new model.
 *
 * Usage:
 *   npx tsx scripts/test-embedding-v3.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const NEW_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 1536;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateTestEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: NEW_MODEL,
    input: text.trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

async function testEmbeddings() {
  console.log('Testing text-embedding-3-large with your database...\n');

  const testQueries = [
    'What happened at the last town meeting?',
    'Select board decisions',
    'Zoning regulations',
    'Water protection',
  ];

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);

    try {
      // Generate embedding for query
      const queryEmbedding = await generateTestEmbedding(query);

      // Search using the hybrid_search_chunks function
      const { data, error } = await supabase.rpc('hybrid_search_chunks', {
        query_embedding: queryEmbedding,
        query_text: query,
        match_count: 5,
      });

      if (error) {
        console.error('  Error:', error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.log('  No results found\n');
        continue;
      }

      console.log(`  Found ${data.length} results:`);
      for (let i = 0; i < Math.min(3, data.length); i++) {
        const result = data[i];
        console.log(`    ${i + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`       Content: ${result.content.substring(0, 100)}...`);
      }
      console.log();

      // Check if similarity is reasonable
      const topSimilarity = data[0]?.similarity || 0;
      if (topSimilarity < 0.5) {
        console.log('  ⚠️  Warning: Low similarity scores. Migration may not be complete.');
      } else if (topSimilarity > 0.7) {
        console.log('  ✅ Good similarity scores!');
      }
      console.log();

    } catch (err) {
      console.error('  Error:', err);
    }
  }

  console.log('='.repeat(60));
  console.log('Test complete!');
  console.log(`
If all queries show good similarity scores (>0.7), you can:
1. Update src/lib/embeddings.ts to use text-embedding-3-large
2. Deploy the code change
3. Verify the chatbot works in production
`);
}

testEmbeddings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
