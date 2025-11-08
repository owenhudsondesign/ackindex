import { NextRequest, NextResponse } from 'next/server';
import { scrapingQueue } from '@/lib/queues';
import { createAdminSupabaseClient } from '@/lib/auth/admin-helpers';
import { requireAdminApi } from '@/lib/auth/require-admin';
import logger from '@/lib/logger';

/**
 * GET /api/admin/job-status
 * Check the status of a BullMQ job
 */
export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/job-status/GET' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get job ID from query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    // Get job from queue
    const job = await scrapingQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get job state and details
    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    // Map BullMQ states to our status
    let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued';
    if (state === 'completed') status = 'completed';
    else if (state === 'failed') status = 'failed';
    else if (state === 'active') status = 'processing';

    return NextResponse.json(
      {
        jobId,
        status,
        state,
        progress,
        documentId: returnValue?.documentId,
        error: failedReason,
        createdAt: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error({ error }, 'Failed to get job status');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
