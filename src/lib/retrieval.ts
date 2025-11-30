/**
 * Retrieval Utilities
 *
 * Semantic search and retrieval functions for RAG.
 * Finds relevant document chunks for user queries.
 */

import { supabaseAdmin } from './supabase';
import { generateEmbedding, generateQueryEmbedding } from './embeddings';
import { getCachedSearchQuery, setCachedSearchQuery } from './cache';
import logger from './logger';
import { expandQuery, detectBroadQuery, type QueryExpansionResult, type BroadQueryResult } from './queryExpansion';
import { analyzeQuery, needsMultiPassRetrieval, multiPassRetrieval, type QueryAnalysis } from './queryAnalysis';
import { rerankResults as cohereRerank, isRerankingAvailable } from './reranker';

export interface RetrievalResult {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, any>;
  similarity: number;
  document?: {
    id: string;
    title?: string;
    source_url?: string;
    filename?: string;
    source_type: 'url' | 'pdf';
  };
}

export interface RetrievalOptions {
  maxResults?: number;
  minSimilarity?: number;
  includeDocumentInfo?: boolean;
  searchMode?: 'semantic' | 'keyword' | 'hybrid' | 'recent';
  useReranker?: boolean; // Use Cohere reranker for better relevance (default: true if available)
}

/**
 * Patterns that indicate user wants recent/current information
 */
