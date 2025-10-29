require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testRPCFunction() {
  console.log('Testing RPC function with real embedding...');
  
  // Generate a real embedding for "town meeting"
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: 'town meeting',
  });
  
  const embedding = response.data[0].embedding;
  const embeddingStr = `[${embedding.join(',')}]`;
  
  console.log(`Generated embedding with ${embedding.length} dimensions`);
  
  // Test with different thresholds
  const thresholds = [0.1, 0.3, 0.5, 0.7, 0.9];
  
  for (const threshold of thresholds) {
    console.log(`\nTesting threshold ${threshold}:`);
    
    const { data: results, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embeddingStr,
      match_threshold: threshold,
      match_count: 10,
    });

    if (error) {
      console.error(`  Error:`, error);
    } else {
      console.log(`  Results: ${results?.length || 0}`);
      if (results && results.length > 0) {
        results.forEach((result, i) => {
          console.log(`    ${i + 1}. similarity=${result.similarity}, content=${result.content?.substring(0, 50)}...`);
        });
      }
    }
  }
  
  // Also check if the function exists
  console.log('\nChecking if RPC function exists...');
  const { data: functions, error: funcError } = await supabase
    .from('pg_proc')
    .select('proname')
    .eq('proname', 'search_similar_chunks');
    
  if (funcError) {
    console.log('Cannot check pg_proc (expected):', funcError.message);
  } else {
    console.log('Function exists:', functions?.length > 0);
  }
}

testRPCFunction().catch(console.error);
