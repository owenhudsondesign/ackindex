import * as dotenv from 'dotenv';
// Load env BEFORE other imports
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { retrieveRelevantChunks } from '../src/lib/retrieval';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function testSynonymSearch() {
  const query = 'return relevant information regarding transcription and/or language accessibility in the last two months of meetings';

  console.log('=== Testing Synonym-Boosted Search ===');
  console.log('Query:', query);
  console.log('');

  const results = await retrieveRelevantChunks(query, {
    maxResults: 10,
    minSimilarity: 0.30,
    includeDocumentInfo: true,
    searchMode: 'hybrid',
  });

  console.log('Results:', results.length);
  console.log('');

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const { data: doc } = await supabase
      .from('documents')
      .select('title')
      .eq('id', r.document_id)
      .single();

    const hasSpanish = r.content?.toLowerCase().includes('spanish');
    const hasPortuguese = r.content?.toLowerCase().includes('portuguese');
    const hasLanguage = r.content?.toLowerCase().includes('language');

    console.log('---');
    console.log(`${i + 1}. Similarity: ${r.similarity.toFixed(3)}`);
    console.log(`   Document: ${doc?.title || 'Unknown'}`);
    console.log(`   Has keywords: Spanish=${hasSpanish}, Portuguese=${hasPortuguese}, Language=${hasLanguage}`);
    console.log(`   Content: ${r.content?.substring(0, 120)}...`);
  }
}

testSynonymSearch();