const RECENCY_PATTERNS = [
  /what('?s| is) (going on|happening)/i,
  /right now/i,
  /currently/i,
  /this (week|month)/i,
  /recent(ly)?/i,
  /latest/i,
  /last (few )?(meetings?|weeks?|months?)/i,
  /last\s+\w+\s+(board|committee|commission|meeting)/i, // "last Select Board", "last School Committee"
  /most recent/i,
  /new(est)? (updates?|news|developments?)/i,
  /what('?s| is) new/i,
  /any updates?/i,
  /current (events?|issues?|topics?)/i,
];

/**
 * Check if query is asking for recent/current information
 */
export function isRecencyQuery(query: string): boolean {
  return RECENCY_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Patterns that indicate user wants to explore/browse a topic across meetings
 * These are broad searches where user wants ALL mentions of a topic
 */
const TOPIC_EXPLORATION_PATTERNS = [
  /discussions?\s+(about|on|regarding)/i, // "discussions about X"
  /any\s+(time|instance|mention|discussion)/i, // "any time X was discussed"
  /(when|where)\s+(was|were|has|have)\s+.+\s+(discussed|mentioned|talked|brought up)/i,
  /return\s+(all\s+)?(relevant\s+)?(information|results|mentions)/i, // "return relevant information"
  /(find|show|list)\s+(all\s+)?(mentions?|discussions?|instances?)/i,
  /every\s+(time|instance|mention)/i, // "every time X was mentioned"
  /all\s+(discussions?|mentions?|references?)/i, // "all discussions about"
  /has\s+.+\s+been\s+(discussed|mentioned|addressed)/i, // "has X been discussed"
  /what\s+has\s+been\s+said\s+about/i, // "what has been said about"
  /times?\s+.+\s+(was|were)\s+(discussed|mentioned)/i, // "times X was discussed"
  // "What is X" style questions - these are exploratory, asking for general information about a topic
  /what\s+is\s+(the\s+)?(a\s+)?[\w\s]+(initiative|program|project|service|plan|effort|proposal)/i,
  /tell\s+me\s+about/i, // "tell me about X"
  /explain\s+(the\s+)?[\w\s]+(initiative|program|project|service|plan)/i,
  /what\s+do\s+you\s+know\s+about/i, // "what do you know about X"
  /information\s+(about|on|regarding)/i, // "information about X"
];

/**
 * Check if query is a topic exploration/browsing query
 * These need lower similarity thresholds to catch all relevant content
 */
export function isTopicExplorationQuery(query: string): boolean {
  return TOPIC_EXPLORATION_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Extended retrieval result with query analysis info
 */
export interface ExtendedRetrievalResult {
  results: RetrievalResult[];
  queryExpansion?: QueryExpansionResult;
  broadQueryAnalysis?: BroadQueryResult;
}

/**
 * Retrieve relevant chunks for a query using semantic search
 */
export async function retrieveRelevantChunks(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const {
    maxResults = 5,
    minSimilarity = 0.7,
    includeDocumentInfo = true,
    searchMode = 'semantic',
    useReranker = isRerankingAvailable(), // Default to true if API key is set
  } = options;

  // If using reranker, fetch more results initially for better candidate pool
  const fetchCount = useReranker ? Math.max(maxResults * 3, 15) : maxResults;

  logger.info({ query, mode: searchMode }, '[Retrieval] Searching');

  try {
    // Step 1: Expand query with synonyms and acronyms
    const queryExpansion = expandQuery(query);
    const searchQuery = queryExpansion.expansions.length > 0 ? queryExpansion.expandedQuery : query;

    if (queryExpansion.expansions.length > 0) {
      logger.info({
        original: query,
        expanded: searchQuery,
        expansions: queryExpansion.expansions,
      }, '[Retrieval] Query expanded with synonyms/acronyms');
    }

    // Step 2: Check for broad queries that may need recency constraint
    const broadAnalysis = detectBroadQuery(query);
    let effectiveQuery = searchQuery;

    if (broadAnalysis.isBroad && broadAnalysis.defaultConstraint === 'recent') {
      // Add recency hint to the query if it's broad
      effectiveQuery = `${searchQuery} recent`;
      logger.info({
        broadTerm: broadAnalysis.broadTerm,
        refinements: broadAnalysis.suggestedRefinements,
      }, '[Retrieval] Detected broad query, adding recency constraint');
    }

    // Step 3: Check if this is a recency query - if so, also fetch recent content
    const isRecent = isRecencyQuery(query) || (broadAnalysis.isBroad && broadAnalysis.defaultConstraint === 'recent');

    if (isRecent) {
      logger.info({ query }, '[Retrieval] Detected recency query, fetching recent content');

      // For recency queries, combine recent documents with semantic search
      // Pass the original query so fetchRecentContent can filter by meeting type
      const [recentResults, semanticResults] = await Promise.all([
        fetchRecentContent(fetchCount, query),
        searchMode === 'hybrid'
          ? hybridSearch(effectiveQuery, fetchCount, minSimilarity)
          : semanticSearch(effectiveQuery, fetchCount, minSimilarity, includeDocumentInfo, query)
      ]);

      // Merge results, prioritizing recent content for recency queries
      // but still including semantically relevant older content
      let merged = mergeRecentAndSemantic(recentResults, semanticResults, fetchCount);
      logger.info({ recentCount: recentResults.length, semanticCount: semanticResults.length, mergedCount: merged.length }, '[Retrieval] Merged recent and semantic results');

      // Apply reranking if enabled
      if (useReranker && merged.length > maxResults) {
        merged = await cohereRerank(query, merged, { topN: maxResults });
      }

      return merged.slice(0, maxResults);
    }

    // Step 4: Analyze query for compound/comparative patterns
    const queryAnalysis = analyzeQuery(query);

    // Use multi-pass retrieval for complex queries
    if (needsMultiPassRetrieval(queryAnalysis)) {
      logger.info({
        type: queryAnalysis.type,
        subQueries: queryAnalysis.subQueries,
      }, '[Retrieval] Using multi-pass retrieval for complex query');

      // Create a retrieval function that applies query expansion
      const retrieveWithExpansion = async (subQuery: string, subMaxResults: number) => {
        const expansion = expandQuery(subQuery);
        const expandedSubQuery = expansion.expansions.length > 0 ? expansion.expandedQuery : subQuery;

        if (searchMode === 'keyword') {
          return await keywordSearch(expandedSubQuery, subMaxResults);
        } else if (searchMode === 'hybrid') {
          return await hybridSearch(expandedSubQuery, subMaxResults, minSimilarity);
        } else {
          return await semanticSearch(expandedSubQuery, subMaxResults, minSimilarity, includeDocumentInfo, subQuery);
        }
      };

      return await multiPassRetrieval(queryAnalysis, retrieveWithExpansion, { maxResults });
    }

    // Standard single-pass retrieval with synonym boost
    // For queries with synonyms (like "language accessibility" → "Spanish, Portuguese"),
    // do an additional search with just the synonyms to catch content that uses different terminology
    if (searchMode === 'hybrid' && queryExpansion.expansions.length > 0) {
      // Build a focused synonym query using first 3 expansions
      // Testing shows 3 specific terms work better than 4+ (extra terms dilute the embedding)
      const synonymQuery = queryExpansion.expansions.slice(0, 3).join(' ');

      const [mainResults, synonymResults] = await Promise.all([
        hybridSearch(effectiveQuery, fetchCount, minSimilarity),
        hybridSearch(synonymQuery, Math.floor(fetchCount / 2), minSimilarity),
      ]);

      // Merge and deduplicate, prioritizing higher similarity scores
      const seenIds = new Set<string>();
      let mergedResults: RetrievalResult[] = [];

      // Add main results first
      for (const result of mainResults) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          mergedResults.push(result);
        }
      }

      // Add synonym results that weren't in main results
      for (const result of synonymResults) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          mergedResults.push(result);
        }
      }

      // Sort by similarity
      mergedResults = mergedResults.sort((a, b) => b.similarity - a.similarity);

      // Apply reranking if enabled
      if (useReranker && mergedResults.length > maxResults) {
        mergedResults = await cohereRerank(query, mergedResults, { topN: maxResults });
      }

      return mergedResults.slice(0, maxResults);
    }

    let results: RetrievalResult[];

    if (searchMode === 'keyword') {
      results = await keywordSearch(effectiveQuery, fetchCount);
    } else if (searchMode === 'hybrid') {
      results = await hybridSearch(effectiveQuery, fetchCount, minSimilarity);
    } else {
      // Pass original query for metadata boost to use correct entity matching
      results = await semanticSearch(effectiveQuery, fetchCount, minSimilarity, includeDocumentInfo, query);
    }

    // Apply Cohere reranking if enabled
    if (useReranker && results.length > maxResults) {
      logger.info({
        beforeCount: results.length,
        targetCount: maxResults
      }, '[Retrieval] Applying Cohere reranker');

      results = await cohereRerank(query, results, { topN: maxResults });
    }

    return results.slice(0, maxResults);
  } catch (error) {
    logger.error({ error, query }, '[Retrieval] Search failed');
    throw new Error('Failed to retrieve relevant content');
  }
}

