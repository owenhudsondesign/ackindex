/**
 * Clear all documents and chunks from the database
 * WARNING: This will delete ALL data - use with caution!
 */

import { supabaseAdmin } from '../src/lib/supabase';

async function clearAllDocuments() {
  console.log('\n⚠️  WARNING: This will delete ALL documents and chunks!\n');

  // Get all documents
  const { data: documents, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('id, title, source_type, total_chunks')
    .order('created_at', { ascending: false });

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('✅ No documents found. Database is already clean.\n');
    return;
  }

  console.log(`📊 Found ${documents.length} documents to delete:\n`);
  documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title || 'Untitled'}`);
    console.log(`   Type: ${doc.source_type}, Chunks: ${doc.total_chunks}`);
  });

  console.log('\n🗑️  Deleting all documents and their chunks...\n');

  // Delete all document chunks first (due to foreign key constraint)
  const { error: chunksError } = await supabaseAdmin
    .from('document_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID match)

  if (chunksError) {
    console.error('❌ Error deleting chunks:', chunksError);
    return;
  }

  console.log('✅ All document chunks deleted');

  // Delete all content hashes
  const { error: hashesError } = await supabaseAdmin
    .from('content_hashes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (hashesError) {
    console.error('⚠️  Warning deleting content hashes:', hashesError);
  } else {
    console.log('✅ All content hashes deleted');
  }

  // Delete all documents
  const { error: deleteDocsError } = await supabaseAdmin
    .from('documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteDocsError) {
    console.error('❌ Error deleting documents:', deleteDocsError);
    return;
  }

  console.log('✅ All documents deleted');

  // Verify deletion
  const { count } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true });

  const { count: chunkCount } = await supabaseAdmin
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  console.log('\n✅ Cleanup complete!');
  console.log(`   Documents remaining: ${count || 0}`);
  console.log(`   Chunks remaining: ${chunkCount || 0}\n`);
  console.log('🎬 Ready to ingest video/audio content!\n');
}

clearAllDocuments();
