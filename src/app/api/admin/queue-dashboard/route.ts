import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { scrapingQueue, embeddingQueue } from '@/lib/queues';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get job counts for both queues
    const [scrapingCounts, embeddingCounts] = await Promise.all([
      scrapingQueue.getJobCounts(),
      embeddingQueue.getJobCounts(),
    ]);

    // Get recent jobs
    const [scrapingActive, scrapingWaiting, scrapingCompleted, scrapingFailed] = await Promise.all([
      scrapingQueue.getActive(),
      scrapingQueue.getWaiting(),
      scrapingQueue.getCompleted(0, 9), // Get last 10 completed jobs
      scrapingQueue.getFailed(0, 9), // Get last 10 failed jobs
    ]);

    const [embeddingActive, embeddingWaiting, embeddingCompleted, embeddingFailed] = await Promise.all([
      embeddingQueue.getActive(),
      embeddingQueue.getWaiting(),
      embeddingQueue.getCompleted(0, 9),
      embeddingQueue.getFailed(0, 9),
    ]);

    return NextResponse.json({
      scraping: {
        counts: {
          waiting: scrapingCounts.waiting,
          active: scrapingCounts.active,
          completed: scrapingCounts.completed,
          failed: scrapingCounts.failed,
          delayed: scrapingCounts.delayed,
        },
        jobs: {
          active: scrapingActive.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            timestamp: job.timestamp,
          })),
          waiting: scrapingWaiting.slice(0, 10).map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            timestamp: job.timestamp,
          })),
          completed: scrapingCompleted.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            finishedOn: job.finishedOn,
            returnvalue: job.returnvalue,
          })),
          failed: scrapingFailed.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
          })),
        },
      },
      embedding: {
        counts: {
          waiting: embeddingCounts.waiting,
          active: embeddingCounts.active,
          completed: embeddingCounts.completed,
          failed: embeddingCounts.failed,
          delayed: embeddingCounts.delayed,
        },
        jobs: {
          active: embeddingActive.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            timestamp: job.timestamp,
          })),
          waiting: embeddingWaiting.slice(0, 10).map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            timestamp: job.timestamp,
          })),
          completed: embeddingCompleted.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            finishedOn: job.finishedOn,
            returnvalue: job.returnvalue,
          })),
          failed: embeddingFailed.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
          })),
        },
      },
    });
  } catch (error) {
    console.error('[Queue Dashboard] Error:', error);
    return NextResponse.json(
      { message: 'Failed to get queue stats', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
