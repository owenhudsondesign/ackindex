import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function testSaveMessage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('Testing message save to most recent conversation...\n');

    // Get the most recent conversation with 0 messages
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, title')
      .eq('title', 'New Conversation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convError || !conv) {
      console.error('Error finding conversation:', convError);
      process.exit(1);
    }

    console.log(`Found conversation: ${conv.id}`);
    console.log(`User ID: ${conv.user_id}`);
    console.log(`\nAttempting to save a test message...`);

    // Try to save a message
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conv.id,
        role: 'user',
        content: 'Test message from diagnostic script',
        tokens_used: 0,
        citations: [],
      })
      .select()
      .single();

    if (error) {
      console.error('\n❌ Failed to save message!');
      console.error('Error details:');
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);
      console.error('  Code:', error.code);
      console.error('\nFull error object:', JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Successfully saved message!');
    console.log('Message ID:', data.id);
    console.log('Content:', data.content);

    // Now try to count messages
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id);

    console.log(`\nConversation now has ${count} message(s)`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Exception:', error);
    process.exit(1);
  }
}

testSaveMessage();
