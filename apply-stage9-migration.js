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

async function applyStage9Migration() {
  console.log('🚀 Applying Stage 9 migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase-migration-stage9.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded, applying to database...');
    
    // Apply the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration error:', error);
      return;
    }

    console.log('✅ Stage 9 migration applied successfully!');
    
    // Verify the migration worked
    console.log('\n🔍 Verifying migration...');
    
    // Check if usage_tracking table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['usage_tracking', 'user_profiles']);
    
    if (tableError) {
      console.error('❌ Error checking tables:', tableError);
      return;
    }
    
    console.log('📊 Tables found:', tables?.map(t => t.table_name) || []);
    
    // Check if can_user_query function exists
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'can_user_query');
    
    if (funcError) {
      console.error('❌ Error checking functions:', funcError);
      return;
    }
    
    console.log('🔧 Functions found:', functions?.map(f => f.routine_name) || []);
    
    if (tables?.length >= 2 && functions?.length >= 1) {
      console.log('\n🎉 Migration verification successful!');
      console.log('✅ The chatbot should now work properly.');
    } else {
      console.log('\n⚠️ Migration may not have completed fully.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyStage9Migration();
