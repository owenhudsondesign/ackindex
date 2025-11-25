/**
 * Embeddings Utilities
 * 
 * Generate vector embeddings for text chunks using OpenAI's API
 * for semantic search and retrieval.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI's text-embedding-3-large with 1536 dimensions for best quality
// (native 3072 dims reduced to 1536 for DB compatibility, minimal quality loss)
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = 'text-embedding-3-large';

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean and truncate text if necessary (max 8191 tokens)
    const cleanText = text.trim().slice(0, 32000); // ~8k tokens

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanText,
      dimensions: EMBEDDING_DIMENSIONS, // Reduce to 1536 for DB compatibility
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[Embeddings] Failed to generate embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts in a single batch
 * More efficient than calling generateEmbedding() multiple times
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  try {
    // OpenAI API supports up to 2048 inputs per request
    const batchSize = 100; // Use conservative batch size
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const cleanBatch = batch.map(text => text.trim().slice(0, 32000));

      console.log(
        `[Embeddings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`
      );

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: cleanBatch,
        dimensions: EMBEDDING_DIMENSIONS, // Reduce to 1536 for DB compatibility
      });

      embeddings.push(...response.data.map(d => d.embedding));

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
 * text-embedding-3-large: $0.13 per 1M tokens
 */
export function estimateEmbeddingCost(texts: string[]): {
  estimatedTokens: number;
  estimatedCost: number;
} {
  // Rough estimate: 1 token ≈ 4 characters
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);
  const estimatedCost = (estimatedTokens / 1_000_000) * 0.13; // $0.13 per 1M tokens

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
