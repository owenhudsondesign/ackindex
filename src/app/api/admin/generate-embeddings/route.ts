import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { getChunksWithoutEmbeddings, getEmbeddingStats } from '@/lib/database';
import { estimateEmbeddingCost } from '@/lib/embeddings';
import { embeddingQueue } from '@/lib/queues';

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
    const { batchSize = 50 } = body;

    console.log('[Generate Embeddings] Starting embedding generation...');

    // Get chunks without embeddings
    const chunks = await getChunksWithoutEmbeddings(batchSize);

    if (chunks.length === 0) {
      const stats = await getEmbeddingStats();
      return NextResponse.json({
        message: 'All chunks already have embeddings',
        stats,
      });
    }

    console.log(`[Generate Embeddings] Found ${chunks.length} chunks without embeddings`);

    // Estimate cost
    const costEstimate = estimateEmbeddingCost(chunks.map(c => c.content));
    console.log(
      `[Generate Embeddings] Estimated cost: $${costEstimate.estimatedCost} for ${costEstimate.estimatedTokens} tokens`
    );

    // Add job to queue
    const job = await embeddingQueue.add(
      'generate-embeddings',
      {
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
        })),
      },
      {
        priority: 5, // Normal priority
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );

    console.log(`[Generate Embeddings] Queued embedding job ${job.id} for ${chunks.length} chunks`);

    // Get current stats
    const stats = await getEmbeddingStats();

    return NextResponse.json({
      message: `Queued embedding generation for ${chunks.length} chunks`,
      jobId: job.id,
      chunkCount: chunks.length,
      stats,
      cost: costEstimate,
    });
  } catch (error) {
    console.error('[Generate Embeddings] Error:', error);
    return NextResponse.json(
      { message: 'Failed to generate embeddings', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get embedding stats
    const stats = await getEmbeddingStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[Generate Embeddings] Error getting stats:', error);
    return NextResponse.json(
      { message: 'Failed to get embedding stats' },
      { status: 500 }
    );
  }
}
