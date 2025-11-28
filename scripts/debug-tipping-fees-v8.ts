import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { generateQueryEmbedding } from '../src/lib/embeddings';
import { expandQuery } from '../src/lib/queryExpansion';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testExpansionImpact() {
  console.log('=== TESTING QUERY EXPANSION IMPACT ON HYBRID SEARCH ===\n');

  const queries = [
    // Raw query variants
    'solid waste tipping fees',
    'tell me about solid waste tipping fees',
    // Expanded variants
    'solid waste tipping fees (related: charge, cost)',
    'tell me about solid waste tipping fees (related: charge, cost)',
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    const embedding = await generateQueryEmbedding(query);
    const { data: results, error } = await supabase.rpc('hybrid_search_chunks', {
      query_embedding: embedding,
      query_text: query,
      match_count: 3,
    });

    if (error) {
      console.log('  Error:', error.message);
      continue;
    }

    console.log(`  Results: ${results?.length || 0}`);
    if (results?.[0]) {
      const hasTipping = results[0].content?.toLowerCase().includes('tipping');
      console.log(`  Top: sim=${results[0].similarity.toFixed(3)}, tipping=${hasTipping}`);
      console.log(`  Preview: ${results[0].content?.substring(0, 60)}...`);
    }
  }

  // Now check what query gets sent to hybrid search in the actual retrieval flow
  console.log('\n\n=== CHECKING ACTUAL EXPANSION ===\n');

  const testQuery = 'tell me about solid waste tipping fees';
  const expansion = expandQuery(testQuery);

  console.log('Original:', testQuery);
  console.log('Expanded:', expansion.expandedQuery);
  console.log('Expansions:', expansion.expansions);
  console.log('Synonyms added:', expansion.synonymsAdded);
}

testExpansionImpact().catch(console.error);
