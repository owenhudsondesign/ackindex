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

async function testApifyResults() {
  console.log('🔍 Testing Apify results...\n');

  try {
    // Get the most recent scrape job that succeeded
    const { data: jobs, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('apify_status', 'SUCCEEDED')
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobError) {
      console.error('❌ Error fetching scrape jobs:', jobError);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('❌ No successful scrape jobs found');
      return;
    }

    const job = jobs[0];
    console.log(`📋 Testing job: ${job.url}`);
    console.log(`🆔 Apify Run ID: ${job.apify_run_id}`);
    console.log(`📊 Pages crawled: ${job.pages_crawled}`);
    console.log(`📄 PDFs found: ${job.pdfs_found}`);

    // Now let's test the Apify API directly to see what data we got
    const Apify = require('apify');
    
    const apifyClient = Apify.newClient({
      token: envVars.APIFY_TOKEN,
    });

    console.log('\n🔍 Fetching Apify dataset...');
    const { items } = await apifyClient.dataset(job.apify_run_id).listItems();
    
    console.log(`📦 Dataset has ${items.length} items`);
    
    if (items.length > 0) {
      console.log('\n📝 Sample items:');
      items.slice(0, 3).forEach((item, i) => {
        console.log(`\nItem ${i + 1}:`);
        console.log(`  Type: ${item.type || 'unknown'}`);
        console.log(`  URL: ${item.url || 'N/A'}`);
        console.log(`  Title: ${item.title || 'N/A'}`);
        console.log(`  Text length: ${item.text ? item.text.length : 0}`);
        console.log(`  Full text: ${item.full_text ? item.full_text.length : 0}`);
        console.log(`  PDF count: ${item.pdf_count || 0}`);
        console.log(`  Tables: ${item.tables ? item.tables.length : 0}`);
        
        if (item.text && item.text.length > 0) {
          console.log(`  Text preview: ${item.text.substring(0, 200)}...`);
        }
        if (item.full_text && item.full_text.length > 0) {
          console.log(`  Full text preview: ${item.full_text.substring(0, 200)}...`);
        }
      });
    } else {
      console.log('❌ No items found in dataset');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testApifyResults();
