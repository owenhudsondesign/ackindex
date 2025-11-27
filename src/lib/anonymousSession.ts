import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Query limits for anonymous users
export const ANONYMOUS_QUERY_LIMIT = 5; // 5 free questions before signup required
export const FREE_USER_TOKEN_LIMIT = 50000; // ~35-50 queries for signed-in free users

// Legacy export for backwards compatibility
export const ANONYMOUS_TOKEN_LIMIT = 3500;

export interface AnonymousSession {
  sessionId: string;
  queriesUsed: number;
  queriesRemaining: number;
  canQuery: boolean;
  // Legacy token fields for backwards compatibility
  tokensUsed: number;
  tokensRemaining: number;
}

/**
 * Generate a fingerprint for an anonymous user based on IP and User-Agent
 * This creates a unique identifier without storing PII
 */
export function generateFingerprint(request: NextRequest): string {
  // Get client IP (check various headers for proxies/CDNs)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown-ip';

  // Get user agent
  const userAgent = request.headers.get('user-agent') || 'unknown-ua';

  // Create hash of IP + User-Agent
  // This prevents storing actual IPs while still allowing rate limiting
  const hash = crypto
    .createHash('sha256')
    .update(`${clientIp}:${userAgent}`)
    .digest('hex');

  return hash;
}

/**
 * Get or create an anonymous session for rate limiting
 * Now uses query count instead of token count
 */
export async function getOrCreateAnonymousSession(
  fingerprint: string
): Promise<AnonymousSession | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_or_create_anonymous_session_v2', {
      p_fingerprint: fingerprint,
      p_query_limit: ANONYMOUS_QUERY_LIMIT,
    });

    if (error) {
      // Fall back to legacy function if v2 doesn't exist yet
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        logger.info({ fingerprint }, 'Falling back to legacy anonymous session function');
        return getOrCreateAnonymousSessionLegacy(fingerprint);
      }
      logger.error({ error, fingerprint }, 'Error getting/creating anonymous session');
      return null;
    }

    if (!data || data.length === 0) {
      logger.error({ fingerprint }, 'No data returned from get_or_create_anonymous_session_v2');
      return null;
    }

    const session = data[0];

    return {
      sessionId: session.session_id,
      queriesUsed: session.queries_used,
      queriesRemaining: session.queries_remaining,
      canQuery: session.can_query,
      // Legacy fields for backwards compatibility
      tokensUsed: session.tokens_used || 0,
      tokensRemaining: 0,
    };
  } catch (error) {
    logger.error({ error, fingerprint }, 'Exception in getOrCreateAnonymousSession');
    return null;
  }
}

/**
 * Legacy function for backwards compatibility during migration
 */
async function getOrCreateAnonymousSessionLegacy(
  fingerprint: string
): Promise<AnonymousSession | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_or_create_anonymous_session', {
      p_fingerprint: fingerprint,
      p_token_limit: ANONYMOUS_TOKEN_LIMIT,
    });

    if (error) {
      logger.error({ error, fingerprint }, 'Error in legacy anonymous session');
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const session = data[0];

    // Convert token-based session to query-based (estimate ~700 tokens per query)
    const estimatedQueries = Math.floor(session.tokens_used / 700);

    return {
      sessionId: session.session_id,
      queriesUsed: estimatedQueries,
      queriesRemaining: Math.max(0, ANONYMOUS_QUERY_LIMIT - estimatedQueries),
      canQuery: estimatedQueries < ANONYMOUS_QUERY_LIMIT,
      tokensUsed: session.tokens_used,
      tokensRemaining: session.tokens_remaining,
    };
  } catch (error) {
    logger.error({ error, fingerprint }, 'Exception in legacy anonymous session');
    return null;
  }
}

/**
 * Record usage for an anonymous session
 * Now increments query count (tokens still recorded for analytics)
 */
export async function recordAnonymousUsage(
  fingerprint: string,
  tokensUsed: number
): Promise<boolean> {
  try {
    // Try the new v2 function first
    const { data, error } = await supabaseAdmin.rpc('record_anonymous_usage_v2', {
      p_fingerprint: fingerprint,
      p_tokens_used: tokensUsed,
    });

    if (error) {
      // Fall back to legacy function if v2 doesn't exist yet
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        return recordAnonymousUsageLegacy(fingerprint, tokensUsed);
      }
      logger.error({ error, fingerprint, tokensUsed }, 'Error recording anonymous usage');
      return false;
    }

    return data === true;
  } catch (error) {
    logger.error({ error, fingerprint, tokensUsed }, 'Exception in recordAnonymousUsage');
    return false;
  }
}

/**
 * Legacy record usage function
 */
async function recordAnonymousUsageLegacy(
  fingerprint: string,
  tokensUsed: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('record_anonymous_usage', {
      p_fingerprint: fingerprint,
      p_tokens_used: tokensUsed,
    });

    if (error) {
      logger.error({ error, fingerprint, tokensUsed }, 'Error in legacy record usage');
      return false;
    }

    return data === true;
  } catch (error) {
    logger.error({ error, fingerprint, tokensUsed }, 'Exception in legacy record usage');
    return false;
  }
}

/**
 * Check if an anonymous user can make a query
 */
export async function canAnonymousUserQuery(fingerprint: string): Promise<boolean> {
  const session = await getOrCreateAnonymousSession(fingerprint);
  return session?.canQuery || false;
}

/**
 * Cleanup expired anonymous sessions (call from cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_anonymous_sessions');

    if (error) {
      logger.error({ error }, 'Error cleaning up expired sessions');
      return 0;
    }

    logger.info({ deletedCount: data }, 'Cleaned up expired anonymous sessions');
    return data || 0;
  } catch (error) {
    logger.error({ error }, 'Exception in cleanupExpiredSessions');
    return 0;
  }
}
