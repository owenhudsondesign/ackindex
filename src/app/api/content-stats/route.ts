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
    const boardCounts = new Map<string, number>();

    // Main boards we want to highlight (normalized names)
    const mainBoards = [
      'Select Board',
      'Planning Board',
      'Conservation Commission',
      'Historic District Commission',
      'Zoning Board of Appeals',
      'Board of Health',
      'School Committee',
      'Finance Committee',
      'Airport Commission',
    ];

    for (const doc of recentDocs || []) {
      const title = doc.title || '';

      // Extract board name from title like "Nantucket Select Board - November 19, 2025"
      const match = title.match(/^(?:Nantucket\s+)?(.+?)\s*[-–]\s*/i);
      if (match) {
        let boardName = match[1].trim();

        // Skip truncated or invalid names
        if (!boardName || boardName.length < 5 || boardName.length > 40) continue;

        // Normalize common variations
        if (boardName.includes('Select Board')) boardName = 'Select Board';
        if (boardName.includes('Planning Board') && !boardName.includes('Economic')) boardName = 'Planning Board';
        if (boardName.includes('Conservation')) boardName = 'Conservation Commission';
        if (boardName.includes('Historic District')) boardName = 'Historic District Commission';
        if (boardName.includes('Zoning Board')) boardName = 'Zoning Board of Appeals';
        if (boardName.includes('Board of Health')) boardName = 'Board of Health';
        if (boardName.includes('School Committee')) boardName = 'School Committee';
        if (boardName.includes('Finance Committee')) boardName = 'Finance Committee';
        if (boardName.includes('Airport')) boardName = 'Airport Commission';

        // Count occurrences
        boardCounts.set(boardName, (boardCounts.get(boardName) || 0) + 1);
      }
    }

    // Sort by count and take top boards, prioritizing main boards
    const sortedBoards = Array.from(boardCounts.entries())
      .sort((a, b) => {
        // Prioritize main boards
        const aIsMain = mainBoards.includes(a[0]) ? 1 : 0;
        const bIsMain = mainBoards.includes(b[0]) ? 1 : 0;
        if (aIsMain !== bIsMain) return bIsMain - aIsMain;
        // Then sort by count
        return b[1] - a[1];
      })
      .slice(0, 8)
      .map(([name]) => name);

    const boardsCovered = sortedBoards.length > 0 ? sortedBoards : mainBoards.slice(0, 6);

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
