import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache stats for 1 hour
let cachedStats: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get content statistics for the dashboard
 */
export async function GET() {
  try {
    // Check cache first
    if (cachedStats && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(cachedStats);
    }

    // Count total completed documents
    const { count: totalMeetings, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['indexed', 'completed', 'processed']);

    if (countError) {
      logger.error({ error: countError }, 'Failed to count documents');
    }

    // Get recent documents for board extraction
    const { data: recentDocs, error: docsError } = await supabase
      .from('documents')
      .select('title')
      .in('status', ['indexed', 'completed', 'processed'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (docsError) {
      logger.error({ error: docsError }, 'Failed to fetch recent documents');
    }

    // Extract unique board/commission names from titles
    const boardSet = new Set<string>();

    for (const doc of recentDocs || []) {
      const title = doc.title || '';

      // Extract board name from title like "Nantucket Select Board - November 19, 2025"
      const match = title.match(/^(?:Nantucket\s+)?(.+?)\s*[-–]\s*/i);
      if (match) {
        const boardName = match[1].trim();
        // Clean up common variations
        if (boardName && boardName.length > 3 && boardName.length < 50) {
          boardSet.add(boardName);
        }
      }
    }

    // Convert to array and sort
    const boardsCovered = Array.from(boardSet).sort();

    // Build response
    const stats = {
      totalMeetings: totalMeetings || 0,
      boardsCovered: boardsCovered.length > 0 ? boardsCovered : [
        'Select Board',
        'Planning Board',
        'Conservation Commission',
        'Historic District Commission',
        'Zoning Board of Appeals',
        'Board of Health'
      ],
    };

    // Cache the results
    cachedStats = stats;
    cacheTimestamp = Date.now();

    logger.info({ totalMeetings: stats.totalMeetings, boardCount: stats.boardsCovered.length }, 'Content stats generated');

    return NextResponse.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error generating content stats');

    // Return defaults on error
    return NextResponse.json({
      totalMeetings: 0,
      boardsCovered: [
        'Select Board',
        'Planning Board',
        'Conservation Commission',
        'Historic District Commission',
        'Zoning Board of Appeals',
        'Board of Health'
      ],
    });
  }
}
