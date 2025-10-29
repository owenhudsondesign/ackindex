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

async function checkDatabase() {
  console.log('🔍 Checking database content...\n');

  try {
    // Check documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (docError) {
      console.error('❌ Error fetching documents:', docError);
      return;
    }

    console.log(`📄 Documents: ${documents?.length || 0}`);
    if (documents && documents.length > 0) {
      documents.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title || 'Untitled'} (${doc.status}) - ${doc.total_chunks} chunks`);
      });
    }

    // Check chunks
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('*');

    if (chunkError) {
      console.error('❌ Error fetching chunks:', chunkError);
      return;
    }

    console.log(`\n📝 Document chunks: ${chunks?.length || 0}`);
    if (chunks && chunks.length > 0) {
      console.log('Sample chunks:');
      chunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`  ${i + 1}. ${chunk.content.substring(0, 100)}...`);
      });
    }

    // Check scrape jobs
    const { data: jobs, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (jobError) {
      console.error('❌ Error fetching scrape jobs:', jobError);
      return;
    }

    console.log(`\n🕷️ Scrape jobs: ${jobs?.length || 0}`);
    if (jobs && jobs.length > 0) {
      jobs.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.url} (${job.apify_status}) - ${job.pages_crawled} pages`);
      });
    }

    // Check user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*');

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError);
      return;
    }

    console.log(`\n👥 User profiles: ${profiles?.length || 0}`);
    if (profiles && profiles.length > 0) {
      profiles.forEach((profile, i) => {
        console.log(`  ${i + 1}. ${profile.full_name} (${profile.role}) - ${profile.subscription_tier}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDatabase();
