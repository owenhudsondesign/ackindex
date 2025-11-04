import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

async function triggerEmbeddings() {
  console.log('Triggering embedding generation for all chunks...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  try {
    // Create Supabase client to get session token
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user to authenticate (use your admin email)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users || users.length === 0) {
      console.error('Could not get users:', usersError);
      process.exit(1);
    }

    console.log('Triggering embeddings via API...\n');

    // Call the generate-embeddings endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        batchSize: 100, // Process 100 chunks at a time
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to trigger embeddings:', error);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ Successfully triggered embedding generation!');
    console.log(`\nQueued: ${result.chunkCount} chunks`);
    console.log(`Job ID: ${result.jobId}`);
    console.log(`\nStats:`);
    console.log(`  Total chunks: ${result.stats.totalChunks}`);
    console.log(`  With embeddings: ${result.stats.withEmbeddings}`);
    console.log(`  Without embeddings: ${result.stats.withoutEmbeddings}`);
    console.log(`\nEstimated cost: $${result.cost.estimatedCost.toFixed(4)}`);
    console.log(`Estimated tokens: ${result.cost.estimatedTokens}`);

    console.log('\n💡 Note: This queued one batch. Run this script multiple times');
    console.log('   until all chunks have embeddings, or wait for the worker to process them.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

triggerEmbeddings();
