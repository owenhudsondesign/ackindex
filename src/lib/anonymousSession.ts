import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Token limits
export const ANONYMOUS_TOKEN_LIMIT = 3500; // ~2-3 queries
export const FREE_USER_TOKEN_LIMIT = 50000; // ~35-50 queries

export interface AnonymousSession {
  sessionId: string;
  tokensUsed: number;
  tokensRemaining: number;
  canQuery: boolean;
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
 */
export async function getOrCreateAnonymousSession(
  fingerprint: string
): Promise<AnonymousSession | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_or_create_anonymous_session', {
      p_fingerprint: fingerprint,
      p_token_limit: ANONYMOUS_TOKEN_LIMIT,
    });

    if (error) {
      logger.error({ error, fingerprint }, 'Error getting/creating anonymous session');
      return null;
    }

    if (!data || data.length === 0) {
      logger.error({ fingerprint }, 'No data returned from get_or_create_anonymous_session');
      return null;
    }

    const session = data[0];

    return {
      sessionId: session.session_id,
      tokensUsed: session.tokens_used,
      tokensRemaining: session.tokens_remaining,
      canQuery: session.can_query,
    };
  } catch (error) {
    logger.error({ error, fingerprint }, 'Exception in getOrCreateAnonymousSession');
    return null;
  }
}

/**
 * Record usage for an anonymous session
 */
export async function recordAnonymousUsage(
  fingerprint: string,
  tokensUsed: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('record_anonymous_usage', {
      p_fingerprint: fingerprint,
      p_tokens_used: tokensUsed,
    });

    if (error) {
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
