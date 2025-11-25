/**
 * Redis-based Rate Limiting using Vercel KV
 *
 * Implements a sliding window rate limiter to prevent abuse and cost spikes.
 * Uses Redis sorted sets for accurate sliding window calculations.
 */

import { kv } from '@vercel/kv';
import logger from './logger';

// Rate limit configurations
export const RATE_LIMITS = {
  // Chat API limits
  CHAT_ANONYMOUS: {
    requests: 10,      // 10 requests
    windowSeconds: 60, // per minute
  },
  CHAT_FREE: {
    requests: 20,      // 20 requests
    windowSeconds: 60, // per minute
  },
  CHAT_PREMIUM: {
    requests: 60,      // 60 requests
    windowSeconds: 60, // per minute
  },
  // Global abuse protection (per IP)
  GLOBAL_IP: {
    requests: 100,     // 100 requests
    windowSeconds: 60, // per minute
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
}

const RATE_LIMIT_PREFIX = 'ratelimit:';

/**
 * Check if a request is allowed under rate limiting
 * Uses sliding window log algorithm with Redis sorted sets
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'CHAT_FREE'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier];
  const key = `${RATE_LIMIT_PREFIX}${tier}:${identifier}`;
  const now = Date.now();
  const windowStart = now - (config.windowSeconds * 1000);

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = kv.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Execute pipeline
    const results = await pipeline.exec();
    const currentCount = (results[1] as number) || 0;

    if (currentCount >= config.requests) {
      // Rate limited - calculate reset time
      const oldestEntry = await kv.zrange(key, 0, 0, { withScores: true });
      const oldestTimestamp = oldestEntry?.[1] || now;
      const resetInSeconds = Math.ceil(((oldestTimestamp as number) + (config.windowSeconds * 1000) - now) / 1000);

      logger.warn({
        identifier,
        tier,
        currentCount,
        limit: config.requests,
        resetInSeconds,
      }, 'Rate limit exceeded');

      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.max(1, resetInSeconds),
        limit: config.requests,
      };
    }

    // Add current request to the window
    await kv.zadd(key, { score: now, member: `${now}:${Math.random().toString(36).slice(2)}` });

    // Set expiry on the key (cleanup)
    await kv.expire(key, config.windowSeconds + 10);

    const remaining = Math.max(0, config.requests - currentCount - 1);

    logger.debug({
      identifier,
      tier,
      currentCount: currentCount + 1,
      remaining,
      limit: config.requests,
    }, 'Rate limit check passed');

    return {
      allowed: true,
      remaining,
      resetInSeconds: config.windowSeconds,
      limit: config.requests,
    };
  } catch (error) {
    // On Redis error, fail open (allow request) but log the error
    logger.error({ error, identifier, tier }, 'Rate limit check failed - allowing request');

    return {
      allowed: true,
      remaining: config.requests,
      resetInSeconds: config.windowSeconds,
      limit: config.requests,
    };
  }
}

/**
 * Get the appropriate rate limit tier based on user status
 */
export function getRateLimitTier(
  isAnonymous: boolean,
  isPremium: boolean
): RateLimitTier {
  if (isAnonymous) return 'CHAT_ANONYMOUS';
  if (isPremium) return 'CHAT_PREMIUM';
  return 'CHAT_FREE';
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetInSeconds.toString(),
  };
}

/**
 * Check IP-based global rate limit (abuse protection)
 */
export async function checkGlobalRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(ip, 'GLOBAL_IP');
}
