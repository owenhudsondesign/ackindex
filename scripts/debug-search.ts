import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding } from '../src/lib/embeddings';
import { expandQuery } from '../src/lib/queryExpansion';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testBothSearches() {
  const query = 'return relevant information regarding transcription and/or language accessibility in the last two months of meetings';

  // Get expansion
  const expansion = expandQuery(query);
  console.log('Original query:', query.substring(0, 60) + '...');
  console.log('Expansions:', expansion.expansions);
  console.log('');

  // Test main query
  const mainEmbedding = await generateQueryEmbedding(expansion.expandedQuery);
  const { data: mainResults, error: mainError } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: mainEmbedding,
    query_text: expansion.expandedQuery,
    match_count: 10,
  });

  if (mainError) {
    console.error('Main query error:', mainError);
  }

  console.log('=== MAIN QUERY RESULTS ===');
  for (const r of (mainResults || []).slice(0, 3)) {
    const hasSpanish = r.content?.toLowerCase().includes('spanish');
    console.log('Sim:', r.similarity.toFixed(3), '| Spanish:', hasSpanish, '| Content:', r.content?.substring(0, 80));
  }

  // Test synonym query
  const synonymQuery = 'Spanish Portuguese language translation';  // The query that worked before
  console.log('');
  console.log('Synonym query:', synonymQuery);
  const synEmbedding = await generateQueryEmbedding(synonymQuery);
  const { data: synResults, error: synError } = await supabase.rpc('hybrid_search_chunks', {
    query_embedding: synEmbedding,
    query_text: synonymQuery,
    match_count: 5,
  });

  if (synError) {
    console.error('Synonym query error:', synError);
  }

  console.log('');
  console.log('=== SYNONYM QUERY RESULTS ===');
  for (const r of (synResults || []).slice(0, 5)) {
    const hasSpanish = r.content?.toLowerCase().includes('spanish');
    const hasPortuguese = r.content?.toLowerCase().includes('portuguese');
    console.log('Sim:', r.similarity.toFixed(3), '| Spanish:', hasSpanish, '| Portuguese:', hasPortuguese, '| Content:', r.content?.substring(0, 60));
  }
}

testBothSearches();
