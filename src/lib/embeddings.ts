/**
 * Embeddings Utilities
 *
 * Generate vector embeddings for text chunks using Voyage AI
 * for semantic search and retrieval.
 *
 * Voyage AI is Anthropic's recommended embedding provider and
 * outperforms OpenAI's text-embedding-3-large by ~10% on benchmarks.
 */

import { VoyageAIClient } from 'voyageai';

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

// Voyage AI voyage-3-large produces 1024-dimensional vectors by default
// Can also use 256, 512, or 2048 dimensions with Matryoshka support
export const EMBEDDING_DIMENSIONS = 1024;
export const EMBEDDING_MODEL = 'voyage-3-large';

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean and truncate text if necessary (Voyage supports up to 32K tokens)
    const cleanText = text.trim().slice(0, 120000); // ~32k tokens

    const response = await voyage.embed({
      input: cleanText,
      model: EMBEDDING_MODEL,
      inputType: 'document', // Use 'query' for search queries
    });

    return response.data![0].embedding!;
  } catch (error) {
    console.error('[Embeddings] Failed to generate embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embedding for a search query
 * Uses inputType: 'query' for better retrieval performance
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const cleanText = text.trim().slice(0, 120000);

    const response = await voyage.embed({
      input: cleanText,
      model: EMBEDDING_MODEL,
      inputType: 'query', // Optimized for search queries
    });

    return response.data![0].embedding!;
  } catch (error) {
    console.error('[Embeddings] Failed to generate query embedding:', error);
    throw new Error('Failed to generate query embedding');
  }
}

/**
 * Generate embeddings for multiple texts in a single batch
 * More efficient than calling generateEmbedding() multiple times
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  inputType: 'document' | 'query' = 'document'
): Promise<number[][]> {
  try {
    // Voyage AI supports up to 128 inputs per request
    const batchSize = 128;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const cleanBatch = batch.map(text => text.trim().slice(0, 120000));

      console.log(
        `[Embeddings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`
      );

      const response = await voyage.embed({
        input: cleanBatch,
        model: EMBEDDING_MODEL,
        inputType,
      });

      embeddings.push(...response.data!.map(d => d.embedding!));

      // Small delay to avoid rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  } catch (error) {
    console.error('[Embeddings] Failed to generate batch embeddings:', error);
    throw new Error('Failed to generate embeddings batch');
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find the most similar embeddings from a list
 */
export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: Array<{ embedding: number[]; data: any }>,
  topK: number = 5
): Array<{ similarity: number; data: any }> {
  const similarities = embeddings.map(item => ({
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
    data: item.data,
  }));

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK);
}

/**
 * Estimate the cost of generating embeddings
 * voyage-3-large: $0.06 per 1M tokens
 */
export function estimateEmbeddingCost(texts: string[]): {
  estimatedTokens: number;
  estimatedCost: number;
} {
  // Rough estimate: 1 token ≈ 4 characters
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);
  const estimatedCost = (estimatedTokens / 1_000_000) * 0.06; // $0.06 per 1M tokens

  return {
    estimatedTokens,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimals
  };
}

/**
 * Validate embedding vector
 */
export function isValidEmbedding(embedding: any): embedding is number[] {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSIONS &&
    embedding.every(v => typeof v === 'number' && !isNaN(v))
  );
}

/**
 * Format embedding for Supabase (as string for vector type)
 */
export function formatEmbeddingForDB(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Parse embedding from database string
 */
export function parseEmbeddingFromDB(embeddingStr: string): number[] {
  try {
    // Remove brackets and parse
    const cleaned = embeddingStr.replace(/^\[|\]$/g, '');
    return cleaned.split(',').map(Number);
  } catch (error) {
    console.error('[Embeddings] Failed to parse embedding from DB:', error);
    throw new Error('Invalid embedding format');
  }
}
