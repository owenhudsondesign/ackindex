import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache suggested questions for 1 hour
let cachedQuestions: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

/**
 * Generate dynamic suggested questions based on recent content
 */
export async function GET() {
  try {
    // Check cache first
    if (cachedQuestions && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ questions: cachedQuestions, cached: true });
    }

    // Fetch recent documents (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentDocs, error } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .in('status', ['indexed', 'completed', 'processed'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error({ error }, 'Failed to fetch recent documents for suggestions');
      return NextResponse.json({ questions: getDefaultQuestions(), cached: false });
    }

    // Extract unique board/committee types from titles
    const boardTypes = new Map<string, { name: string; date: string }>();

    for (const doc of recentDocs || []) {
      const title = doc.title || '';

      // Extract board type and date from title like "Nantucket Select Board - November 19, 2025"
      const match = title.match(/^(?:Nantucket\s+)?(.+?)\s*[-–]\s*(.+)$/i);
      if (match) {
        const boardName = match[1].trim();
        const dateStr = match[2].trim();

        // Only keep the most recent meeting for each board
        if (!boardTypes.has(boardName)) {
          boardTypes.set(boardName, { name: boardName, date: dateStr });
        }
      }
    }

    // Generate questions based on actual content
    const questions: string[] = [];

    // Get the boards as an array sorted by most recent
    const boards = Array.from(boardTypes.values());

    // Question 1: Most recent meeting of top board
    if (boards.length > 0) {
      questions.push(`What decisions were made at the last ${boards[0].name} meeting?`);
    }

    // Question 2: Another board if available
    if (boards.length > 1) {
      questions.push(`What was discussed at the ${boards[1].name} on ${boards[1].date}?`);
    }

    // Question 3: Topic-based question about common subjects
    const topicQuestions = [
      'What are the latest updates on short-term rentals?',
      'Show me recent discussions about zoning changes',
      'What budget items were approved recently?',
      'Find recent public hearing comments',
    ];

    // Pick a topic question
    questions.push(topicQuestions[Math.floor(Date.now() / (1000 * 60 * 60)) % topicQuestions.length]);

    // Question 4: Personal relevance question
    if (boards.length > 0) {
      questions.push(`How do recent ${boards[0].name} decisions affect residents?`);
    } else {
      questions.push('What recent town decisions might affect homeowners?');
    }

    // Ensure we have at least 4 questions
    while (questions.length < 4) {
      const defaults = getDefaultQuestions();
      questions.push(defaults[questions.length]);
    }

    // Cache the results
    cachedQuestions = questions.slice(0, 4);
    cacheTimestamp = Date.now();

    logger.info({ questionCount: cachedQuestions.length, boardCount: boards.length }, 'Generated dynamic suggested questions');

    return NextResponse.json({ questions: cachedQuestions, cached: false });
  } catch (error) {
    logger.error({ error }, 'Error generating suggested questions');
    return NextResponse.json({ questions: getDefaultQuestions(), cached: false });
  }
}

/**
 * Default questions as fallback
 */
function getDefaultQuestions(): string[] {
  return [
    "What decisions were made at the last Select Board meeting?",
    "Show me recent Planning Board discussions about zoning",
    "What are the latest updates on town budget?",
    "How do recent board decisions affect residents?"
  ];
}