/**
 * Extract meeting type keywords from query for targeted recency search
 */
function extractMeetingTypeFromQuery(query: string): string | null {
  const meetingTypes = [
    'select board',
    'school committee',
    'planning board',
    'zoning board',
    'conservation commission',
    'historic district commission',
    'board of health',
    'airport commission',
    'finance committee',
    'town meeting',
  ];

  const queryLower = query.toLowerCase();
  for (const meetingType of meetingTypes) {
    if (queryLower.includes(meetingType)) {
      return meetingType;
    }
  }
  return null;
}

/**
 * Fetch recent content by date (for recency queries)
 * If query mentions a specific meeting type, prioritize that type
 */
async function fetchRecentContent(maxResults: number, query?: string): Promise<RetrievalResult[]> {
  // Fetch chunks from the most recent documents (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Build the query
  let docQuery = supabaseAdmin
    .from('documents')
    .select('id, title, source_url, filename, source_type, created_at')
    .gte('created_at', ninetyDaysAgo.toISOString())
    .in('status', ['indexed', 'completed', 'processed'])
    .order('created_at', { ascending: false });

  // If query mentions a specific meeting type, filter for it
  const meetingType = query ? extractMeetingTypeFromQuery(query) : null;
  if (meetingType) {
    // Use ilike for case-insensitive partial match on title
    docQuery = docQuery.ilike('title', `%${meetingType}%`);
    logger.info({ meetingType }, '[Retrieval] Filtering recent content by meeting type');
  }

  const { data: recentDocs, error: docError } = await docQuery.limit(10);

  if (docError || !recentDocs || recentDocs.length === 0) {
    logger.debug({ error: docError, meetingType }, '[Retrieval] No recent documents found');
    return [];
  }

  logger.info({
    count: recentDocs.length,
    topDoc: recentDocs[0]?.title,
    meetingType
  }, '[Retrieval] Found recent documents');

  const docIds = recentDocs.map(d => d.id);

  // Get summary chunks from recent documents (prioritize summaries over raw transcripts)
  const { data: chunks, error: chunkError } = await supabaseAdmin
    .from('document_chunks')
    .select('id, document_id, content, chunk_index, metadata')
    .in('document_id', docIds)
    .order('chunk_index', { ascending: true })
    .limit(maxResults * 2);

  if (chunkError || !chunks) {
    logger.debug({ error: chunkError }, '[Retrieval] Failed to fetch recent chunks');
    return [];
  }

  // Create a map for document info
  const docMap = new Map(recentDocs.map(doc => [doc.id, doc]));

  // Convert to RetrievalResult format with high similarity score
  // (since these are explicitly requested recent content)
  return chunks.slice(0, maxResults).map((chunk, index) => ({
    id: chunk.id,
    document_id: chunk.document_id,
    content: chunk.content,
    chunk_index: chunk.chunk_index,
    metadata: chunk.metadata || {},
    similarity: 0.85 - (index * 0.01), // Give recent content good scores (0.85 down)
    document: docMap.get(chunk.document_id),
  }));
}

