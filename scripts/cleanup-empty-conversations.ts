import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function cleanupEmptyConversations() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('Finding conversations with 0 messages...\n');

    // Get all conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('title', 'New Conversation')
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      process.exit(1);
    }

    if (!conversations || conversations.length === 0) {
      console.log('No "New Conversation" entries found.');
      process.exit(0);
    }

    const emptyConversations = [];

    for (const conv of conversations) {
      const { count } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id);

      if (count === 0) {
        emptyConversations.push(conv);
      }
    }

    if (emptyConversations.length === 0) {
      console.log('✅ No empty conversations found!');
      process.exit(0);
    }

    console.log(`Found ${emptyConversations.length} empty conversation(s):\n`);

    for (const conv of emptyConversations) {
      console.log(`  - ID: ${conv.id.substring(0, 8)}... (created: ${new Date(conv.created_at).toLocaleString()})`);
    }

    console.log('\nDeleting empty conversations...\n');

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .in('id', emptyConversations.map(c => c.id));

    if (deleteError) {
      console.error('Error deleting conversations:', deleteError);
      process.exit(1);
    }

    console.log(`✅ Successfully deleted ${emptyConversations.length} empty conversation(s)!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupEmptyConversations();
