import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding, generateEmbedding } from '../src/lib/embeddings';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTippingFeesV5() {
  console.log('=== CHECKING DATABASE SEARCH DIRECTLY ===\n');

  // The simple query works with hybrid search, let's understand why

  const simpleQuery = 'solid waste tipping fees';
  const complexQuery = 'tell me about solid waste tipping fees';

  console.log('Simple query:', simpleQuery);
  console.log('Complex query:', complexQuery);
  console.log('');

  // Generate both embeddings
  const simpleEmb = await generateQueryEmbedding(simpleQuery);
  const complexEmb = await generateQueryEmbedding(complexQuery);

  console.log('Simple embedding length:', simpleEmb.length);
  console.log('Complex embedding length:', complexEmb.length);
  console.log('');

  // Calculate cosine similarity between the two queries
  let dotProduct = 0;
  let normSimple = 0;
  let normComplex = 0;
  for (let i = 0; i < simpleEmb.length; i++) {
    dotProduct += simpleEmb[i] * complexEmb[i];
    normSimple += simpleEmb[i] * simpleEmb[i];
    normComplex += complexEmb[i] * complexEmb[i];
  }
  const querySim = dotProduct / (Math.sqrt(normSimple) * Math.sqrt(normComplex));
  console.log('Similarity between queries:', querySim.toFixed(4));
  console.log('');

  // Test with lower match threshold
  console.log('=== TESTING WITH DIFFERENT THRESHOLDS ===');

  for (const threshold of [0.1, 0.2, 0.3, 0.4, 0.5]) {
    // Test simple query
    const { data: simpleResults } = await supabase.rpc('search_similar_chunks', {
      query_embedding: simpleEmb,
      match_threshold: threshold,
      match_count: 3,
    });

    // Test complex query
    const { data: complexResults } = await supabase.rpc('search_similar_chunks', {
      query_embedding: complexEmb,
      match_threshold: threshold,
      match_count: 3,
    });

    console.log(`Threshold ${threshold}: Simple=${simpleResults?.length || 0}, Complex=${complexResults?.length || 0}`);

    if (simpleResults?.length > 0 || complexResults?.length > 0) {
      if (simpleResults?.[0]) {
        console.log(`  Simple top: ${simpleResults[0].similarity?.toFixed(4)}`);
      }
      if (complexResults?.[0]) {
        console.log(`  Complex top: ${complexResults[0].similarity?.toFixed(4)}`);
      }
    }
  }

  // Try direct SQL query to understand what's happening
  console.log('\n=== DIRECT SQL ANALYSIS ===');

  // Get the chunk with tipping fees
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('id, content')
    .ilike('content', '%tipping fee%')
    .limit(1);

  if (chunks && chunks.length > 0) {
    const chunkId = chunks[0].id;

    // Query using raw SQL with the chunk ID
    const { data: distanceData, error } = await supabase.rpc('get_embedding_distance', {
      chunk_id: chunkId,
      query_emb: simpleEmb,
    });

    if (error) {
      console.log('Custom function does not exist, trying manual calculation');

      // Just compare using direct RPC
      const { data: searchAll } = await supabase.rpc('search_similar_chunks', {
        query_embedding: simpleEmb,
        match_threshold: 0.0,  // Get everything
        match_count: 100,
      });

      console.log('Total chunks returned with 0 threshold:', searchAll?.length);

      // Find our specific chunk
      const ourChunk = searchAll?.find((c: any) => c.content?.includes('tipping fee'));
      if (ourChunk) {
        console.log('Found tipping fee chunk!');
        console.log('Similarity:', ourChunk.similarity?.toFixed(4));
      } else {
        console.log('Tipping fee chunk NOT found in search results');
        console.log('First few results:', searchAll?.slice(0, 3).map((c: any) => c.content?.substring(0, 50)));
      }
    } else {
      console.log('Distance data:', distanceData);
    }
  }
}

debugTippingFeesV5().catch(console.error);