/**
 * Merge recent and semantic results, avoiding duplicates
 */
function mergeRecentAndSemantic(
  recent: RetrievalResult[],
  semantic: RetrievalResult[],
  maxResults: number
): RetrievalResult[] {
  const seen = new Set<string>();
  const merged: RetrievalResult[] = [];

  // Add recent results first (for recency queries, prioritize recent)
  for (const result of recent) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      merged.push(result);
    }
  }

  // Add semantic results that aren't duplicates
  for (const result of semantic) {
    if (!seen.has(result.id) && merged.length < maxResults) {
      seen.add(result.id);
      merged.push(result);
    }
  }

  // Sort by similarity (recent results already have good similarity scores)
  return merged.sort((a, b) => b.similarity - a.similarity).slice(0, maxResults);
}

/**
 * Semantic search using vector embeddings (with caching)
 */
async function semanticSearch(
  query: string,
  maxResults: number,
  minSimilarity: number,
  includeDocumentInfo: boolean,
  originalQuery?: string // Original query before expansion (for metadata boost)
): Promise<RetrievalResult[]> {
  // Try cache first - cache key includes params to ensure correct results
  const cacheKey = `${query}|${maxResults}|${minSimilarity}|${includeDocumentInfo}`;
  const cached = await getCachedSearchQuery(cacheKey);

  if (cached) {
    logger.debug({ query, cached: true }, '[Retrieval] Search cache hit');
    return cached as RetrievalResult[];
  }

  logger.debug({ query, cached: false }, '[Retrieval] Search cache miss');

  // Generate embedding for the query (may be expanded query)
  // Use generateQueryEmbedding for better retrieval performance with Voyage AI
  logger.info({ query }, '[Retrieval] Generating query embedding');
  const queryEmbedding = await generateQueryEmbedding(query);
  logger.debug({
    dimensions: queryEmbedding.length,
    preview: queryEmbedding.slice(0, 5)
  }, '[Retrieval] Query embedding generated');

  // Search using the database function
  // Pass embedding as array - Supabase will automatically cast to vector(1536) type
  logger.debug({
    threshold: minSimilarity,
    count: maxResults
  }, '[Retrieval] Calling search_similar_chunks');

  const { data, error } = await supabaseAdmin.rpc('search_similar_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: minSimilarity,
    match_count: maxResults,
  });

  if (error) {
    logger.error({ error }, '[Retrieval] Database search error');
    throw new Error('Database search failed');
  }

  logger.info({ count: data?.length || 0 }, '[Retrieval] Search results retrieved');

  if (data && data.length > 0) {
    logger.debug({
      topSimilarity: data[0].similarity,
      preview: data[0].content?.substring(0, 100)
    }, '[Retrieval] Top result');
  }

  // Optionally fetch document info
  let results = data || [];
  if (includeDocumentInfo && results.length > 0) {
    logger.debug('[Retrieval] Enriching with document info');
    results = await enrichWithDocumentInfo(results);

    // Apply metadata boost: boost results that match query entities in metadata
    // Uses original query (before expansion) for accurate entity matching
    const queryForMetadata = originalQuery || query;
    results = applyMetadataBoost(results, queryForMetadata);

    // Apply recency boost: newer documents get a slight similarity boost
    // This helps prioritize recent meetings over old reports
    results = applyRecencyBoost(results);

    // Apply chunk type boost: summary chunks get priority over transcript chunks
    // This ensures users see high-level summaries first, with transcript details available on request
    results = applyChunkTypeBoost(results);

    // Re-sort by boosted similarity
    results.sort((a: RetrievalResult, b: RetrievalResult) => b.similarity - a.similarity);
  }

  // Cache the results (24 hour TTL)
  await setCachedSearchQuery(cacheKey, results);

  return results;
}

