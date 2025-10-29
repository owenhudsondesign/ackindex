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

async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${envVars.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function testRetrievalWithEmbedding() {
  console.log('🔍 Testing retrieval with proper embedding...\n');

  try {
    // Generate embedding for "town meeting"
    console.log('🧠 Generating embedding for "town meeting"...');
    const queryEmbedding = await generateEmbedding('town meeting');
    console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);

    // Test the search function with proper parameters
    console.log('\n🔍 Testing search_similar_chunks...');
    
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_similar_chunks',
      {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.1, // Lower threshold to catch more results
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
        console.log(`  Metadata: ${JSON.stringify(result.metadata)}`);
      });
    } else {
      console.log('❌ No search results found');
    }

    // Test keyword search as fallback
    console.log('\n🔍 Testing keyword search...');
    
    const { data: keywordResults, error: keywordError } = await supabase
      .from('document_chunks')
      .select('*')
      .textSearch('content', 'town meeting', {
        type: 'websearch',
        config: 'english',
      })
      .limit(5);

    if (keywordError) {
      console.error('❌ Keyword search error:', keywordError);
      return;
    }

    console.log(`📝 Keyword search results: ${keywordResults?.length || 0}`);
    
    if (keywordResults && keywordResults.length > 0) {
      keywordResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1}:`);
        console.log(`  Content: ${result.content.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ No keyword search results found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRetrievalWithEmbedding();
