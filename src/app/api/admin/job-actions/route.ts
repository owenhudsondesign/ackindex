/**
 * Job Actions API
 *
 * Provides endpoints for performing actions on jobs in the queues.
 * Protected by admin authentication.
 *
 * POST /api/admin/job-actions
 * Body: { action: 'retry' | 'remove', queue: 'scraping' | 'embedding', jobId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { scrapingQueue, embeddingQueue } from '@/lib/queues';
import logger from '@/lib/logger';

/**
 * POST /api/admin/job-actions
 * Perform actions on jobs (retry, remove)
 */
export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/job-actions' });

  try {
    // SECURITY: Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) {
      return adminOrError;
    }

    const body = await request.json();
    const { action, queue: queueName, jobId } = body;

    // Validate input
    if (!action || !queueName || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, queue, jobId' },
        { status: 400 }
      );
    }

    if (queueName !== 'scraping' && queueName !== 'embedding') {
      return NextResponse.json(
        { error: 'Invalid queue name. Must be: scraping or embedding' },
        { status: 400 }
      );
    }

    if (!['retry', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported: retry, remove' },
        { status: 400 }
      );
    }

    const queue = queueName === 'scraping' ? scrapingQueue : embeddingQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Perform action
    switch (action) {
      case 'retry':
        await job.retry();
        log.info({ jobId, adminEmail: adminOrError.email }, 'Job retried by admin');
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} has been queued for retry`,
          jobId,
          queue: queueName,
        });

      case 'remove':
        await job.remove();
        log.info({ jobId, adminEmail: adminOrError.email }, 'Job removed by admin');
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} has been removed`,
          jobId,
          queue: queueName,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    log.error({ err: error }, 'Job actions error');
    return NextResponse.json(
      {
        message: 'Failed to perform action',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
