/**
 * Cache utilities using Vercel KV (Redis)
 *
 * Provides caching for:
 * - User profiles (1 hour TTL)
 * - Subscription status (5 min TTL)
 * - Semantic search queries (24 hour TTL)
 * - Embeddings (permanent until invalidated)
 */

import { kv } from '@vercel/kv';
import logger from './logger';
import crypto from 'crypto';

// Cache key prefixes
const CACHE_PREFIX = {
  USER_PROFILE: 'user:profile:',
  SUBSCRIPTION: 'user:subscription:',
  SEARCH_QUERY: 'search:query:',
  EMBEDDING: 'embedding:',
  CHAT_RESPONSE: 'chat:response:',  // Full chat responses
} as const;

// TTL values in seconds
export const CACHE_TTL = {
  USER_PROFILE: 3600,        // 1 hour
  SUBSCRIPTION: 300,         // 5 minutes
  SEARCH_QUERY: 86400,       // 24 hours
  EMBEDDING: 2592000,        // 30 days
  CHAT_RESPONSE: 3600,       // 1 hour for chat responses
} as const;

/**
 * Generate hash for cache key
 */
function generateHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * User Profile Caching
 */
export async function getCachedUserProfile(userId: string) {
  try {
    const key = `${CACHE_PREFIX.USER_PROFILE}${userId}`;
    const cached = await kv.get(key);

    if (cached) {
      logger.debug({ userId, key }, 'User profile cache hit');
      return cached;
    }

    logger.debug({ userId, key }, 'User profile cache miss');
    return null;
  } catch (error) {
    logger.error({ error, userId }, 'Error getting cached user profile');
    return null; // Fail gracefully
  }
}

export async function setCachedUserProfile(userId: string, profile: any) {
  try {
    const key = `${CACHE_PREFIX.USER_PROFILE}${userId}`;
    await kv.set(key, profile, { ex: CACHE_TTL.USER_PROFILE });
    logger.debug({ userId, key, ttl: CACHE_TTL.USER_PROFILE }, 'User profile cached');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Error caching user profile');
    return false;
  }
}

export async function invalidateUserProfile(userId: string) {
  try {
    const key = `${CACHE_PREFIX.USER_PROFILE}${userId}`;
    await kv.del(key);
    logger.debug({ userId, key }, 'User profile cache invalidated');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Error invalidating user profile cache');
    return false;
  }
}

/**
 * Subscription Status Caching
 */
export async function getCachedSubscription(userId: string) {
  try {
    const key = `${CACHE_PREFIX.SUBSCRIPTION}${userId}`;
    const cached = await kv.get(key);

    if (cached) {
      logger.debug({ userId, key }, 'Subscription cache hit');
      return cached;
    }

    logger.debug({ userId, key }, 'Subscription cache miss');
    return null;
  } catch (error) {
    logger.error({ error, userId }, 'Error getting cached subscription');
    return null;
  }
}

export async function setCachedSubscription(userId: string, subscription: any) {
  try {
    const key = `${CACHE_PREFIX.SUBSCRIPTION}${userId}`;
    await kv.set(key, subscription, { ex: CACHE_TTL.SUBSCRIPTION });
    logger.debug({ userId, key, ttl: CACHE_TTL.SUBSCRIPTION }, 'Subscription cached');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Error caching subscription');
    return false;
  }
}

export async function invalidateSubscription(userId: string) {
  try {
    const key = `${CACHE_PREFIX.SUBSCRIPTION}${userId}`;
    await kv.del(key);
    logger.debug({ userId, key }, 'Subscription cache invalidated');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Error invalidating subscription cache');
    return false;
  }
}

/**
 * Semantic Search Query Caching
 *
 * Caches the results of search queries (embeddings + retrieved chunks)
 * to reduce OpenAI API calls for common queries
 */
export async function getCachedSearchQuery(query: string) {
  try {
    const queryHash = generateHash(query.toLowerCase().trim());
    const key = `${CACHE_PREFIX.SEARCH_QUERY}${queryHash}`;
    const cached = await kv.get(key);

    if (cached) {
      logger.debug({ query, queryHash, key }, 'Search query cache hit');
      return cached;
    }

    logger.debug({ query, queryHash, key }, 'Search query cache miss');
    return null;
  } catch (error) {
    logger.error({ error, query }, 'Error getting cached search query');
    return null;
  }
}

