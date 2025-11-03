-- =====================================================
-- Conversations Schema for AckIndex
-- Multi-turn conversation support with message history
-- =====================================================

-- =====================================================
-- CONVERSATIONS TABLE
-- Stores conversation metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User who owns this conversation
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation metadata
  title TEXT NOT NULL DEFAULT 'New Conversation',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- =====================================================
-- CONVERSATION_MESSAGES TABLE
-- Stores individual messages within conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to conversation
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message details
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Metadata
  tokens_used INTEGER DEFAULT 0,
  citations JSONB DEFAULT '[]',

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at);

-- =====================================================
-- AUTO-UPDATE TIMESTAMP FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW(),
      last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when message is added
DROP TRIGGER IF EXISTS update_conversation_on_message ON conversation_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own conversations
CREATE POLICY "Users can read own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can read messages from their conversations
CREATE POLICY "Users can read own conversation messages"
  ON conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in own conversations"
  ON conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can delete messages from their conversations
CREATE POLICY "Users can delete own conversation messages"
  ON conversation_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get recent conversations for a user
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id UUID,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    COUNT(cm.id) as message_count
  FROM conversations c
  LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.title, c.created_at, c.updated_at, c.last_message_at
  ORDER BY c.last_message_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get messages for a conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  role VARCHAR,
  content TEXT,
  tokens_used INTEGER,
  citations JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Verify user owns this conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    cm.id,
    cm.role,
    cm.content,
    cm.tokens_used,
    cm.citations,
    cm.created_at
  FROM conversation_messages cm
  WHERE cm.conversation_id = p_conversation_id
  ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION generate_conversation_title(
  p_conversation_id UUID
)
RETURNS TEXT AS $$
DECLARE
  first_message TEXT;
  title TEXT;
BEGIN
  -- Get first user message
  SELECT content INTO first_message
  FROM conversation_messages
  WHERE conversation_id = p_conversation_id
    AND role = 'user'
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_message IS NULL THEN
    RETURN 'New Conversation';
  END IF;

  -- Truncate to 50 chars
  title := LEFT(first_message, 50);
  IF LENGTH(first_message) > 50 THEN
    title := title || '...';
  END IF;

  RETURN title;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES
-- =====================================================
/*
This schema provides:

1. Conversation Management
   - Each user can have multiple conversations
   - Conversations track metadata and timestamps
   - Auto-update last_message_at on new messages

2. Message History
   - Store all messages (user + assistant)
   - Include tokens used and citations
   - Ordered by creation time

3. Security
   - RLS ensures users only see their own conversations
   - Helper functions enforce ownership checks
   - Secure definer functions for complex queries

4. Features
   - Get recent conversations with message counts
   - Get all messages for a conversation
   - Auto-generate titles from first message
   - Cascade delete (delete conversation → delete all messages)

To apply this schema:
1. Run in Supabase SQL Editor
2. Ensure uuid-ossp extension is enabled
3. Test with a few sample conversations
*/
