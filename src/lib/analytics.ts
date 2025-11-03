/**
 * Analytics Utilities
 *
 * Track chat queries and user interactions for insights.
 */

import { supabaseAdmin } from './supabase';
import logger from './logger';

export interface QueryLogData {
  user_id: string;
  query_text: string;
  response_text?: string;
  tokens_used?: number;
  response_time_ms?: number;
  has_results?: boolean;
  num_citations?: number;
}

/**
 * Log a chat query for analytics
 */
export async function logQuery(data: QueryLogData): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('query_logs')
      .insert({
        user_id: data.user_id,
        query_text: data.query_text,
        response_text: data.response_text,
        tokens_used: data.tokens_used || 0,
        response_time_ms: data.response_time_ms,
        has_results: data.has_results ?? true,
        num_citations: data.num_citations || 0,
      });

    if (error) {
      logger.error({ err: error }, 'Failed to log query for analytics');
    } else {
      logger.debug({ userId: data.user_id }, 'Query logged successfully');
    }
  } catch (error) {
    // Don't fail the request if analytics logging fails
    logger.error({ err: error }, 'Exception while logging query');
  }
}

/**
 * Log user feedback on a query
 */
export async function logQueryFeedback(
  queryId: string,
  feedback: 'helpful' | 'not_helpful'
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('query_logs')
      .update({ user_feedback: feedback })
      .eq('id', queryId);

    if (error) {
      logger.error({ err: error, queryId }, 'Failed to log query feedback');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ err: error, queryId }, 'Exception while logging feedback');
    return false;
  }
}

/**
 * Get popular queries
 */
export async function getPopularQueries(
  limitCount: number = 20,
  daysBack: number = 30
) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_popular_queries', {
      limit_count: limitCount,
      days_back: daysBack,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch popular queries');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching popular queries');
    return [];
  }
}

/**
 * Get trending topics
 */
export async function getTrendingTopics(limitCount: number = 10) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_trending_topics', {
      limit_count: limitCount,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch trending topics');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching trending topics');
    return [];
  }
}

/**
 * Get admin analytics overview
 */
export async function getAdminAnalyticsOverview() {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_admin_analytics_overview');

    if (error) {
      logger.error({ err: error }, 'Failed to fetch admin analytics overview');
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching analytics overview');
    return null;
  }
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(limitCount: number = 50) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_user_analytics', {
      limit_count: limitCount,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch user analytics');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching user analytics');
    return [];
  }
}

/**
 * Get query volume by day
 */
export async function getQueryVolumeByDay(daysBack: number = 30) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_query_volume_by_day', {
      days_back: daysBack,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch query volume');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching query volume');
    return [];
  }
}