export async function setCachedSearchQuery(query: string, results: any) {
  try {
    const queryHash = generateHash(query.toLowerCase().trim());
    const key = `${CACHE_PREFIX.SEARCH_QUERY}${queryHash}`;
    await kv.set(key, results, { ex: CACHE_TTL.SEARCH_QUERY });
    logger.debug({ query, queryHash, key, ttl: CACHE_TTL.SEARCH_QUERY }, 'Search query cached');
    return true;
  } catch (error) {
    logger.error({ error, query }, 'Error caching search query');
    return false;
  }
}

/**
 * Embedding Caching
 *
 * Cache embeddings for text chunks to avoid regenerating
 * them if the same text is processed again
 */
export async function getCachedEmbedding(text: string) {
  try {
    const textHash = generateHash(text);
    const key = `${CACHE_PREFIX.EMBEDDING}${textHash}`;
    const cached = await kv.get(key);

    if (cached) {
      logger.debug({ textHash, key }, 'Embedding cache hit');
      return cached as number[];
    }

    logger.debug({ textHash, key }, 'Embedding cache miss');
    return null;
  } catch (error) {
    logger.error({ error }, 'Error getting cached embedding');
    return null;
  }
}

export async function setCachedEmbedding(text: string, embedding: number[]) {
  try {
    const textHash = generateHash(text);
    const key = `${CACHE_PREFIX.EMBEDDING}${textHash}`;
    await kv.set(key, embedding, { ex: CACHE_TTL.EMBEDDING });
    logger.debug({ textHash, key, ttl: CACHE_TTL.EMBEDDING }, 'Embedding cached');
    return true;
  } catch (error) {
    logger.error({ error }, 'Error caching embedding');
    return false;
  }
}

/**
 * Cache Statistics
 *
 * Get statistics about cache usage
 */
export async function getCacheStats() {
  try {
    // Note: This is a simple implementation
    // For production, consider tracking hits/misses separately
    const stats = {
      timestamp: new Date().toISOString(),
      message: 'Cache stats - implement tracking if needed',
    };

    return stats;
  } catch (error) {
    logger.error({ error }, 'Error getting cache stats');
    return null;
  }
}

/**
 * Clear all caches (use with caution!)
 */
export async function clearAllCaches() {
  try {
    // Note: Vercel KV doesn't have a built-in flushall
    // Would need to track keys or use patterns
    logger.warn('clearAllCaches called - manual key deletion required');
    return false;
  } catch (error) {
    logger.error({ error }, 'Error clearing caches');
    return false;
  }
}

/**
 * Invalidate multiple user caches at once
 */
export async function invalidateUserCaches(userId: string) {
  const results = await Promise.allSettled([
    invalidateUserProfile(userId),
    invalidateSubscription(userId),
  ]);

  const success = results.every(r => r.status === 'fulfilled' && r.value === true);
  logger.debug({ userId, success }, 'User caches invalidated');
  return success;
}

/**
 * Chat Response Caching
 *
 * Caches full chat responses to avoid redundant Claude API calls
 * for identical or similar queries. Useful for common questions.
 */
export interface CachedChatResponse {
  response: string;
  citations: any[];
  model: string;
  cachedAt: string;
}

export async function getCachedChatResponse(query: string): Promise<CachedChatResponse | null> {
  try {
    // Normalize query for better cache hits
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    const queryHash = generateHash(normalizedQuery);
    const key = `${CACHE_PREFIX.CHAT_RESPONSE}${queryHash}`;
    const cached = await kv.get<CachedChatResponse>(key);

    if (cached) {
      logger.info({ query: query.substring(0, 50), queryHash }, 'Chat response cache HIT');
      return cached;
    }

    logger.debug({ query: query.substring(0, 50), queryHash }, 'Chat response cache miss');
    return null;
  } catch (error) {
    logger.error({ error, query: query.substring(0, 50) }, 'Error getting cached chat response');
    return null;
  }
}

export async function setCachedChatResponse(
  query: string,
  response: string,
  citations: any[],
  model: string
): Promise<boolean> {
  try {
    // Normalize query for better cache hits
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    const queryHash = generateHash(normalizedQuery);
    const key = `${CACHE_PREFIX.CHAT_RESPONSE}${queryHash}`;

    const cacheData: CachedChatResponse = {
      response,
      citations,
      model,
      cachedAt: new Date().toISOString(),
    };

    await kv.set(key, cacheData, { ex: CACHE_TTL.CHAT_RESPONSE });
    logger.info({ query: query.substring(0, 50), queryHash, ttl: CACHE_TTL.CHAT_RESPONSE }, 'Chat response cached');
    return true;
  } catch (error) {
    logger.error({ error, query: query.substring(0, 50) }, 'Error caching chat response');
    return false;
  }
}
