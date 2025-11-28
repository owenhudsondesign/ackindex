import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Find the November 19 Select Board document
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title')
    .ilike('title', '%Select Board%November 19%')
    .single();

  console.log('Document:', doc);

  if (doc) {
    // Check its chunks and embeddings
    const { data: chunks, count } = await supabase
      .from('document_chunks')
      .select('id, chunk_index, embedding', { count: 'exact' })
      .eq('document_id', doc.id);

    console.log('Total chunks:', count);

    let withEmbeddings = 0;
    let withoutEmbeddings = 0;

    if (chunks) {
      for (const c of chunks) {
        if (c.embedding) {
          withEmbeddings++;
        } else {
          withoutEmbeddings++;
        }
      }
    }

    console.log('With embeddings:', withEmbeddings);
    console.log('Without embeddings:', withoutEmbeddings);
  }
}

check();
