import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function cleanupFailedPDFs() {
  console.log('Cleaning up failed PDF documents...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const failedDocIds = [
    '3cf6a4ee-2b85-4dbd-821d-fee142146314', // 2022 Nantucket Town Report
    '40a930ae-8b6e-4e09-a61a-3261793bd263', // 2023 Nantucket Town Report
  ];

  try {
    for (const documentId of failedDocIds) {
      // Get document details first
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.log(`❌ Document ${documentId} not found (may already be deleted)`);
        continue;
      }

      console.log(`\n📄 Found: ${doc.title || doc.url}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${doc.created_at}`);

      // Delete associated chunks first
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

      if (chunksError) {
        console.log(`   ⚠️  Warning: Could not delete chunks: ${chunksError.message}`);
      } else {
        console.log(`   ✓ Deleted associated chunks`);
      }

      // Delete the document
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (docError) {
        console.log(`   ❌ Failed to delete document: ${docError.message}`);
      } else {
        console.log(`   ✓ Deleted document`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log('\nNext steps:');
    console.log('1. Re-upload the 2022 and 2023 Nantucket Town Reports via the admin panel');
    console.log('2. They will now process with the 10-minute timeout');
    console.log('3. Monitor progress in Bull Board or Railway logs');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupFailedPDFs().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
