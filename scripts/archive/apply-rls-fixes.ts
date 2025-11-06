/**
 * Apply RLS security fixes to the database
 *
 * This script applies three critical migrations that fix Row Level Security policies
 * to prevent users from accessing other users' data.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function applyMigration(migrationFile: string) {
  console.log(`\n📄 Applying migration: ${migrationFile}`);

  const migrationPath = path.resolve(process.cwd(), 'supabase', 'migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).select();

  if (error) {
    // Try direct execution if RPC doesn't work
    const lines = sql.split(';').filter(line => line.trim());

    for (const line of lines) {
      if (line.trim()) {
        const { error: execError } = await supabase.rpc('exec', { query: line });
        if (execError) {
          console.error(`   ❌ Error executing: ${line.substring(0, 50)}...`);
          console.error(`   Error:`, execError);
          return false;
        }
      }
    }
  }

  console.log(`   ✅ Migration applied successfully`);
  return true;
}

async function main() {
  console.log('🔒 Applying RLS Security Fixes\n');
  console.log('This will fix the following critical vulnerabilities:');
  console.log('1. Documents table - users can only access their own documents');
  console.log('2. Document chunks - users can only access chunks from their documents');
  console.log('3. Scrape jobs - users can only access jobs for their documents\n');

  const migrations = [
    '20251031_fix_documents_rls.sql',
    '20251031_fix_document_chunks_rls.sql',
    '20251031_fix_scrape_jobs_rls.sql',
  ];

  console.log('⚠️  WARNING: This will drop and recreate RLS policies.');
  console.log('This is safe but may briefly affect running operations.\n');

  console.log('NOTE: If you see errors, you may need to apply these migrations');
  console.log('manually via the Supabase SQL Editor.\n');

  let success = true;
  for (const migration of migrations) {
    const result = await applyMigration(migration);
    if (!result) {
      success = false;
      console.log(`\n❌ Migration ${migration} failed`);
      console.log('Please apply this migration manually via Supabase SQL Editor:');
      console.log(`   https://supabase.com/dashboard/project/_/sql\n`);
    }
  }

  if (success) {
    console.log('\n✅ All RLS security fixes applied successfully!');
    console.log('\n🎯 Next steps:');
    console.log('1. Test that users can only see their own documents');
    console.log('2. Continue with remaining security fixes (admin routes, etc.)');
  } else {
    console.log('\n⚠️  Some migrations failed - apply them manually via Supabase SQL Editor');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    console.log('\nPlease apply migrations manually via Supabase SQL Editor');
    process.exit(1);
  });
