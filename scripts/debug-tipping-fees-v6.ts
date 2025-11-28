import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding } from '../src/lib/embeddings';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTippingFeesV6() {
  console.log('=== COMPARING SEARCH FUNCTIONS ===\n');

  const simpleQuery = 'solid waste tipping fees';
  const simpleEmb = await generateQueryEmbedding(simpleQuery);

  console.log('Query:', simpleQuery);
  console.log('Embedding length:', simpleEmb.length);
  console.log('');

  // Test hybrid_search_chunks
  console.log('=== hybrid_search_chunks ===');
  const { data: hybridData, error: hybridError } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: simpleEmb,
    query_text: simpleQuery,
    match_count: 5,
  });

  if (hybridError) {
    console.log('Hybrid error:', hybridError);
  } else {
    console.log('Hybrid results:', hybridData?.length || 0);
    for (const r of (hybridData || []).slice(0, 3)) {
      console.log(`  Sim: ${r.similarity?.toFixed(4)} | Content: ${r.content?.substring(0, 60)}`);
    }
  }

  // Test search_similar_chunks
  console.log('\n=== search_similar_chunks ===');
  const { data: semanticData, error: semanticError } = await supabase.rpc('search_similar_chunks', {
    query_embedding: simpleEmb,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (semanticError) {
    console.log('Semantic error:', semanticError);
  } else {
    console.log('Semantic results:', semanticData?.length || 0);
    for (const r of (semanticData || []).slice(0, 3)) {
      console.log(`  Sim: ${r.similarity?.toFixed(4)} | Content: ${r.content?.substring(0, 60)}`);
    }
  }

  // Check if there's an issue with how the embedding is being passed
  console.log('\n=== CHECKING EMBEDDING FORMAT ===');
  console.log('First 5 values:', simpleEmb.slice(0, 5));
  console.log('Is array:', Array.isArray(simpleEmb));
  console.log('Contains NaN:', simpleEmb.some(isNaN));

  // Try calling with raw SQL to see what's happening
  console.log('\n=== RAW SQL TEST ===');

  // Get a sample chunk embedding to compare dimensions
  const { data: sampleChunk } = await supabase
    .from('document_chunks')
    .select('id, content, embedding')
    .not('embedding', 'is', null)
    .limit(1);

  if (sampleChunk && sampleChunk.length > 0) {
    console.log('Sample chunk ID:', sampleChunk[0].id);
    console.log('Sample content:', sampleChunk[0].content?.substring(0, 50));
    console.log('Sample embedding type:', typeof sampleChunk[0].embedding);

    // Check if embedding is a string (needs parsing)
    const embData = sampleChunk[0].embedding;
    if (typeof embData === 'string') {
      console.log('Embedding is STRING, first 50 chars:', embData.substring(0, 50));
    } else if (Array.isArray(embData)) {
      console.log('Embedding is ARRAY, length:', embData.length);
    } else {
      console.log('Embedding is:', Object.prototype.toString.call(embData));
    }
  }
}

debugTippingFeesV6().catch(console.error);
