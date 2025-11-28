import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding } from '../src/lib/embeddings';
import { expandQuery } from '../src/lib/queryExpansion';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTippingFees() {
  const query = 'tell me about solid waste tipping fees';

  console.log('=== DEBUGGING: solid waste tipping fees ===\n');

  // Step 1: Check query expansion
  const expansion = expandQuery(query);
  console.log('Original query:', query);
  console.log('Expanded query:', expansion.expandedQuery);
  console.log('Expansions:', expansion.expansions);
  console.log('');

  // Step 2: Check if content exists in database with keyword search
  console.log('=== KEYWORD SEARCH (raw SQL) ===');
  const { data: keywordResults, error: keywordError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, chunk_index')
    .textSearch('content', 'tipping fees', {
      type: 'websearch',
      config: 'english',
    })
    .limit(5);

  if (keywordError) {
    console.error('Keyword search error:', keywordError);
  } else {
    console.log('Keyword results count:', keywordResults?.length || 0);
    for (const r of (keywordResults || []).slice(0, 3)) {
      console.log('- Content preview:', r.content?.substring(0, 100));
    }
  }

  // Step 3: Direct content search with ILIKE (case-insensitive)
  console.log('\n=== DIRECT CONTENT SEARCH (ILIKE) ===');
  const { data: ilikeResults, error: ilikeError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, chunk_index, metadata')
    .ilike('content', '%tipping fee%')
    .limit(10);

  if (ilikeError) {
    console.error('ILIKE search error:', ilikeError);
  } else {
    console.log('ILIKE results count:', ilikeResults?.length || 0);
    for (const r of (ilikeResults || []).slice(0, 3)) {
      console.log('- DocID:', r.document_id);
      console.log('  Content preview:', r.content?.substring(0, 150));
      console.log('');
    }
  }

  // Step 4: Check "solid waste" specifically
  console.log('\n=== SOLID WASTE SEARCH ===');
  const { data: solidWasteResults, error: solidWasteError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, chunk_index')
    .ilike('content', '%solid waste%')
    .limit(10);

  if (solidWasteError) {
    console.error('Solid waste search error:', solidWasteError);
  } else {
    console.log('Solid waste results count:', solidWasteResults?.length || 0);
    for (const r of (solidWasteResults || []).slice(0, 3)) {
      console.log('- Content preview:', r.content?.substring(0, 100));
    }
  }

  // Step 5: Test hybrid search
  console.log('\n=== HYBRID SEARCH ===');
  const embedding = await generateQueryEmbedding(expansion.expandedQuery);
  console.log('Embedding dimensions:', embedding.length);

  const { data: hybridResults, error: hybridError } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: embedding,
    query_text: query,
    match_count: 10,
  });

  if (hybridError) {
    console.error('Hybrid search error:', hybridError);
  } else {
    console.log('Hybrid results count:', hybridResults?.length || 0);
    console.log('');
    for (const r of (hybridResults || []).slice(0, 5)) {
      const hasTipping = r.content?.toLowerCase().includes('tipping');
      const hasSolidWaste = r.content?.toLowerCase().includes('solid waste');
      console.log(`Sim: ${r.similarity.toFixed(3)} | Tipping: ${hasTipping} | SolidWaste: ${hasSolidWaste}`);
      console.log(`  Content: ${r.content?.substring(0, 100)}`);
      console.log('');
    }
  }

  // Step 6: Test with simpler query variants
  const queryVariants = [
    'solid waste tipping fees',
    'tipping fees',
    'solid waste fees',
    'waste disposal fees',
  ];

  console.log('\n=== QUERY VARIANT TESTS ===');
  for (const variant of queryVariants) {
    const variantEmbedding = await generateQueryEmbedding(variant);
    const { data: variantResults } = await supabase.rpc('hybrid_search_chunks', {
      query_embedding: variantEmbedding,
      query_text: variant,
      match_count: 3,
    });

    const topSim = variantResults?.[0]?.similarity?.toFixed(3) || 'N/A';
    const hasTipping = variantResults?.[0]?.content?.toLowerCase().includes('tipping') || false;
    console.log(`"${variant}" -> Top sim: ${topSim}, has 'tipping': ${hasTipping}`);
  }
}

debugTippingFees().catch(console.error);
