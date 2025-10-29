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

async function debugRetrieval() {
  console.log('🔍 Debugging retrieval system...\n');

  try {
    // 1. Check what's actually in the database
    console.log('📊 Checking database content...');
    
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select(`
        *,
        documents (
          id,
          title,
          source_url,
          status,
          total_chunks,
          total_tokens
        )
      `)
      .order('created_at', { ascending: false });

    if (chunkError) {
      console.error('❌ Error fetching chunks:', chunkError);
      return;
    }

    console.log(`📝 Total chunks in database: ${chunks?.length || 0}`);
    
    if (chunks && chunks.length > 0) {
      console.log('\n📄 Chunk details:');
      chunks.forEach((chunk, i) => {
        console.log(`\nChunk ${i + 1}:`);
        console.log(`  Document: ${chunk.documents?.title || 'Untitled'}`);
        console.log(`  URL: ${chunk.documents?.source_url || 'N/A'}`);
        console.log(`  Status: ${chunk.documents?.status || 'N/A'}`);
        console.log(`  Content length: ${chunk.content?.length || 0}`);
        console.log(`  Has embedding: ${chunk.embedding ? 'Yes' : 'No'}`);
        console.log(`  Content preview: ${chunk.content?.substring(0, 200) || 'Empty'}...`);
      });
    }

    // 2. Test the retrieval function directly
    console.log('\n🔍 Testing retrieval for "town meeting"...');
    
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

    const queryEmbedding = await generateEmbedding('town meeting');
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const { data: searchResults, error: searchError } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embeddingStr,
      match_threshold: 0.1, // Very low threshold to catch everything
      match_count: 10,
    });

    if (searchError) {
      console.error('❌ Search error:', searchError);
      return;
    }

    console.log(`📝 Search results: ${searchResults?.length || 0}`);
    
    if (searchResults && searchResults.length > 0) {
      console.log('\n🎯 Search results:');
      searchResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1}:`);
        console.log(`  Similarity: ${result.similarity}`);
        console.log(`  Content: ${result.content.substring(0, 200)}...`);
        console.log(`  Metadata: ${JSON.stringify(result.metadata)}`);
      });
    } else {
      console.log('❌ No search results found');
    }

    // 3. Test the hasRelevantResults logic
    console.log('\n🔍 Testing hasRelevantResults logic...');
    
    if (searchResults && searchResults.length > 0) {
      const topResult = searchResults[0];
      const hasRelevant = topResult.similarity >= 0.7;
      
      console.log(`Top result similarity: ${topResult.similarity}`);
      console.log(`Threshold: 0.7`);
      console.log(`Has relevant results: ${hasRelevant}`);
      
      if (!hasRelevant) {
        console.log('⚠️ Similarity is below threshold - this is why it says "no relevant information"');
        console.log('💡 We need to either lower the threshold or improve the content quality');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugRetrieval();
