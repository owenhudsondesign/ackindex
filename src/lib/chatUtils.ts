import { Message } from './types';

/**
 * Generate a unique ID for messages
 */
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

/**
 * Truncate text to a maximum length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Extract domain from URL for display
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

/**
 * Check if message contains citations
 */
export const hasCitations = (message: Message): boolean => {
  return Boolean(message.citations && message.citations.length > 0);
};

/**
 * Filter messages by role
 */
export const filterMessagesByRole = (
  messages: Message[], 
  role: 'user' | 'assistant'
): Message[] => {
  return messages.filter(msg => msg.role === role);
};

/**
 * Get the last assistant message
 */
export const getLastAssistantMessage = (messages: Message[]): Message | undefined => {
  const assistantMessages = filterMessagesByRole(messages, 'assistant');
  return assistantMessages[assistantMessages.length - 1];
};

/**
 * Check if conversation is active (has messages and not loading)
 */
export const isConversationActive = (messages: Message[]): boolean => {
  return messages.length > 0 && !messages.some(msg => msg.isLoading);
};

/**
 * Create a loading message
 */
export const createLoadingMessage = (): Message => {
  return {
    id: generateMessageId(),
    role: 'assistant',
    content: '',
    isLoading: true,
    timestamp: new Date()
  };
};

/**
 * Create a user message
 */
export const createUserMessage = (content: string): Message => {
  return {
    id: generateMessageId(),
    role: 'user',
    content,
    timestamp: new Date()
  };
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

/**
 * Validate query length
 */
export const isValidQuery = (query: string): boolean => {
  const sanitized = sanitizeInput(query);
  return sanitized.length >= 3 && sanitized.length <= 500;
};
