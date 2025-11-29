import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import {
  getAdminAnalyticsOverview,
  getPopularQueries,
  getTrendingTopics,
  getUserAnalytics,
  getQueryVolumeByDay,
  getPeakUsageTimes,
  getMostViewedDocuments,
  getUsageByDayOfWeek,
  getSearchEffectivenessMetrics,
  getMostReadBlogs,
} from '@/lib/analytics';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/analytics' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    log.info({ adminId: adminOrError.id }, 'Admin fetching analytics');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '30');

    // Fetch different types of analytics based on query param
    let data;

    switch (type) {
      case 'overview':
        data = await getAdminAnalyticsOverview();
        break;

      case 'popular':
        data = await getPopularQueries(limit, days);
        break;

      case 'trending':
        data = await getTrendingTopics(limit);
        break;

      case 'users':
        data = await getUserAnalytics(limit);
        break;

      case 'volume':
        data = await getQueryVolumeByDay(days);
        break;

      case 'peak-times':
        data = await getPeakUsageTimes(days);
        break;

      case 'most-viewed':
        data = await getMostViewedDocuments(limit, days);
        break;

      case 'day-of-week':
        data = await getUsageByDayOfWeek(days);
        break;

      case 'effectiveness':
        data = await getSearchEffectivenessMetrics();
        break;

      case 'most-read-blogs':
        data = await getMostReadBlogs(limit);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    log.info({ type, dataPoints: Array.isArray(data) ? data.length : 1 }, 'Analytics data fetched');

    return NextResponse.json({
      success: true,
      type,
      data,
    });
  } catch (error) {
    log.error({ err: error }, 'Analytics endpoint error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
