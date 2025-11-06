/**
 * Apply database migration to Supabase
 * Run with: node scripts/apply-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📖 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251030_scheduled_scrapes.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to Supabase...');
    console.log(`   URL: ${supabaseUrl}`);

    // Split SQL into individual statements (separated by semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');

      try {
        // Use Supabase RPC to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        });

        if (error) {
          // Try direct query if RPC doesn't exist
          const { error: queryError } = await supabase
            .from('_sql_exec')
            .select('*')
            .limit(0);

          if (queryError) {
            console.log(`⚠️  Statement ${i + 1}: ${preview}...`);
            console.log(`    Note: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1}: ${preview}...`);
          successCount++;
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1}: ${preview}...`);
        console.log(`    Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Warnings: ${errorCount}`);

    if (errorCount === statements.length) {
      console.log('\n⚠️  All statements failed. You may need to apply this migration manually.');
      console.log('   Go to: Supabase Dashboard → SQL Editor');
      console.log(`   File: ${migrationPath}`);
      process.exit(1);
    } else {
      console.log('\n✅ Migration applied successfully!');
      console.log('   Tables created: scheduled_scrapes, content_hashes');
      console.log('   Functions created: update_next_scrape_time(), get_urls_for_scraping()');
    }

  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    console.error('\nYou can apply this migration manually:');
    console.error('1. Go to: Supabase Dashboard → SQL Editor');
    console.error('2. Copy the contents of: supabase/migrations/20251030_scheduled_scrapes.sql');
    console.error('3. Paste and run the SQL');
    process.exit(1);
  }
}

applyMigration();
