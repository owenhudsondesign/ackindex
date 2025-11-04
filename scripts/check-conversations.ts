import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkConversations() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('Checking conversations in database...\n');

    // Get all conversations with message counts
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        user_id,
        title,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching conversations:', error);
      process.exit(1);
    }

    if (!conversations || conversations.length === 0) {
      console.log('No conversations found.');
      process.exit(0);
    }

    console.log(`Found ${conversations.length} recent conversations:\n`);

    for (const conv of conversations) {
      // Count messages for this conversation
      const { count: messageCount } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID: ${conv.id}`);
      console.log(`Title: ${conv.title}`);
      console.log(`User ID: ${conv.user_id}`);
      console.log(`Message Count: ${messageCount || 0}`);
      console.log(`Created: ${new Date(conv.created_at).toLocaleString()}`);
      console.log(`Updated: ${new Date(conv.updated_at).toLocaleString()}`);

      // Get sample messages
      if (messageCount && messageCount > 0) {
        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('role, content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })
          .limit(2);

        if (messages && messages.length > 0) {
          console.log('\nFirst messages:');
          for (const msg of messages) {
            console.log(`  [${msg.role}]: ${msg.content.substring(0, 100)}...`);
          }
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkConversations();
