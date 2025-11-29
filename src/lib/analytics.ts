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

/**
 * Get peak usage times by hour of day
 */
export async function getPeakUsageTimes(daysBack: number = 30) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_peak_usage_times', {
      days_back: daysBack,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch peak usage times');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching peak usage times');
    return [];
  }
}

/**
 * Get most viewed documents/meetings
 */
export async function getMostViewedDocuments(limitCount: number = 20, daysBack: number = 30) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_most_viewed_documents', {
      limit_count: limitCount,
      days_back: daysBack,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch most viewed documents');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching most viewed documents');
    return [];
  }
}

/**
 * Get usage patterns by day of week
 */
export async function getUsageByDayOfWeek(daysBack: number = 30) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_usage_by_day_of_week', {
      days_back: daysBack,
    });

    if (error) {
      logger.error({ err: error }, 'Failed to fetch usage by day of week');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching usage by day of week');
    return [];
  }
}

/**
 * Get search effectiveness metrics
 */
export async function getSearchEffectivenessMetrics() {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_search_effectiveness_metrics');

    if (error) {
      logger.error({ err: error }, 'Failed to fetch search effectiveness metrics');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching search effectiveness metrics');
    return [];
  }
}

/**
 * Get most read blog posts
 * Returns published blog posts ordered by view_count (or published_at as fallback)
 */