/**
 * Keyword search using full-text search
 */
async function keywordSearch(
  query: string,
  maxResults: number
): Promise<RetrievalResult[]> {
  const { data, error } = await supabaseAdmin
    .from('document_chunks')
    .select(
      `
      id,
      document_id,
      content,
      chunk_index,
      metadata
    `
    )
    .textSearch('content', query, {
      type: 'websearch',
      config: 'english',
    })
    .limit(maxResults);

  if (error) {
    logger.error({ error }, '[Retrieval] Keyword search error');
    throw new Error('Keyword search failed');
  }

  // Add dummy similarity scores for consistency
  return (data || []).map((chunk, index) => ({
    ...chunk,
    similarity: 1 - index * 0.1, // Decreasing similarity
  }));
}

/**
 * Hybrid search combining semantic and keyword search
 */
async function hybridSearch(
  query: string,
  maxResults: number,
  minSimilarity: number
): Promise<RetrievalResult[]> {
  const queryEmbedding = await generateQueryEmbedding(query);

  // Pass embedding as array - Supabase will automatically cast to vector type
  const { data, error } = await supabaseAdmin.rpc('hybrid_search_chunks', {
    query_embedding: queryEmbedding,
    query_text: query,
    match_count: maxResults,
  });

  if (error) {
    logger.error({ error }, '[Retrieval] Hybrid search error');
    // Fallback to semantic search
    return await semanticSearch(query, maxResults, minSimilarity, true);
  }

  // CRITICAL: Enrich with document info - required for buildContext and extractCitations
  // Without this, results have no document.id and get filtered out
  let results = data || [];
  if (results.length > 0) {
    results = await enrichWithDocumentInfo(results);
  }

  return results;
}

/**
 * Enrich results with document information
 */
async function enrichWithDocumentInfo(
  results: RetrievalResult[]
): Promise<RetrievalResult[]> {
  const documentIds = [...new Set(results.map(r => r.document_id))];

  const { data: documents } = await supabaseAdmin
    .from('documents')
    .select('id, title, source_url, filename, source_type')
    .in('id', documentIds);

  if (!documents) return results;

  // Create a map for quick lookup
  const docMap = new Map(documents.map(doc => [doc.id, doc]));

  return results.map(result => ({
    ...result,
    document: docMap.get(result.document_id),
  }));
}

/**
 * Apply chunk type boost to search results
 * Summary chunks get boosted to appear first, transcript chunks for detailed quotes
 */
function applyChunkTypeBoost(results: RetrievalResult[]): RetrievalResult[] {
  return results.map(result => {
    const chunkType = result.metadata?.chunk_type;

    // Boost summary chunks by +10% to ensure they appear first
    if (chunkType === 'summary') {
      return {
        ...result,
        similarity: Math.min(1.0, result.similarity + 0.10),
      };
    }

    // Transcript chunks get no boost (available for specific quote searches)
    return result;
  });
}

