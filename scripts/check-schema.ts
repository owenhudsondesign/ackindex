import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check document_chunks table structure
    console.log('Checking document_chunks schema...\n');

    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
    } else if (data && data.length > 0) {
      console.log('Sample row structure:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No rows in document_chunks table');
    }

    // Check if there are actually any chunks
    const { count, error: countError } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
    } else {
      console.log(`\nTotal chunks in database: ${count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
