const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Parse env variables
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRetrieval() {
  console.log('🔍 Testing retrieval system...\n');

  try {
    // Check if chunks have embeddings
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('id, content, embedding')
      .not('embedding', 'is', null);

    if (chunkError) {
      console.error('❌ Error fetching chunks with embeddings:', chunkError);
      return;
    }

    console.log(`📊 Chunks with embeddings: ${chunks?.length || 0}`);

    if (!chunks || chunks.length === 0) {
      console.log('❌ No chunks have embeddings! This is why the chatbot can\'t find content.');
      console.log('💡 You need to generate embeddings for the chunks.');
      return;
    }

    // Test the search function
    console.log('\n🔍 Testing search for "town meeting"...');
    
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_similar_chunks',
      {
        query_text: 'town meeting',
        match_threshold: 0.1,
        match_count: 5
      }
    );

    if (searchError) {
      console.error('❌ Search error:', searchError);
      return;
    }

    console.log(`📝 Search results: ${searchResults?.length || 0}`);
    
    if (searchResults && searchResults.length > 0) {
      searchResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1}:`);
        console.log(`  Similarity: ${result.similarity}`);
        console.log(`  Content: ${result.content.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ No search results found');
    }

    // Test hybrid search
    console.log('\n🔍 Testing hybrid search...');
    
    const { data: hybridResults, error: hybridError } = await supabase.rpc(
      'hybrid_search_chunks',
      {
        query_text: 'town meeting',
        match_count: 5
      }
    );

    if (hybridError) {
      console.error('❌ Hybrid search error:', hybridError);
      return;
    }

    console.log(`📝 Hybrid search results: ${hybridResults?.length || 0}`);
    
    if (hybridResults && hybridResults.length > 0) {
      hybridResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1}:`);
        console.log(`  Rank: ${result.rank}`);
        console.log(`  Content: ${result.content.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ No hybrid search results found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRetrieval();