/**
 * Apply recency boost to search results
 * Newer documents get a small similarity boost to prioritize recent content
 */
function applyRecencyBoost(results: RetrievalResult[]): RetrievalResult[] {
  const now = new Date();

  return results.map(result => {
    if (!result.document || !result.metadata) {
      return result;
    }

    // Extract date from document metadata
    const docDate = result.metadata?.published_at || result.metadata?.created_at;

    if (docDate) {
      const date = new Date(docDate);
      const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      // Apply boost:
      // - Last 30 days: +5% similarity boost
      // - Last 90 days: +3% similarity boost
      // - Last 180 days: +1% similarity boost
      // - Older: no boost
      let boost = 0;
      if (ageInDays <= 30) {
        boost = 0.05;
      } else if (ageInDays <= 90) {
        boost = 0.03;
      } else if (ageInDays <= 180) {
        boost = 0.01;
      }

      return {
        ...result,
        similarity: Math.min(1.0, result.similarity + boost), // Cap at 1.0
      };
    }

    return result;
  });
}

/**
 * Entity patterns for extracting specific entities from queries
 */
const ENTITY_PATTERNS = {
  // Warrant article references
  article: /\b(?:article|art\.?)\s*(\d+)/gi,
  // Proper names (capitalized sequences)
  properName: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
  // Street addresses
  address: /\b(\d+\s+[A-Z][a-z]+(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Way|Drive|Dr))?)\b/gi,
  // Dollar amounts
  dollar: /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|M|thousand|K))?/gi,
  // Dates
  date: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
};

/**
 * Extract entities from query for targeted matching
 */
function extractQueryEntities(query: string): {
  articles: string[];
  names: string[];
  addresses: string[];
  amounts: string[];
  dates: string[];
} {
  return {
    articles: (query.match(ENTITY_PATTERNS.article) || []).map(m => m.toLowerCase()),
    names: query.match(ENTITY_PATTERNS.properName) || [],
    addresses: query.match(ENTITY_PATTERNS.address) || [],
    amounts: query.match(ENTITY_PATTERNS.dollar) || [],
    dates: query.match(ENTITY_PATTERNS.date) || [],
  };
}

/**
 * Apply metadata-based boost to search results
 * This helps surface relevant content that may have lower semantic similarity
 * but contains exact entity matches in content or metadata
 *
 * Boost caps at +0.15 to prevent low-quality content from exceeding threshold
 */
function applyMetadataBoost(
  results: RetrievalResult[],
  query: string
): RetrievalResult[] {
  const entities = extractQueryEntities(query);
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  return results.map(result => {
    let boost = 0;
    const metadata = result.metadata || {};
    const content = result.content.toLowerCase();

    // Boost for article number matches (high confidence)
    for (const article of entities.articles) {
      if (content.includes(article)) {
        boost += 0.08; // Significant boost for exact article match
      }
    }

    // Boost for meeting_type match in metadata
    if (metadata.meeting_type) {
      const meetingType = String(metadata.meeting_type).toLowerCase();
      if (queryLower.includes(meetingType) ||
          meetingType.includes(queryTerms.find(t => meetingType.includes(t)) || '')) {
        boost += 0.05;
      }
    }

    // Boost for topic/keyword matches in metadata
    const topics = metadata.topics || metadata.categories || [];
    const keywords = metadata.keywords || [];

    for (const topic of [...topics, ...keywords]) {
      if (typeof topic === 'string' && queryLower.includes(topic.toLowerCase())) {
        boost += 0.03;
        break; // Only apply once
      }
    }

    // Boost for speaker name matches
    const speakers = metadata.attendees || metadata.speakers || [];
    for (const speaker of speakers) {
      if (typeof speaker === 'string') {
        for (const name of entities.names) {
          if (speaker.toLowerCase().includes(name.toLowerCase())) {
            boost += 0.05;
            break;
          }
        }
      }
    }

    // Boost for exact dollar amount matches (anti-hallucination friendly)
    for (const amount of entities.amounts) {
      const normalizedAmount = amount.toLowerCase().replace(/\s/g, '');
      if (content.includes(normalizedAmount)) {
        boost += 0.04;
        break;
      }
    }

    // Cap total metadata boost at 0.15 to prevent over-boosting
    boost = Math.min(boost, 0.15);

    if (boost > 0) {
      logger.debug({
        chunkId: result.id,
        originalSimilarity: result.similarity,
        boost,
        newSimilarity: Math.min(1.0, result.similarity + boost),
      }, '[Retrieval] Applied metadata boost');
    }

    return {
      ...result,
      similarity: Math.min(1.0, result.similarity + boost),
      metadata: {
        ...metadata,
        _metadataBoost: boost, // Track for debugging
      }
    };
  });
}

