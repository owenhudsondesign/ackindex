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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testChatAPI() {
  console.log('🔍 Testing chat API directly...\n');

  try {
    // First, let's get a valid session token
    console.log('🔐 Getting session token...');
    
    // We need to simulate a login to get a valid token
    // For now, let's test with a direct API call
    
    const testMessage = 'tell me about town meeting';
    
    console.log(`📝 Testing with message: "${testMessage}"`);
    
    // Make a direct request to the chat API
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: We need a valid auth token here
        'Authorization': 'Bearer YOUR_SESSION_TOKEN_HERE'
      },
      body: JSON.stringify({
        message: testMessage,
        conversationHistory: []
      })
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Chat API response:', data);
    } else {
      const errorData = await response.json();
      console.log('❌ Chat API error:', errorData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testChatAPI();
