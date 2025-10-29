require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkChunks() {
  console.log('Checking chunks with embeddings...');
  
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, content, document_id, embedding')
    .not('embedding', 'is', null);

  if (error) {
    console.error('Error fetching chunks:', error);
    return;
  }

  console.log(`Found ${chunks.length} chunks with embeddings`);
  
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i + 1}:`);
    console.log(`  ID: ${chunk.id}`);
    console.log(`  Document ID: ${chunk.document_id}`);
    console.log(`  Content length: ${chunk.content?.length || 0}`);
    console.log(`  Embedding length: ${chunk.embedding?.length || 0}`);
    console.log(`  Content preview: ${chunk.content?.substring(0, 300)}...`);
  });

  // Also check documents
  console.log('\n\nChecking documents...');
  const { data: docs, error: docError } = await supabase
    .from('documents')
    .select('*');

  if (docError) {
    console.error('Error fetching documents:', docError);
    return;
  }

  console.log(`Found ${docs.length} documents`);
  docs.forEach((doc, i) => {
    console.log(`\nDocument ${i + 1}:`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  Title: ${doc.title}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Keys: ${Object.keys(doc).join(', ')}`);
  });

  // Test the RPC function directly
  console.log('\n\nTesting RPC function...');
  
  // Generate a simple embedding for "town meeting"
  const testEmbedding = new Array(1536).fill(0.1); // Simple test embedding
  const embeddingStr = `[${testEmbedding.join(',')}]`;
  
  const { data: rpcResults, error: rpcError } = await supabase.rpc('search_similar_chunks', {
    query_embedding: embeddingStr,
    match_threshold: 0.1, // Very low threshold for testing
    match_count: 10,
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log(`RPC returned ${rpcResults?.length || 0} results`);
    if (rpcResults && rpcResults.length > 0) {
      rpcResults.forEach((result, i) => {
        console.log(`  Result ${i + 1}: similarity=${result.similarity}, content=${result.content?.substring(0, 100)}...`);
      });
    }
  }
}

checkChunks().catch(console.error);
