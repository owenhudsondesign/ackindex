import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkChunkDistribution() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('Checking which documents have chunks...\n');

    // Get all chunks grouped by document
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('document_id, content, chunk_index, embedding, metadata');

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    if (!chunks || chunks.length === 0) {
      console.log('No chunks found!');
      process.exit(0);
    }

    // Group by document_id
    const byDocument = chunks.reduce((acc: any, chunk) => {
      if (!acc[chunk.document_id]) {
        acc[chunk.document_id] = [];
      }
      acc[chunk.document_id].push(chunk);
      return acc;
    }, {});

    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Documents with chunks: ${Object.keys(byDocument).length}\n`);

    // Get document details
    for (const [docId, docChunks] of Object.entries(byDocument)) {
      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📄 ${doc?.title || doc?.url || 'Unknown'}`);
      console.log(`   ID: ${docId}`);
      console.log(`   Chunks: ${(docChunks as any[]).length}`);
      console.log(`   Has Embeddings: ${(docChunks as any[]).every(c => c.embedding) ? 'Yes' : 'Partial'}`);

      // Show first chunk preview
      const firstChunk = (docChunks as any[])[0];
      console.log(`\n   First chunk content:`);
      console.log(`   ${firstChunk.content.substring(0, 300)}...\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkChunkDistribution();
