/**
 * Analytics Export API
 * GET /api/admin/analytics/export - Export search insights report as CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { getSearchInsightsReport, generateSearchInsightsCSV } from '@/lib/analytics';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/analytics/export' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    log.info({ adminId: adminOrError.id }, 'Admin exporting analytics');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'week') as 'week' | 'month' | 'quarter' | 'year';
    const format = searchParams.get('format') || 'csv';

    // Generate the report
    const report = await getSearchInsightsReport(period);

    if (!report) {
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      );
    }

    // Return based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        report,
      });
    }

    // Default to CSV
    const csv = generateSearchInsightsCSV(report);
    const filename = `ackindex-search-insights-${period}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Analytics export error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
