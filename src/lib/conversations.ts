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
    logger.debug({ conversationId, userId }, 'Calling get_conversation_messages RPC');
    
    // First verify the conversation exists and belongs to the user
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      logger.error({ 
        err: convError, 
        conversationId, 
        userId 
      }, 'Conversation not found or access denied');
      return [];
    }

    // Try RPC function first
    const { data, error } = await supabaseAdmin.rpc('get_conversation_messages', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) {
      logger.warn({ 
        err: error, 
        conversationId, 
        userId,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint
      }, 'RPC call failed, trying direct query fallback');
      
      // Fallback: Direct query
      const { data: directData, error: directError } = await supabaseAdmin
        .from('conversation_messages')
        .select('id, role, content, tokens_used, citations, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (directError) {
        logger.error({ err: directError, conversationId }, 'Direct query also failed');
        return [];
      }

      logger.info({ 
        conversationId, 
        messageCount: directData?.length || 0 
      }, 'Retrieved messages via direct query fallback');
      
      // Ensure required field conversation_id is present for typing
      return (directData || []).map((m: any) => ({
        conversation_id: conversationId,
        id: m.id,
        role: m.role,
        content: m.content,
        tokens_used: m.tokens_used,
        citations: m.citations,
        created_at: m.created_at,
      }));
    }

    logger.debug({ 
      conversationId, 
      userId, 
      messageCount: data?.length || 0,
      messages: data?.map((m: any) => ({ id: m.id, role: m.role, hasContent: !!m.content }))
    }, 'Successfully retrieved conversation messages via RPC');

    // Normalize to include conversation_id for type safety
    return (data || []).map((m: any) => ({
      conversation_id: conversationId,
      id: m.id,
      role: m.role,
      content: m.content,
      tokens_used: m.tokens_used,
      citations: m.citations,
      created_at: m.created_at,
    }));
  } catch (error) {
    logger.error({ err: error, conversationId, userId }, 'Exception getting messages');
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
    logger.debug({ conversationId, role, contentLength: content.length }, 'Attempting to add message');

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
      logger.error({
        err: error,
        conversationId,
        role,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        errorCode: error.code
      }, 'Failed to add message to database');
      return null;
    }

    logger.info({ conversationId, role, messageId: data.id }, 'Successfully added message');
    return data;
  } catch (error) {
    logger.error({ err: error, conversationId, role }, 'Exception adding message');
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
): Promise<{ role: string; content: string; citations?: any[] }[]> {
  try {
    const messages = await getConversationMessages(conversationId, userId);

    // Get the last N messages
    const recentMessages = messages.slice(-limit);

    // Format for API context, including citations for follow-up questions
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      citations: msg.citations || [],
    }));
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Exception getting recent messages');
    return [];
  }
}
