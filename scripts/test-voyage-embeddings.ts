/**
 * Test script to verify Voyage AI embeddings are working correctly
 * and check similarity scores.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { VoyageAIClient } from 'voyageai';

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_QUERIES = [
  'What happened at the Select Board meeting?',
  'What are the zoning regulations?',
  'Tell me about affordable housing',
  'What is the town budget?',
  'When is the next meeting?',
];

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await voyage.embed({
    input: text.trim(),
    model: 'voyage-3-large',
    inputType: 'query',
  });
  return response.data![0].embedding!;
}

async function testQuery(query: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Query: "${query}"`);
  console.log('='.repeat(60));

  const queryEmbedding = await generateQueryEmbedding(query);

  // Use the hybrid_search_chunks function
  const { data, error } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: queryEmbedding,
    query_text: query,
    match_count: 5,
  });

  if (error) {
    console.error('Search error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No results found');
    return;
  }

  console.log(`\nTop ${data.length} results:`);
  data.forEach((result: any, i: number) => {
    console.log(`\n${i + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`   Content: ${result.content.slice(0, 150)}...`);
  });

  // Summary stats
  const similarities = data.map((r: any) => r.similarity);
  console.log(`\nSimilarity range: ${(Math.min(...similarities) * 100).toFixed(1)}% - ${(Math.max(...similarities) * 100).toFixed(1)}%`);
  console.log(`Average similarity: ${((similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length) * 100).toFixed(1)}%`);
}

async function main() {
  console.log('Testing Voyage AI voyage-3-large embeddings');
  console.log('='.repeat(60));

  // Check embedding dimensions in DB
  const { data: sample } = await supabase
    .from('document_chunks')
    .select('id, embedding')
    .limit(1)
    .single();

  if (sample?.embedding) {
    const dims = Array.isArray(sample.embedding)
      ? sample.embedding.length
      : sample.embedding.split(',').length;
    console.log(`\nEmbedding dimensions in DB: ${dims}`);
  }

  for (const query of TEST_QUERIES) {
    await testQuery(query);
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Testing complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
