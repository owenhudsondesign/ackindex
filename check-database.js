const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'MISSING');
  console.error('\nPlease set these environment variables and run again.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('=== Checking Documents ===');
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('id, title, url, status, created_at')
    .order('created_at', { ascending: false });
  
  if (docError) {
    console.error('Error fetching documents:', docError);
    return;
  }
  
  console.log('Documents found:', documents?.length || 0);
  documents?.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title} (${doc.status}) - ${doc.url}`);
  });
  
  console.log('\n=== Checking Document Chunks ===');
  const { data: chunks, error: chunkError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, embedding, created_at')
    .limit(10);
  
  if (chunkError) {
    console.error('Error fetching chunks:', chunkError);
    return;
  }
  
  console.log('Sample chunks found:', chunks?.length || 0);
  chunks?.forEach((chunk, i) => {
    const hasEmbedding = chunk.embedding && chunk.embedding.length > 0;
    console.log(`${i + 1}. Chunk ${chunk.id} (Doc: ${chunk.document_id}) - Embedding: ${hasEmbedding ? 'YES' : 'NO'} - Content: ${chunk.content?.substring(0, 100)}...`);
  });
  
  console.log('\n=== Checking Embedding Stats ===');
  const { data: stats, error: statsError } = await supabase
    .from('document_chunks')
    .select('embedding')
    .not('embedding', 'is', null);
  
  if (statsError) {
    console.error('Error fetching embedding stats:', statsError);
    return;
  }
  
  console.log(`Chunks with embeddings: ${stats?.length || 0}`);
  
  console.log('\n=== Testing Search Function ===');
  // Test the search function directly
  const { data: searchResults, error: searchError } = await supabase
    .rpc('search_similar_chunks', {
      query_embedding: new Array(1536).fill(0.1), // Dummy embedding for testing
      similarity_threshold: 0.5,
      match_count: 5
    });
  
  if (searchError) {
    console.error('Error testing search function:', searchError);
  } else {
    console.log('Search function test results:', searchResults?.length || 0, 'results');
  }
}

checkDatabase().catch(console.error);