/**
 * Build context from retrieved chunks
 * Combines multiple chunks into a single context string for the LLM
 * IMPORTANT: Source numbering must match extractCitations to avoid referencing non-existent sources
 */
export function buildContext(results: RetrievalResult[], minSimilarity: number = 0.35): string {
  if (results.length === 0) {
    return 'No relevant information found.';
  }

  // Deduplicate by document ID and assign source numbers
  // This ensures source numbers in context match what's shown to the user
  const docToSourceNum = new Map<string, number>();
  let sourceCounter = 1;

  const contextParts = results.map((result) => {
    const docId = result.document?.id;
    if (!docId) return null;

    // Only include sources that meet quality threshold
    // Use the passed threshold (defaults to 0.35 for topic exploration)
    if (result.similarity < minSimilarity) {
      return null;
    }

    // Get or assign source number for this document
    let sourceNum = docToSourceNum.get(docId);
    if (!sourceNum) {
      sourceNum = sourceCounter++;
      docToSourceNum.set(docId, sourceNum);
    }

    const source = result.document?.title || result.document?.filename || 'Unknown source';
    return `[Source ${sourceNum}: ${source}]\n${result.content}\n`;
  }).filter(Boolean); // Remove null entries

  return contextParts.join('\n');
}

/**
 * Extract citations from results
 * Fetches blog post slugs to link citations to blog posts when available
 */
export async function extractCitations(results: RetrievalResult[]): Promise<Array<{
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
  similarity?: number;
  index?: number;
  startTime?: number;
  documentId?: string;
  blogPostSlug?: string;
}>> {
  // Deduplicate by document ID to avoid showing same source multiple times
  const seenDocuments = new Set<string>();
  const uniqueResults: RetrievalResult[] = [];

  for (const result of results) {
    const docId = result.document?.id;
    if (docId && !seenDocuments.has(docId)) {
      seenDocuments.add(docId);
      uniqueResults.push(result);
    }
  }

  // Only show sources above quality threshold
  // Voyage AI voyage-3-large typically returns 50-70% for relevant content
  // Minimum 30% similarity to match what we pass to the LLM context
  const qualitySources = uniqueResults.filter(r => r.similarity >= 0.30);

  // Show all quality sources - projects may span many relevant documents
  const topResults = qualitySources;

  // Fetch blog post slugs for all document IDs
  const docIds = topResults
    .map(r => r.document?.id)
    .filter((id): id is string => !!id);

  let blogPostMap = new Map<string, string>();

  if (docIds.length > 0) {
    try {
      const { data: blogPosts } = await supabaseAdmin
        .from('blog_posts')
        .select('document_id, slug')
        .in('document_id', docIds)
        .eq('status', 'published');

      if (blogPosts) {
        blogPostMap = new Map(blogPosts.map(bp => [bp.document_id, bp.slug]));
      }
    } catch (error) {
      logger.warn({ error }, '[Retrieval] Failed to fetch blog post slugs');
    }
  }

  return topResults.map((result, index) => {
    // Extract timestamp from chunk metadata (set by longVideoProcessor)
    let startTime = result.metadata?.start_time as number | undefined;

    // If no start_time in metadata, try to parse from content
    // Content may have timestamps like [12:34] or [1:23:45] at the beginning
    if (startTime === undefined && result.content) {
      const timestampMatch = result.content.match(/\[(\d+):(\d+)(?::(\d+))?\]/);
      if (timestampMatch) {
        const hours = timestampMatch[3] ? parseInt(timestampMatch[1], 10) : 0;
        const minutes = timestampMatch[3] ? parseInt(timestampMatch[2], 10) : parseInt(timestampMatch[1], 10);
        const seconds = timestampMatch[3] ? parseInt(timestampMatch[3], 10) : parseInt(timestampMatch[2], 10);
        startTime = hours * 3600 + minutes * 60 + seconds;
      }
    }

    const documentId = result.document?.id;
    const blogPostSlug = documentId ? blogPostMap.get(documentId) : undefined;

    return {
      title: result.document?.title || result.document?.filename || 'Untitled',
      url: result.document?.source_url,
      snippet: result.content.slice(0, 200),
      source: result.document?.source_type || 'unknown',
      similarity: Math.round(result.similarity * 100),
      index: index + 1,
      startTime, // Video timestamp in seconds
      documentId, // For linking to blog posts with video
      blogPostSlug, // Slug for /blog/{slug} page
    };
  });
}

