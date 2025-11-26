/**
 * Query Analysis and Decomposition
 *
 * Analyzes query intent and decomposes compound/comparative queries
 * for multi-pass retrieval. This improves recall for complex queries
 * that span multiple topics or require temporal comparison.
 */

import logger from './logger';
import type { RetrievalResult } from './retrieval';

// =============================================================================
// QUERY TYPE DEFINITIONS
// =============================================================================

export type QueryType =
  | 'simple'           // Single topic query
  | 'comparative'      // "How has X changed over time?"
  | 'compound'         // "X and Y" or "both X and Y"
  | 'temporal'         // "between 2023 and 2024"
  | 'negation';        // "excluding X" or "not Y" (detected but not decomposed)

export interface QueryAnalysis {
  type: QueryType;
  subQueries: string[];
  temporalRange?: { start?: string; end?: string };
  excludeTerms?: string[];
  isComplex: boolean;
}

// =============================================================================
// QUERY PATTERN DETECTION
// =============================================================================

const COMPARATIVE_PATTERNS = [
  /how\s+has\s+(.+)\s+changed/i,
  /difference\s+between\s+(.+)\s+and\s+(.+)/i,
  /compare\s+(.+)\s+(?:to|with|and)\s+(.+)/i,
  /evolution\s+of\s+(.+)/i,
  /history\s+of\s+(.+)/i,
  /over\s+(?:the\s+)?(?:past\s+)?(?:years?|months?|time)/i,
  /progression\s+of\s+(.+)/i,
  /changes?\s+(?:to|in)\s+(.+)\s+(?:over|since|from)/i,
];

const COMPOUND_PATTERNS = [
  /(.+)\s+(?:and|as well as|along with|plus)\s+(.+)/i,
  /both\s+(.+)\s+and\s+(.+)/i,
  /(.+),\s*(.+),?\s+and\s+(.+)/i,  // "X, Y, and Z"
  /(.+)\s+(?:or|versus|vs\.?)\s+(.+)/i,
];

const TEMPORAL_PATTERNS = [
  { pattern: /(?:in|during|from)\s+(\d{4})/i, groups: ['start'] },
  { pattern: /between\s+(\d{4})\s+and\s+(\d{4})/i, groups: ['start', 'end'] },
  { pattern: /(?:since|after)\s+(\d{4})/i, groups: ['start'] },
  { pattern: /(\d{4})\s+(?:to|through|-)\s+(\d{4})/i, groups: ['start', 'end'] },
  { pattern: /(?:before|until|up to)\s+(\d{4})/i, groups: ['end'] },
];

const NEGATION_PATTERNS = [
  /(?:not|excluding|except|without)\s+(.+)/i,
  /(?:wasn't|weren't|was not|were not)\s+approved/i,
  /(?:failed|rejected|denied|defeated)/i,
];

// =============================================================================
// QUERY ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze query to determine type and decomposition strategy
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const result: QueryAnalysis = {
    type: 'simple',
    subQueries: [query],
    isComplex: false,
  };

  // Check for comparative queries (highest priority)
  for (const pattern of COMPARATIVE_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      result.type = 'comparative';
      result.isComplex = true;

      // Extract the topic being compared over time
      const topic = match[1]?.trim();
      if (topic && topic.length > 2) {
        // Create sub-queries for different time perspectives
        result.subQueries = [
          `${topic} recent`,
          `${topic} previous years`,
          `${topic} history timeline`,
        ];
      } else {
        // Generic comparative - search for historical content
        result.subQueries = [
          query,
          `${query} history`,
          `${query} changes`,
        ];
      }

      logger.debug({ query, type: 'comparative', subQueries: result.subQueries }, '[QueryAnalysis] Comparative query detected');
      return result;
    }
  }

  // Check for temporal ranges
  for (const { pattern, groups } of TEMPORAL_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      result.type = 'temporal';
      result.isComplex = true;
      result.temporalRange = {};

      groups.forEach((group, idx) => {
        if (match[idx + 1]) {
          if (group === 'start') {
            result.temporalRange!.start = match[idx + 1];
          } else if (group === 'end') {
            result.temporalRange!.end = match[idx + 1];
          }
        }
      });

      // Create sub-queries for different years in range
      if (result.temporalRange.start && result.temporalRange.end) {
        const startYear = parseInt(result.temporalRange.start);
        const endYear = parseInt(result.temporalRange.end);
        result.subQueries = [];

        for (let year = startYear; year <= endYear; year++) {
          result.subQueries.push(`${query.replace(pattern, '')} ${year}`.trim());
        }

        // Limit to 3 sub-queries to avoid over-fetching
        result.subQueries = result.subQueries.slice(0, 3);
      }

      logger.debug({ query, type: 'temporal', range: result.temporalRange }, '[QueryAnalysis] Temporal query detected');
      return result;
    }
  }

  // Check for compound queries (X and Y)
  for (const pattern of COMPOUND_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      // Extract individual topics (filter out empty matches and common words)
      const topics = match.slice(1)
        .filter(m => m && m.trim().length > 2)
        .map(m => m.trim())
        .filter(m => !['the', 'a', 'an', 'of', 'for', 'to'].includes(m.toLowerCase()));

      // Only treat as compound if we have 2+ distinct topics
      if (topics.length >= 2) {
        result.type = 'compound';
        result.isComplex = true;
        result.subQueries = topics.map(topic => topic.trim());

        logger.debug({ query, type: 'compound', subQueries: result.subQueries }, '[QueryAnalysis] Compound query detected');
        return result;
      }
    }
  }

  // Check for negation (mark but don't decompose - handle differently)
  for (const pattern of NEGATION_PATTERNS) {
    if (pattern.test(query)) {
      result.type = 'negation';
      // Don't decompose negation queries - they need special handling in response
      const excludeMatch = query.match(/(?:not|excluding|except)\s+(.+)/i);
      if (excludeMatch) {
        result.excludeTerms = [excludeMatch[1].trim()];
      }

      logger.debug({ query, type: 'negation', excludeTerms: result.excludeTerms }, '[QueryAnalysis] Negation query detected');
      return result;
    }
  }

  return result;
}

