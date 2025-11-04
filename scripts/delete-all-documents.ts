import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function deleteAllDocuments() {
  console.log('⚠️  WARNING: This will delete ALL documents and chunks!\n');
  console.log('This is necessary to re-index with the fixed PDF parser.\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, title')
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      process.exit(1);
    }

    if (!docs || docs.length === 0) {
      console.log('No documents found.');
      process.exit(0);
    }

    console.log(`Found ${docs.length} document(s) to delete:\n`);

    for (const doc of docs) {
      console.log(`  - ${doc.title || doc.id}`);
    }

    console.log('\nDeleting...\n');

    let deletedChunks = 0;
    let deletedDocs = 0;

    for (const doc of docs) {
      // Delete chunks
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', doc.id);

      if (chunksError) {
        console.log(`  ⚠️  Warning: Could not delete chunks for ${doc.title}: ${chunksError.message}`);
      } else {
        deletedChunks++;
      }

      // Delete document
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (docError) {
        console.log(`  ❌ Failed to delete ${doc.title}: ${docError.message}`);
      } else {
        deletedDocs++;
        console.log(`  ✓ Deleted: ${doc.title || doc.id}`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`   Deleted ${deletedDocs} document(s)`);
    console.log(`   Deleted chunks from ${deletedChunks} document(s)`);

    console.log('\nNext steps:');
    console.log('1. Go to your admin panel');
    console.log('2. Re-upload all PDFs');
    console.log('3. They will now be fully indexed with hundreds of chunks each!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllDocuments();
