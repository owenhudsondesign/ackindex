import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDocs() {
  // Get all documents ordered by most recent
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, source_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent documents in database:');
  console.log('=============================');
  for (const doc of docs || []) {
    console.log(`- ${doc.title || 'Untitled'}`);
    console.log(`  Status: ${doc.status}, Created: ${doc.created_at}`);
    console.log('');
  }

  // Also check chunk metadata for meeting dates
  console.log('\nChecking chunk metadata for meeting dates...');
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('document_id, metadata')
    .limit(50);

  if (chunks) {
    const uniqueDocs = new Map<string, string>();
    for (const chunk of chunks) {
      const meetingDate = chunk.metadata?.meeting_date || chunk.metadata?.published_at;
      if (meetingDate && !uniqueDocs.has(chunk.document_id)) {
        uniqueDocs.set(chunk.document_id, meetingDate);
      }
    }
    console.log('Meeting dates found in chunk metadata:');
    for (const [docId, date] of uniqueDocs) {
      console.log(`  Doc ${docId.substring(0, 8)}: ${date}`);
    }
  }
}

checkDocs();
