import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateQueryEmbedding, generateEmbedding } from '../src/lib/embeddings';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function debugTippingFeesV4() {
  console.log('=== COMPARING EMBEDDINGS ===\n');

  // Get the actual content from the database
  const { data: tippingChunks } = await supabase
    .from('document_chunks')
    .select('id, content, embedding')
    .ilike('content', '%tipping fee%')
    .limit(1);

  if (!tippingChunks || tippingChunks.length === 0) {
    console.log('No tipping fee content found');
    return;
  }

  const targetContent = tippingChunks[0].content;
  const targetEmbedding = tippingChunks[0].embedding;
  console.log('Target content:', targetContent.substring(0, 100), '...\n');

  // Generate embeddings for different query variants
  const queries = [
    'solid waste tipping fees',
    'tell me about solid waste tipping fees',
    'what are solid waste tipping fees',
    'information about solid waste tipping fees',
    'tipping fees for solid waste',
    'solid waste',
    'tipping fees',
  ];

  console.log('Query similarities (cosine with target chunk embedding):');
  console.log('='.repeat(70));

  for (const query of queries) {
    // Use query embedding (optimized for retrieval)
    const queryEmb = await generateQueryEmbedding(query);

    // Use document embedding for comparison
    const docEmb = await generateEmbedding(query);

    const simQuery = cosineSimilarity(queryEmb, targetEmbedding);
    const simDoc = cosineSimilarity(docEmb, targetEmbedding);

    console.log(`Query: "${query}"`);
    console.log(`  Query emb sim: ${simQuery.toFixed(4)}`);
    console.log(`  Doc emb sim:   ${simDoc.toFixed(4)}`);
    console.log('');
  }

  // Also test what the actual content would embed to
  console.log('\n=== TARGET CONTENT SELF-SIMILARITY ===');
  const contentEmb = await generateEmbedding(targetContent.substring(0, 500));
  const selfSim = cosineSimilarity(contentEmb, targetEmbedding);
  console.log('Self-similarity (should be ~1.0):', selfSim.toFixed(4));
}

debugTippingFeesV4().catch(console.error);
