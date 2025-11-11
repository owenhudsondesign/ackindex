/**
 * Test script to verify long video was embedded and is queryable
 */

import { supabaseAdmin } from '../src/lib/supabase';

async function testLongVideoQuery() {
  console.log('\n🔍 Checking for recently uploaded long videos...\n');

  // 1. Check recent documents
  const { data: recentDocs, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError);
    return;
  }

  console.log(`📄 Found ${recentDocs?.length || 0} recent documents:\n`);
  recentDocs?.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title || 'Untitled'}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Chunks: ${doc.total_chunks}`);
    console.log(`   Tokens: ${doc.total_tokens}`);
    console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
    console.log('');
  });

  // 2. Find the most recent completed document
  const latestCompleted = recentDocs?.find(doc => doc.status === 'completed');

  if (!latestCompleted) {
    console.log('⚠️  No completed documents found. Upload may still be processing.');
    console.log('   Check documents with status "processing" above.');
    return;
  }

  console.log(`✅ Testing with: "${latestCompleted.title}"\n`);

  // 3. Get chunks for this document
  const { data: chunks, error: chunksError } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content, chunk_index, metadata, embedding')
    .eq('document_id', latestCompleted.id)
    .order('chunk_index', { ascending: true })
    .limit(5);

  if (chunksError) {
    console.error('❌ Error fetching chunks:', chunksError);
    return;
  }

  console.log(`📊 Chunk Statistics:`);
  console.log(`   Total chunks in document: ${latestCompleted.total_chunks}`);
  console.log(`   Showing first ${chunks?.length || 0} chunks:\n`);

  chunks?.forEach((chunk, i) => {
    console.log(`Chunk ${chunk.chunk_index}:`);
    console.log(`   Content preview: ${chunk.content.substring(0, 150)}...`);
    console.log(`   Has embedding: ${chunk.embedding ? '✅ Yes' : '❌ No'}`);
    console.log(`   Metadata: ${JSON.stringify(chunk.metadata, null, 2).substring(0, 200)}...`);
    console.log('');
  });

  // 4. Check embedding status
  const { data: embeddingStats } = await supabaseAdmin
    .from('document_chunks')
    .select('embedding')
    .eq('document_id', latestCompleted.id);

  const totalChunks = embeddingStats?.length || 0;
  const withEmbeddings = embeddingStats?.filter(c => c.embedding !== null).length || 0;
  const percentage = totalChunks > 0 ? Math.round((withEmbeddings / totalChunks) * 100) : 0;

  console.log(`\n🎯 Embedding Status for "${latestCompleted.title}":`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log(`   With embeddings: ${withEmbeddings}`);
  console.log(`   Without embeddings: ${totalChunks - withEmbeddings}`);
  console.log(`   Completion: ${percentage}%`);

  if (percentage === 100) {
    console.log('\n✅ All chunks have embeddings! Document is fully queryable.');
  } else if (percentage > 0) {
    console.log(`\n⏳ Embeddings are ${percentage}% complete. Still processing...`);
  } else {
    console.log('\n⚠️  No embeddings generated yet. Check if embedding worker is running.');
  }

  // 5. Test a semantic search if embeddings exist
  if (withEmbeddings > 0) {
    console.log('\n\n🔍 Testing semantic search...');
    console.log('   (Note: This requires the hybrid_search function to be set up in Supabase)');

    // Try a simple text search first
    const searchQuery = latestCompleted.title?.split(' ').slice(0, 3).join(' ') || 'meeting';
    console.log(`   Searching for: "${searchQuery}"\n`);

    const { data: searchResults, error: searchError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, metadata')
      .eq('document_id', latestCompleted.id)
      .textSearch('content', searchQuery)
      .limit(3);

    if (searchError) {
      console.log('⚠️  Text search error:', searchError.message);
    } else if (searchResults && searchResults.length > 0) {
      console.log(`   Found ${searchResults.length} matching chunks:`);
      searchResults.forEach((result, i) => {
        console.log(`\n   Result ${i + 1}:`);
        console.log(`   ${result.content.substring(0, 200)}...`);
      });
    } else {
      console.log('   No results found for text search.');
    }
  }

  console.log('\n✅ Test complete!\n');
}

testLongVideoQuery().catch(console.error);