/**
 * Check if query analysis indicates complex query needing multi-pass
 */
export function needsMultiPassRetrieval(analysis: QueryAnalysis): boolean {
  return analysis.isComplex && analysis.subQueries.length > 1;
}

// =============================================================================
// MULTI-PASS RETRIEVAL
// =============================================================================

/**
 * Execute multi-pass retrieval for complex queries
 * Runs sub-queries in parallel and merges results with diversity
 */
export async function multiPassRetrieval(
  analysis: QueryAnalysis,
  retrieveFn: (query: string, maxResults: number) => Promise<RetrievalResult[]>,
  options: { maxResults: number }
): Promise<RetrievalResult[]> {
  const { maxResults } = options;

  // Simple queries don't need multi-pass
  if (!analysis.isComplex || analysis.subQueries.length <= 1) {
    return retrieveFn(analysis.subQueries[0], maxResults);
  }

  logger.info({
    type: analysis.type,
    subQueryCount: analysis.subQueries.length,
  }, '[QueryAnalysis] Starting multi-pass retrieval');

  // Calculate results per sub-query
  const resultsPerQuery = Math.ceil(maxResults / analysis.subQueries.length);

  // Execute sub-queries in parallel
  const allResults = await Promise.all(
    analysis.subQueries.map(sq => retrieveFn(sq, resultsPerQuery))
  );

  // Merge and deduplicate results
  const seen = new Set<string>();
  const merged: RetrievalResult[] = [];

  // Interleave results to maintain topic diversity
  // This ensures we get results from all sub-queries, not just the first
  const maxLen = Math.max(...allResults.map(r => r.length));

  for (let i = 0; i < maxLen; i++) {
    for (let j = 0; j < allResults.length; j++) {
      const results = allResults[j];
      if (i < results.length) {
        const result = results[i];
        if (!seen.has(result.id)) {
          seen.add(result.id);
          merged.push({
            ...result,
            metadata: {
              ...result.metadata,
              _subQuery: analysis.subQueries[j], // Track which sub-query found this
            },
          });
        }
      }
    }
  }

  // Sort by similarity and return top results
  const finalResults = merged
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  logger.info({
    totalFromSubQueries: allResults.reduce((sum, r) => sum + r.length, 0),
    afterDedup: merged.length,
    finalCount: finalResults.length,
  }, '[QueryAnalysis] Multi-pass retrieval complete');

  return finalResults;
}

// =============================================================================
// RESULT AGGREGATION FOR COMPARATIVE QUERIES
// =============================================================================

/**
 * Group results by time period for comparative queries
 * Useful for presenting "how has X changed" answers
 */
export function groupResultsByTimePeriod(
  results: RetrievalResult[]
): Map<string, RetrievalResult[]> {
  const grouped = new Map<string, RetrievalResult[]>();

  for (const result of results) {
    const date = result.metadata?.published_at || result.metadata?.created_at;
    if (date) {
      const year = new Date(date).getFullYear().toString();
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year)!.push(result);
    } else {
      // Results without date go to "unknown"
      if (!grouped.has('unknown')) {
        grouped.set('unknown', []);
      }
      grouped.get('unknown')!.push(result);
    }
  }

  return grouped;
}

/**
 * Get time-ordered summary of results for comparative response
 */
export function getComparativeContext(
  results: RetrievalResult[],
  analysis: QueryAnalysis
): string {
  if (analysis.type !== 'comparative' && analysis.type !== 'temporal') {
    return '';
  }

  const grouped = groupResultsByTimePeriod(results);
  const years = Array.from(grouped.keys())
    .filter(y => y !== 'unknown')
    .sort();

  if (years.length <= 1) {
    return '';
  }

  const parts: string[] = ['\n\n--- Timeline Context ---'];

  for (const year of years) {
    const yearResults = grouped.get(year) || [];
    if (yearResults.length > 0) {
      parts.push(`\n[${year}]: ${yearResults.length} relevant document(s)`);
    }
  }

  parts.push('\nNote: Results span multiple time periods for comparison.');

  return parts.join('');
}
