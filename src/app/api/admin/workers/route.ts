import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { scrapingWorker, embeddingWorker } from '@/lib/workers';

/**
 * GET endpoint to check worker status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    return NextResponse.json({
      message: 'Workers status',
      workers: {
        scraping: {
          isRunning: scrapingWorker.isRunning(),
          isPaused: scrapingWorker.isPaused(),
          isClosed: !scrapingWorker.isRunning(),
        },
        embedding: {
          isRunning: embeddingWorker.isRunning(),
          isPaused: embeddingWorker.isPaused(),
          isClosed: !embeddingWorker.isRunning(),
        },
      },
    });
  } catch (error) {
    console.error('[Workers] Error getting status:', error);
    return NextResponse.json(
      { message: 'Failed to get worker status', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to pause/resume workers
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const { action, worker } = body; // action: 'pause' | 'resume', worker: 'scraping' | 'embedding' | 'all'

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action. Must be "pause" or "resume"' },
        { status: 400 }
      );
    }

    const results: any = {};

    if (worker === 'scraping' || worker === 'all') {
      if (action === 'pause') {
        await scrapingWorker.pause();
        results.scraping = 'paused';
      } else {
        await scrapingWorker.resume();
        results.scraping = 'resumed';
      }
    }

    if (worker === 'embedding' || worker === 'all') {
      if (action === 'pause') {
        await embeddingWorker.pause();
        results.embedding = 'paused';
      } else {
        await embeddingWorker.resume();
        results.embedding = 'resumed';
      }
    }

    return NextResponse.json({
      message: `Workers ${action}d successfully`,
      results,
    });
  } catch (error) {
    console.error('[Workers] Error controlling workers:', error);
    return NextResponse.json(
      { message: 'Failed to control workers', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