export async function getMostReadBlogs(limitCount: number = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        meeting_type,
        meeting_date,
        published_at,
        view_count,
        thumbnail_url
      `)
      .eq('status', 'published')
      .order('view_count', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false })
      .limit(limitCount);

    if (error) {
      logger.error({ err: error }, 'Failed to fetch most read blogs');
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error({ err: error }, 'Exception while fetching most read blogs');
    return [];
  }
}

/**
 * Increment view count for a blog post
 */
export async function incrementBlogViewCount(blogId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc('increment_blog_view_count', {
      p_blog_id: blogId,
    });

    if (error) {
      // Fallback to direct increment if RPC doesn't exist
      const { error: updateError } = await supabaseAdmin
        .from('blog_posts')
        .update({ view_count: supabaseAdmin.rpc('coalesce', { value: 'view_count', fallback: 0 }) })
        .eq('id', blogId);

      if (updateError) {
        logger.error({ err: updateError, blogId }, 'Failed to increment blog view count');
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error({ err: error, blogId }, 'Exception while incrementing blog view count');
    return false;
  }
}

/**
 * Search Insights Report
 * Comprehensive analytics about what users are searching for
 */
export interface SearchInsightsReport {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    totalQueries: number;
    uniqueUsers: number;
    avgQueriesPerUser: number;
    avgResponseTime: number;
    successRate: number;
  };
  topQueries: Array<{
    query: string;
    count: number;
    avgCitations: number;
    successRate: number;
  }>;
  topTopics: Array<{
    topic: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
  queryCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
  dailyVolume: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Get comprehensive search insights for a time period
 */
export async function getSearchInsightsReport(
  period: 'week' | 'month' | 'quarter' | 'year' = 'week'
): Promise<SearchInsightsReport | null> {
  try {
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 7 Days';
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 30 Days';
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 90 Days';
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 365 Days';
        break;
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = now.toISOString();

    // Fetch all queries in the period
    const { data: queries, error: queryError } = await supabaseAdmin
      .from('query_logs')
      .select('*')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: false });

    if (queryError) {
      logger.error({ err: queryError }, 'Failed to fetch queries for insights');
      return null;
    }

    const queryList = queries || [];

    // Calculate summary stats
    const uniqueUsers = new Set(queryList.map(q => q.user_id)).size;
    const successfulQueries = queryList.filter(q => q.has_results).length;
    const avgResponseTime = queryList.length > 0
      ? queryList.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / queryList.length
      : 0;

    // Group queries by text (normalize for counting)
    const queryGroups: Record<string, { count: number; citations: number[]; hasResults: boolean[] }> = {};
    queryList.forEach(q => {
      const normalized = q.query_text?.toLowerCase().trim() || '';
      if (!normalized) return;
      if (!queryGroups[normalized]) {
        queryGroups[normalized] = { count: 0, citations: [], hasResults: [] };
      }
      queryGroups[normalized].count++;
      queryGroups[normalized].citations.push(q.num_citations || 0);
      queryGroups[normalized].hasResults.push(q.has_results ?? true);
    });

    // Top queries
    const topQueries = Object.entries(queryGroups)
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgCitations: data.citations.length > 0
          ? Math.round(data.citations.reduce((a, b) => a + b, 0) / data.citations.length * 10) / 10
          : 0,
        successRate: data.hasResults.length > 0
          ? Math.round(data.hasResults.filter(Boolean).length / data.hasResults.length * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Categorize queries by topic keywords
    const categories: Record<string, number> = {
      'Zoning & Land Use': 0,
      'Budget & Finance': 0,
      'Housing': 0,
      'Environment': 0,
      'Infrastructure': 0,
      'Public Safety': 0,
      'Education': 0,
      'Town Governance': 0,
      'Other': 0,
    };

    const categoryKeywords: Record<string, string[]> = {
      'Zoning & Land Use': ['zoning', 'land use', 'setback', 'variance', 'building', 'permit', 'development', 'lot', 'overlay'],
      'Budget & Finance': ['budget', 'tax', 'funding', 'appropriation', 'finance', 'money', 'cost', 'expense', 'revenue'],
      'Housing': ['housing', 'affordable', 'rental', 'apartment', 'residential', 'home', 'condo'],
      'Environment': ['environment', 'conservation', 'water', 'sewer', 'beach', 'erosion', 'climate', 'sustainability'],
      'Infrastructure': ['road', 'traffic', 'parking', 'sidewalk', 'infrastructure', 'transportation', 'ferry'],
      'Public Safety': ['police', 'fire', 'safety', 'emergency', 'ambulance'],
      'Education': ['school', 'education', 'student', 'teacher'],
      'Town Governance': ['select board', 'town meeting', 'vote', 'article', 'warrant', 'bylaw', 'committee'],
    };

    queryList.forEach(q => {
      const text = q.query_text?.toLowerCase() || '';
      let categorized = false;
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
          categories[category]++;
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        categories['Other']++;
      }
    });

    const totalCategorized = Object.values(categories).reduce((a, b) => a + b, 0);
    const queryCategories = Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalCategorized > 0 ? Math.round(count / totalCategorized * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Peak hours
    const hourCounts: Record<number, number> = {};
    queryList.forEach(q => {
      const hour = new Date(q.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts[hour] || 0,
    }));

    // Daily volume
    const dayCounts: Record<string, number> = {};
    queryList.forEach(q => {
      const date = new Date(q.created_at).toISOString().split('T')[0];
      dayCounts[date] = (dayCounts[date] || 0) + 1;
    });

    const dailyVolume = Object.entries(dayCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get trending topics (compare to previous period)
    const prevStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const { data: prevQueries } = await supabaseAdmin
      .from('query_logs')
      .select('query_text')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDateStr);

    const prevQueryGroups: Record<string, number> = {};
    (prevQueries || []).forEach(q => {
      const normalized = q.query_text?.toLowerCase().trim() || '';
      if (normalized) {
        prevQueryGroups[normalized] = (prevQueryGroups[normalized] || 0) + 1;
      }
    });

    // Calculate topic trends
    const topTopics = topQueries.slice(0, 10).map(q => {
      const prevCount = prevQueryGroups[q.query] || 0;
      const changePercent = prevCount > 0
        ? Math.round((q.count - prevCount) / prevCount * 100)
        : (q.count > 0 ? 100 : 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (changePercent > 10) trend = 'up';
      else if (changePercent < -10) trend = 'down';

      return {
        topic: q.query,
        count: q.count,
        trend,
        changePercent,
      };
    });

    return {
      period: {
        start: startDateStr,
        end: endDateStr,
        label: periodLabel,
      },
      summary: {
        totalQueries: queryList.length,
        uniqueUsers,
        avgQueriesPerUser: uniqueUsers > 0 ? Math.round(queryList.length / uniqueUsers * 10) / 10 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: queryList.length > 0 ? Math.round(successfulQueries / queryList.length * 100) : 0,
      },
      topQueries,
      topTopics,
      queryCategories,
      peakHours,
      dailyVolume,
    };
  } catch (error) {
    logger.error({ err: error }, 'Exception while generating search insights report');
    return null;
  }
}

/**
 * Generate CSV export of search insights
 */
export function generateSearchInsightsCSV(report: SearchInsightsReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`Search Insights Report - ${report.period.label}`);
  lines.push(`Period: ${report.period.start.split('T')[0]} to ${report.period.end.split('T')[0]}`);
  lines.push('');

  // Summary
  lines.push('=== SUMMARY ===');
  lines.push(`Total Queries,${report.summary.totalQueries}`);
  lines.push(`Unique Users,${report.summary.uniqueUsers}`);
  lines.push(`Avg Queries per User,${report.summary.avgQueriesPerUser}`);
  lines.push(`Avg Response Time (ms),${report.summary.avgResponseTime}`);
  lines.push(`Success Rate,${report.summary.successRate}%`);
  lines.push('');

  // Top Queries
  lines.push('=== TOP QUERIES ===');
  lines.push('Query,Count,Avg Citations,Success Rate');
  report.topQueries.forEach(q => {
    lines.push(`"${q.query.replace(/"/g, '""')}",${q.count},${q.avgCitations},${q.successRate}%`);
  });
  lines.push('');

  // Query Categories
  lines.push('=== QUERY CATEGORIES ===');
  lines.push('Category,Count,Percentage');
  report.queryCategories.forEach(c => {
    lines.push(`${c.category},${c.count},${c.percentage}%`);
  });
  lines.push('');

  // Trending Topics
  lines.push('=== TRENDING TOPICS ===');
  lines.push('Topic,Count,Trend,Change %');
  report.topTopics.forEach(t => {
    lines.push(`"${t.topic.replace(/"/g, '""')}",${t.count},${t.trend},${t.changePercent}%`);
  });
  lines.push('');

  // Daily Volume
  lines.push('=== DAILY QUERY VOLUME ===');
  lines.push('Date,Query Count');
  report.dailyVolume.forEach(d => {
    lines.push(`${d.date},${d.count}`);
  });

  return lines.join('\n');
}
