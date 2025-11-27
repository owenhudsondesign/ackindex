import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { scrapingQueue, embeddingQueue } from '@/lib/queues';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const log = logger.child({ endpoint: '/api/admin/jobs/[jobId]' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Next.js 16: params is now a Promise
    const { jobId } = await params;

    // Check both queues for the job
    let job = await scrapingQueue.getJob(jobId);
    let queueName = 'scraping';

    if (!job) {
      job = await embeddingQueue.getJob(jobId);
      queueName = 'embedding';
    }

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return NextResponse.json({
      jobId: job.id,
      queue: queueName,
      name: job.name,
      state, // 'completed' | 'failed' | 'active' | 'waiting' | 'delayed'
      progress,
      data: job.data,
      returnValue,
      failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    });
  } catch (error) {
    log.error({ err: error }, 'Job status error');
    return NextResponse.json(
      { message: 'Failed to get job status', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
