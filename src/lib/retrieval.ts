/**
 * Retrieval Utilities
 *
 * Semantic search and retrieval functions for RAG.
 * Finds relevant document chunks for user queries.
 */

import { supabaseAdmin } from './supabase';
import { generateEmbedding } from './embeddings';
import { getCachedSearchQuery, setCachedSearchQuery } from './cache';
import logger from './logger';

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
  searchMode?: 'semantic' | 'keyword' | 'hybrid';
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
  } = options;

  logger.info({ query, mode: searchMode }, '[Retrieval] Searching');

  try {
    if (searchMode === 'keyword') {
      return await keywordSearch(query, maxResults);
    } else if (searchMode === 'hybrid') {
      return await hybridSearch(query, maxResults, minSimilarity);
    } else {
      return await semanticSearch(query, maxResults, minSimilarity, includeDocumentInfo);
    }
  } catch (error) {
    logger.error({ error, query }, '[Retrieval] Search failed');
    throw new Error('Failed to retrieve relevant content');
  }
}

/**
 * Semantic search using vector embeddings (with caching)
 */
async function semanticSearch(
  query: string,
  maxResults: number,
  minSimilarity: number,
  includeDocumentInfo: boolean
): Promise<RetrievalResult[]> {
  // Try cache first - cache key includes params to ensure correct results
  const cacheKey = `${query}|${maxResults}|${minSimilarity}|${includeDocumentInfo}`;
  const cached = await getCachedSearchQuery(cacheKey);

  if (cached) {
    logger.debug({ query, cached: true }, '[Retrieval] Search cache hit');
    return cached as RetrievalResult[];
  }

  logger.debug({ query, cached: false }, '[Retrieval] Search cache miss');

  // Generate embedding for the query
  logger.info({ query }, '[Retrieval] Generating query embedding');
  const queryEmbedding = await generateEmbedding(query);
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

    // Apply recency boost: newer documents get a slight similarity boost
    // This helps prioritize recent meetings over old reports
    results = applyRecencyBoost(results);

    // Apply chunk type boost: summary chunks get priority over transcript chunks
    // This ensures users see high-level summaries first, with transcript details available on request
    results = applyChunkTypeBoost(results);

    // Re-sort by boosted similarity
    results.sort((a, b) => b.similarity - a.similarity);
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
  const queryEmbedding = await generateEmbedding(query);

  // Pass embedding as array - Supabase will automatically cast to vector(1536) type
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

  return data || [];
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
 * Build context from retrieved chunks
 * Combines multiple chunks into a single context string for the LLM
 */
export function buildContext(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return 'No relevant information found.';
  }

  return results
    .map((result, index) => {
      const source = result.document?.title || result.document?.filename || 'Unknown source';
      return `[Source ${index + 1}: ${source}]\n${result.content}\n`;
    })
    .join('\n');
}

/**
 * Extract citations from results
 */
export function extractCitations(results: RetrievalResult[]): Array<{
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
  similarity?: number;
  index?: number;
}> {
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

  // Only return top 3 most relevant sources
  const topResults = uniqueResults.slice(0, 3);

  return topResults.map((result, index) => ({
    title: result.document?.title || result.document?.filename || 'Untitled',
    url: result.document?.source_url,
    snippet: result.content.slice(0, 200), // Increased snippet length
    source: result.document?.source_type || 'unknown',
    similarity: Math.round(result.similarity * 100), // Convert to percentage
    index: index + 1,
  }));
}

/**
 * Check if results are relevant enough to answer the query
 */
export function hasRelevantResults(
  results: RetrievalResult[],
  minSimilarity: number = 0.75
): boolean {
  if (results.length === 0) return false;

  // Check if the top result meets the threshold
  return results[0].similarity >= minSimilarity;
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
