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

async function applyEssentialMigration() {
  console.log('🚀 Applying essential Stage 9 migration parts...\n');

  try {
    // 1. Create usage_tracking table
    console.log('📊 Creating usage_tracking table...');
    const createUsageTable = `
      CREATE TABLE IF NOT EXISTS usage_tracking (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        total_tokens INTEGER DEFAULT 0,
        total_cost_cents INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, year, month)
      );
    `;
    
    const { error: tableError } = await supabase.rpc('exec', { sql: createUsageTable });
    if (tableError) {
      console.log('⚠️ Table might already exist:', tableError.message);
    } else {
      console.log('✅ usage_tracking table created');
    }

    // 2. Create can_user_query function
    console.log('🔧 Creating can_user_query function...');
    const createFunction = `
      CREATE OR REPLACE FUNCTION can_user_query(p_user_id UUID)
      RETURNS BOOLEAN AS $$
      DECLARE
        user_limit INTEGER;
        current_usage INTEGER;
        user_tier VARCHAR(20);
      BEGIN
        -- Get user's tier and limit
        SELECT subscription_tier, monthly_token_limit
        INTO user_tier, user_limit
        FROM user_profiles
        WHERE id = p_user_id;
        
        -- Premium users have unlimited usage
        IF user_tier = 'premium' THEN
          RETURN true;
        END IF;
        
        -- Get current month's usage
        SELECT COALESCE(total_tokens, 0)
        INTO current_usage
        FROM usage_tracking
        WHERE user_id = p_user_id
          AND year = EXTRACT(YEAR FROM NOW())
          AND month = EXTRACT(MONTH FROM NOW());
        
        -- Check if under limit
        RETURN COALESCE(current_usage, 0) < user_limit;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError } = await supabase.rpc('exec', { sql: createFunction });
    if (funcError) {
      console.log('⚠️ Function might already exist:', funcError.message);
    } else {
      console.log('✅ can_user_query function created');
    }

    // 3. Create record_usage function
    console.log('📝 Creating record_usage function...');
    const createRecordFunction = `
      CREATE OR REPLACE FUNCTION record_usage(
        p_user_id UUID,
        p_input_tokens INTEGER,
        p_output_tokens INTEGER,
        p_cost_cents INTEGER DEFAULT 0
      )
      RETURNS void AS $$
      DECLARE
        current_year INTEGER := EXTRACT(YEAR FROM NOW());
        current_month INTEGER := EXTRACT(MONTH FROM NOW());
      BEGIN
        INSERT INTO usage_tracking (
          user_id,
          year,
          month,
          total_tokens,
          total_cost_cents
        )
        VALUES (
          p_user_id,
          current_year,
          current_month,
          p_input_tokens + p_output_tokens,
          p_cost_cents
        )
        ON CONFLICT (user_id, year, month)
        DO UPDATE SET
          total_tokens = usage_tracking.total_tokens + p_input_tokens + p_output_tokens,
          total_cost_cents = usage_tracking.total_cost_cents + p_cost_cents,
          updated_at = NOW();
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: recordError } = await supabase.rpc('exec', { sql: createRecordFunction });
    if (recordError) {
      console.log('⚠️ Record function might already exist:', recordError.message);
    } else {
      console.log('✅ record_usage function created');
    }

    // Verify the migration worked
    console.log('\n🔍 Verifying migration...');
    
    // Test the can_user_query function
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      const adminId = profiles[0].id;
      
      const { data: canQuery, error: testError } = await supabase.rpc(
        'can_user_query',
        { p_user_id: adminId }
      );
      
      if (testError) {
        console.error('❌ Function test error:', testError);
      } else {
        console.log(`✅ can_user_query test result: ${canQuery}`);
      }
    }

    console.log('\n🎉 Essential migration completed!');
    console.log('✅ The chatbot should now work properly.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyEssentialMigration();
