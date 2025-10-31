import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { getChunksWithoutEmbeddings, updateChunkEmbedding, getEmbeddingStats } from '@/lib/database';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from '@/lib/embeddings';

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

    // Generate embeddings in batch
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddingsBatch(texts);

    // Update database
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        await updateChunkEmbedding(chunks[i].id, embeddings[i]);
        successCount++;
      } catch (error) {
        console.error(`[Generate Embeddings] Failed to update chunk ${chunks[i].id}:`, error);
        failCount++;
      }
    }

    console.log(
      `[Generate Embeddings] Completed: ${successCount} successful, ${failCount} failed`
    );

    // Get updated stats
    const stats = await getEmbeddingStats();

    return NextResponse.json({
      message: `Successfully generated embeddings for ${successCount} chunks`,
      processed: successCount,
      failed: failCount,
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
    // Check authentication
    const supabase = await getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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
