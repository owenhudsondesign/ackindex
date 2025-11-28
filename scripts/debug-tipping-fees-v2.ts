import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding } from '../src/lib/embeddings';
import { expandQuery } from '../src/lib/queryExpansion';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTippingFeesV2() {
  console.log('=== TESTING QUERY EXPANSION IMPACT ===\n');

  // Test 1: Original query without expansion
  const rawQuery = 'tell me about solid waste tipping fees';
  console.log('Query:', rawQuery);

  const rawEmbedding = await generateQueryEmbedding(rawQuery);
  const { data: rawResults } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: rawEmbedding,
    query_text: rawQuery,
    match_count: 5,
  });

  console.log('\n--- WITHOUT expansion ---');
  console.log('Results count:', rawResults?.length || 0);
  for (const r of (rawResults || []).slice(0, 3)) {
    const hasTipping = r.content?.toLowerCase().includes('tipping');
    console.log(`Sim: ${r.similarity.toFixed(3)} | Tipping: ${hasTipping} | Content: ${r.content?.substring(0, 80)}`);
  }

  // Test 2: With expansion
  const expansion = expandQuery(rawQuery);
  console.log('\n--- WITH expansion ---');
  console.log('Expanded:', expansion.expandedQuery);

  const expandedEmbedding = await generateQueryEmbedding(expansion.expandedQuery);
  const { data: expandedResults } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: expandedEmbedding,
    query_text: expansion.expandedQuery,
    match_count: 5,
  });

  console.log('Results count:', expandedResults?.length || 0);
  for (const r of (expandedResults || []).slice(0, 3)) {
    const hasTipping = r.content?.toLowerCase().includes('tipping');
    console.log(`Sim: ${r.similarity.toFixed(3)} | Tipping: ${hasTipping} | Content: ${r.content?.substring(0, 80)}`);
  }

  // Test 3: Check if "tell me about" is causing issues
  const simpleQuery = 'solid waste tipping fees';
  console.log('\n--- SIMPLE query (no "tell me about") ---');
  console.log('Query:', simpleQuery);

  const simpleEmbedding = await generateQueryEmbedding(simpleQuery);
  const { data: simpleResults } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: simpleEmbedding,
    query_text: simpleQuery,
    match_count: 5,
  });

  console.log('Results count:', simpleResults?.length || 0);
  for (const r of (simpleResults || []).slice(0, 3)) {
    const hasTipping = r.content?.toLowerCase().includes('tipping');
    console.log(`Sim: ${r.similarity.toFixed(3)} | Tipping: ${hasTipping} | Content: ${r.content?.substring(0, 80)}`);
  }

  // Test 4: Check what the "tell me about" pattern does
  console.log('\n--- TOPIC EXPLORATION pattern ---');
  const topicPatterns = [
    /tell\s+me\s+about/i,
    /what\s+is\s+(the\s+)?(a\s+)?[\w\s]+/i,
    /information\s+(about|on|regarding)/i,
  ];

  for (const pattern of topicPatterns) {
    console.log(`Pattern: ${pattern.source} | Match: ${pattern.test(rawQuery)}`);
  }

  // Test 5: Check what isTopicExplorationQuery returns
  const { isTopicExplorationQuery } = await import('../src/lib/retrieval');
  console.log('\nisTopicExplorationQuery:', isTopicExplorationQuery(rawQuery));

  // Test 6: Check what happens in actual retrieval
  console.log('\n--- FULL RETRIEVAL FLOW ---');
  const { retrieveRelevantChunks } = await import('../src/lib/retrieval');

  const fullResults = await retrieveRelevantChunks(rawQuery, {
    maxResults: 10,
    minSimilarity: 0.30,
    includeDocumentInfo: true,
    searchMode: 'hybrid',
  });

  console.log('Full retrieval count:', fullResults.length);
  for (const r of fullResults.slice(0, 5)) {
    const hasTipping = r.content?.toLowerCase().includes('tipping');
    console.log(`Sim: ${r.similarity.toFixed(3)} | Tipping: ${hasTipping} | Title: ${r.document?.title?.substring(0, 50)}`);
  }
}

debugTippingFeesV2().catch(console.error);
