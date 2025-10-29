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

async function testUserProfile() {
  console.log('🔍 Testing user profile and permissions...\n');

  try {
    // Find the admin user profile
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'admin');

    if (profileError) {
      console.error('❌ Error fetching admin profiles:', profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No admin profiles found');
      return;
    }

    const adminProfile = profiles[0];
    console.log(`👤 Admin profile: ${adminProfile.full_name}`);
    console.log(`📧 Email: ${adminProfile.email || 'N/A'}`);
    console.log(`🎭 Role: ${adminProfile.role}`);
    console.log(`💳 Subscription: ${adminProfile.subscription_tier}`);
    console.log(`🎫 Token limit: ${adminProfile.monthly_token_limit}`);
    console.log(`📊 Tokens used: ${adminProfile.tokens_used_this_month || 0}`);

    // Test the can_user_query function
    console.log('\n🔍 Testing can_user_query function...');
    
    const { data: canQuery, error: queryError } = await supabase.rpc(
      'can_user_query',
      { p_user_id: adminProfile.id }
    );

    if (queryError) {
      console.error('❌ can_user_query error:', queryError);
      return;
    }

    console.log(`✅ Can query: ${canQuery}`);

    // Test the retrieval function directly
    console.log('\n🔍 Testing retrieval function...');
    
    // Import the retrieval function (simplified version)
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

    async function testRetrieval(query) {
      console.log(`🔍 Testing retrieval for: "${query}"`);
      
      const queryEmbedding = await generateEmbedding(query);
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      const { data: results, error } = await supabase.rpc('search_similar_chunks', {
        query_embedding: embeddingStr,
        match_threshold: 0.1,
        match_count: 5,
      });

      if (error) {
        console.error('❌ Retrieval error:', error);
        return [];
      }

      console.log(`📝 Found ${results?.length || 0} results`);
      return results || [];
    }

    const results = await testRetrieval('town meeting');
    
    if (results.length > 0) {
      console.log('\n✅ Retrieval is working! The chatbot should be able to answer questions.');
      console.log('🔍 The issue might be in the frontend or authentication.');
    } else {
      console.log('\n❌ Retrieval is not working properly.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUserProfile();
