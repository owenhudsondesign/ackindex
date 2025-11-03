/**
 * Conversation Utilities
 *
 * Manage multi-turn conversations with message history.
 */

import { supabaseAdmin } from './supabase';
import logger from './logger';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count?: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  citations: any[];
  created_at: string;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  title: string = 'New Conversation'
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error, userId }, 'Failed to create conversation');
      return null;
    }

    return data;
  } catch (error) {
    logger.error({ err: error, userId }, 'Exception creating conversation');
    return null;
  }
}

/**
 * Get user's conversations
 */
export async function getUserConversations(
  userId: string,
  limit: number = 20
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_user_conversations', {
      p_user_id: userId,
      limit_count: limit,
    });

    if (error) {
      logger.error({ err: error, userId }, 'Failed to get user conversations');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error, userId }, 'Exception getting conversations');
    return [];
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string
): Promise<ConversationMessage[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_conversation_messages', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) {
      logger.error({ err: error, conversationId, userId }, 'Failed to get conversation messages');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception getting messages');
    return [];
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokensUsed: number = 0,
  citations: any[] = []
): Promise<ConversationMessage | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        tokens_used: tokensUsed,
        citations,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error, conversationId }, 'Failed to add message');
      return null;
    }

    return data;
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception adding message');
    return null;
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      logger.error({ err: error, conversationId }, 'Failed to update conversation title');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception updating conversation title');
    return false;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      logger.error({ err: error, conversationId }, 'Failed to delete conversation');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception deleting conversation');
    return false;
  }
}

/**
 * Auto-generate conversation title from first message
 */
export async function autoGenerateTitle(
  conversationId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('generate_conversation_title', {
      p_conversation_id: conversationId,
    });

    if (error) {
      logger.error({ err: error, conversationId }, 'Failed to generate title');
      return null;
    }

    return data;
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception generating title');
    return null;
  }
}

/**
 * Get the last N messages from a conversation for context
 */
export async function getRecentMessages(
  conversationId: string,
  userId: string,
  limit: number = 10
): Promise<{ role: string; content: string }[]> {
  try {
    const messages = await getConversationMessages(conversationId, userId);

    // Get the last N messages
    const recentMessages = messages.slice(-limit);

    // Format for API context
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception getting recent messages');
    return [];
  }
}
