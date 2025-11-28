import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { detectBroadQuery } from '../src/lib/queryExpansion';

async function testFix() {
  console.log('=== TESTING FIX FOR BROAD QUERY DETECTION ===\n');

  const testQueries = [
    'tell me about solid waste tipping fees',  // Should NOT be broad (4 words)
    'tell me about housing',                   // Should be broad (1 word, matches BROAD_TERM_REFINEMENTS)
    'tell me about the budget',                // Should be broad (1 word, matches BROAD_TERM_REFINEMENTS)
    'tell me about zoning changes',            // Should be broad (matches "zoning" in BROAD_TERM_REFINEMENTS)
    'tell me about the airport expansion plan', // Should NOT be broad (4 words)
    'what about tipping fees',                 // Should NOT be broad (2 words, but "tipping fees" is specific)
    'information about solid waste',           // Should be broad (matches "solid waste" conceptually? No - 2 words, no match)
  ];

  console.log('Testing detectBroadQuery:');
  console.log('-'.repeat(70));

  for (const query of testQueries) {
    const result = detectBroadQuery(query);
    console.log(`Query: "${query}"`);
    console.log(`  isBroad: ${result.isBroad}, broadTerm: ${result.broadTerm || 'none'}`);
    console.log('');
  }

  // Now test the actual retrieval
  console.log('\n=== TESTING FULL RETRIEVAL ===\n');

  // Dynamic import after dotenv
  const { retrieveRelevantChunks } = require('../src/lib/retrieval');

  const query = 'tell me about solid waste tipping fees';
  console.log(`Query: "${query}"`);

  const results = await retrieveRelevantChunks(query, {
    maxResults: 5,
    minSimilarity: 0.30,
    includeDocumentInfo: true,
    searchMode: 'hybrid',
  });

  console.log(`Results count: ${results.length}`);
  for (const r of results.slice(0, 5)) {
    const hasTipping = r.content?.toLowerCase().includes('tipping');
    console.log(`  Sim: ${r.similarity.toFixed(3)} | Tipping: ${hasTipping} | Title: ${r.document?.title?.substring(0, 40)}`);
  }
}

testFix().catch(console.error);
