/**
 * Cohere Reranker
 *
 * Reranks retrieved chunks using Cohere's rerank API for better relevance.
 * This significantly improves RAG quality by using a cross-encoder model
 * to score query-document pairs more accurately than embedding similarity alone.
 */

import { CohereClient } from 'cohere-ai';
import logger from './logger';
import { RetrievalResult } from './retrieval';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export interface RerankOptions {
  topN?: number;           // Number of results to return (default: 5)
  minRelevance?: number;   // Minimum relevance score 0-1 (default: 0.1)
}

/**
 * Rerank retrieved chunks using Cohere's rerank model
 *
 * @param query - The user's query
 * @param results - Retrieved chunks to rerank
 * @param options - Reranking options
 * @returns Reranked results sorted by relevance
 */
export async function rerankResults(
  query: string,
  results: RetrievalResult[],
  options: RerankOptions = {}
): Promise<RetrievalResult[]> {
  const { topN = 5, minRelevance = 0.1 } = options;

  if (!process.env.COHERE_API_KEY) {
    logger.warn('[Reranker] COHERE_API_KEY not set, skipping reranking');
    return results.slice(0, topN);
  }

  if (results.length === 0) {
    return [];
  }

  // If we have fewer results than requested, just return them all
  if (results.length <= topN) {
    logger.debug({ count: results.length }, '[Reranker] Fewer results than topN, skipping rerank');
    return results;
  }

  try {
    const documents = results.map(r => r.content);

    logger.info({
      query: query.slice(0, 100),
      docCount: documents.length,
      topN
    }, '[Reranker] Reranking documents');

    const response = await cohere.rerank({
      model: 'rerank-v3.5',
      query,
      documents,
      topN,
      returnDocuments: false, // We already have the documents
    });

    // Map reranked indices back to original results
    const rerankedResults: RetrievalResult[] = [];

    for (const result of response.results) {
      if (result.relevanceScore >= minRelevance) {
        const originalResult = results[result.index];
        rerankedResults.push({
          ...originalResult,
          similarity: result.relevanceScore, // Replace vector similarity with rerank score
          metadata: {
            ...originalResult.metadata,
            _originalSimilarity: originalResult.similarity,
            _rerankScore: result.relevanceScore,
          }
        });
      }
    }

    logger.info({
      inputCount: results.length,
      outputCount: rerankedResults.length,
      topScore: rerankedResults[0]?.similarity,
    }, '[Reranker] Reranking complete');

    return rerankedResults;
  } catch (error) {
    logger.error({ error }, '[Reranker] Reranking failed, falling back to original order');
    return results.slice(0, topN);
  }
}

/**
 * Check if reranking is available (API key is set)
 */
export function isRerankingAvailable(): boolean {
  return !!process.env.COHERE_API_KEY;
}
