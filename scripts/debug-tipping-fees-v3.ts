import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding } from '../src/lib/embeddings';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTippingFeesV3() {
  console.log('=== TESTING WHY SEMANTIC SEARCH RETURNS 0 ===\n');

  // Test different query formulations
  const queries = [
    'tell me about solid waste tipping fees',
    'tell me about solid waste tipping fees recent',
    'tell me about solid waste tipping fees (related: charge, cost)',
    'tell me about solid waste tipping fees (related: charge, cost) recent',
    'solid waste tipping fees',
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query.substring(0, 60)}..."`);
    const embedding = await generateQueryEmbedding(query);

    // Use search_similar_chunks (pure semantic, no keyword blend)
    const { data: semanticResults, error: semError } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embedding,
      match_threshold: 0.30,
      match_count: 3,
    });

    if (semError) {
      console.log('  Semantic error:', semError.message);
    } else {
      console.log('  Semantic results:', semanticResults?.length || 0);
      if (semanticResults?.[0]) {
        const hasTipping = semanticResults[0].content?.toLowerCase().includes('tipping');
        console.log(`  Top: sim=${semanticResults[0].similarity.toFixed(3)} tipping=${hasTipping}`);
      }
    }

    // Use hybrid_search_chunks
    const { data: hybridResults, error: hybError } = await supabase.rpc('hybrid_search_chunks', {
      query_embedding: embedding,
      query_text: query,
      match_count: 3,
    });

    if (hybError) {
      console.log('  Hybrid error:', hybError.message);
    } else {
      console.log('  Hybrid results:', hybridResults?.length || 0);
      if (hybridResults?.[0]) {
        const hasTipping = hybridResults[0].content?.toLowerCase().includes('tipping');
        console.log(`  Top: sim=${hybridResults[0].similarity.toFixed(3)} tipping=${hasTipping}`);
      }
    }
  }

  // Check what document contains the tipping fees content
  console.log('\n\n=== DOCUMENT WITH TIPPING FEES ===');
  const { data: tippingChunks } = await supabase
    .from('document_chunks')
    .select('id, document_id, chunk_index, content')
    .ilike('content', '%tipping fee%')
    .limit(2);

  if (tippingChunks && tippingChunks.length > 0) {
    const docId = tippingChunks[0].document_id;
    console.log('Document ID:', docId);

    // Get document info
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single();

    console.log('Document title:', doc?.title);
    console.log('Document created_at:', doc?.created_at);
    console.log('Document status:', doc?.status);

    // Check if this document is in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const docDate = new Date(doc?.created_at);
    console.log('Is in last 90 days:', docDate >= ninetyDaysAgo);
  }
}

debugTippingFeesV3().catch(console.error);
