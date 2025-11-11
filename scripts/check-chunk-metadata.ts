import { supabaseAdmin } from '../src/lib/supabase';

async function checkMetadata() {
  const { data } = await supabaseAdmin
    .from('document_chunks')
    .select('metadata, content')
    .eq('document_id', '4e35b8ab-ea86-4495-a5ae-77a693536f05')
    .limit(2);

  if (data && data.length > 0) {
    console.log('\n=== Chunk 1 ===');
    console.log('Metadata:', JSON.stringify(data[0].metadata, null, 2));
    console.log('\nContent preview:', data[0].content.substring(0, 300));

    if (data[1]) {
      console.log('\n\n=== Chunk 2 ===');
      console.log('Metadata:', JSON.stringify(data[1].metadata, null, 2));
      console.log('\nContent preview:', data[1].content.substring(0, 300));
    }
  }
}

checkMetadata();
