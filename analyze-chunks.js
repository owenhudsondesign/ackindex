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

async function analyzeChunks() {
  console.log('🔍 Analyzing document chunks...\n');

  try {
    // Get all chunks with their document info
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

    console.log(`📝 Total chunks: ${chunks?.length || 0}\n`);

    if (chunks && chunks.length > 0) {
      chunks.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}:`);
        console.log(`  Document: ${chunk.documents?.title || 'Untitled'}`);
        console.log(`  URL: ${chunk.documents?.source_url || 'N/A'}`);
        console.log(`  Status: ${chunk.documents?.status || 'N/A'}`);
        console.log(`  Content length: ${chunk.content?.length || 0}`);
        console.log(`  Content preview: ${chunk.content?.substring(0, 200) || 'Empty'}...`);
        console.log(`  Metadata: ${JSON.stringify(chunk.metadata || {})}`);
        console.log('');
      });
    } else {
      console.log('❌ No chunks found');
    }

    // Also check documents that failed
    console.log('\n🔍 Checking failed documents...\n');
    const { data: failedDocs, error: failedError } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false });

    if (failedError) {
      console.error('❌ Error fetching failed documents:', failedError);
      return;
    }

    console.log(`❌ Failed documents: ${failedDocs?.length || 0}`);
    if (failedDocs && failedDocs.length > 0) {
      failedDocs.slice(0, 5).forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title || 'Untitled'} - ${doc.error_message || 'Unknown error'}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

analyzeChunks();
