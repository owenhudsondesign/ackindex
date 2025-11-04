import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkEmbeddings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('Checking embedding status...\n');

    // Count total chunks
    const { count: totalChunks } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });

    // Count chunks with embeddings
    const { count: withEmbeddings } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    // Count chunks without embeddings
    const { count: withoutEmbeddings } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null);

    console.log(`Total chunks: ${totalChunks}`);
    console.log(`With embeddings: ${withEmbeddings}`);
    console.log(`Without embeddings: ${withoutEmbeddings}`);
    console.log(`Completion: ${((withEmbeddings! / totalChunks!) * 100).toFixed(1)}%\n`);

    if (withoutEmbeddings! > 0) {
      console.log('⚠️  Some chunks are missing embeddings!');
      console.log('This will cause semantic search to fail.\n');

      // Get a sample of chunks without embeddings
      const { data: samples } = await supabase
        .from('document_chunks')
        .select('id, document_id, chunk_index')
        .is('embedding', null)
        .limit(5);

      if (samples && samples.length > 0) {
        console.log('Sample chunks without embeddings:');
        for (const sample of samples) {
          console.log(`  - Chunk ${sample.chunk_index} from document ${sample.document_id}`);
        }
      }
    } else {
      console.log('✅ All chunks have embeddings!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEmbeddings();