/**
 * Check if results are relevant enough to answer the query
 * Improved logic: Accept if we have multiple good results, not just a single top result
 *
 * Voyage AI voyage-3-large typically returns 50-70% for relevant content, 30-40% for irrelevant.
 * Default threshold of 0.50 is calibrated based on testing.
 */
export function hasRelevantResults(
  results: RetrievalResult[],
  minSimilarity: number = 0.50
): boolean {
  if (results.length === 0) return false;

  // Strategy: Accept if we have strong evidence across multiple results
  // This prevents false negatives when relevant content scores slightly below threshold

  // Option A: Top result is very strong (high confidence)
  if (results[0].similarity >= minSimilarity) {
    return true;
  }

  // Option B: Multiple good results (medium confidence)
  // If we have 2+ results above a slightly lower threshold, that's still relevant
  const slightlyLowerThreshold = minSimilarity - 0.05; // e.g., 0.50 -> 0.45
  const goodResults = results.filter(r => r.similarity >= slightlyLowerThreshold);

  return goodResults.length >= 2;
}

/**
 * Deduplicate results based on content similarity
 */
export function deduplicateResults(
  results: RetrievalResult[],
  similarityThreshold: number = 0.95
): RetrievalResult[] {
  const unique: RetrievalResult[] = [];

  for (const result of results) {
    const isDuplicate = unique.some(existing => {
      // Simple content comparison (you could use embeddings for better accuracy)
      const similarity = stringSimilarity(existing.content, result.content);
      return similarity > similarityThreshold;
    });

    if (!isDuplicate) {
      unique.push(result);
    }
  }

  return unique;
}

/**
 * Simple string similarity (Jaccard similarity)
 */
function stringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Re-rank results based on additional criteria
 */
export function rerankResults(
  results: RetrievalResult[],
  query: string
): RetrievalResult[] {
  return results
    .map(result => {
      let score = result.similarity;

      // Boost if query terms appear in metadata title
      const title = result.document?.title?.toLowerCase() || '';
      const queryTerms = query.toLowerCase().split(/\s+/);
      const titleBoost = queryTerms.some(term => title.includes(term)) ? 0.1 : 0;

      // Boost if content is from a specific source type (optional)
      const sourceBoost = result.document?.source_type === 'pdf' ? 0.05 : 0;

      return {
        ...result,
        similarity: Math.min(1, score + titleBoost + sourceBoost),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get statistics about retrieval quality
 */
export function getRetrievalStats(results: RetrievalResult[]): {
  count: number;
  avgSimilarity: number;
  maxSimilarity: number;
  minSimilarity: number;
  sources: number;
} {
  if (results.length === 0) {
    return {
      count: 0,
      avgSimilarity: 0,
      maxSimilarity: 0,
      minSimilarity: 0,
      sources: 0,
    };
  }

  const similarities = results.map(r => r.similarity);
  const uniqueSources = new Set(results.map(r => r.document_id));

  return {
    count: results.length,
    avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
    maxSimilarity: Math.max(...similarities),
    minSimilarity: Math.min(...similarities),
    sources: uniqueSources.size,
  };
}
