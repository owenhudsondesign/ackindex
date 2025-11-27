/**
 * Qdrant Vector Database Service
 *
 * Handles vector storage and similarity search using Qdrant Cloud.
 * Replaces Supabase pgvector for better performance and cost savings.
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import logger from './logger';

const COLLECTION_NAME = 'document_chunks';

interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    document_id: string;
    chunk_index: number;
    content: string;
    start_time?: number;
    end_time?: number;
    speaker?: string;
    metadata?: Record<string, any>;
  };
}

interface SearchResult {
  id: string;
  score: number;
  payload: QdrantPoint['payload'];
}

class QdrantService {
  private client: QdrantClient | null = null;
  private initialized = false;

  private initializeClient() {
    if (this.client) {
      return;
    }

    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url || !apiKey) {
      throw new Error('Qdrant credentials not configured. Set QDRANT_URL and QDRANT_API_KEY.');
    }

    this.client = new QdrantClient({
      url,
      apiKey,
    });

    logger.info('Qdrant client initialized');
  }

  /**
   * Initialize collection (run once on setup)
   */
  async createCollection() {
    this.initializeClient();

    try {
      // Check if collection exists
      const collections = await this.client!.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === COLLECTION_NAME
      );

      if (exists) {
        logger.info({ collection: COLLECTION_NAME }, 'Qdrant collection already exists');
        this.initialized = true;
        return;
      }

      // Create collection with OpenAI embedding dimensions (1536)
      await this.client!.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536,
          distance: 'Cosine', // OpenAI embeddings use cosine similarity
        },
        optimizers_config: {
          indexing_threshold: 10000, // Start indexing after 10K points
        },
      });

      // Create payload indexes for filtering
      await this.client!.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'document_id',
        field_schema: 'keyword',
      });

      await this.client!.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'chunk_index',
        field_schema: 'integer',
      });

      logger.info({ collection: COLLECTION_NAME }, 'Qdrant collection created');
      this.initialized = true;
    } catch (error) {
      logger.error({ error }, 'Failed to create Qdrant collection');
      throw error;
    }
  }

  /**
   * Upsert a single chunk (for new embeddings)
   */
  async upsertChunk(
    id: string,
    embedding: number[],
    payload: QdrantPoint['payload']
  ): Promise<void> {
    this.initializeClient();

    try {
      await this.client!.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id,
            vector: embedding,
            payload,
          },
        ],
      });

      logger.debug({ id, document_id: payload.document_id }, 'Chunk upserted to Qdrant');
    } catch (error) {
      logger.error({ error, id }, 'Failed to upsert chunk to Qdrant');
      throw error;
    }
  }

  /**
   * Upsert multiple chunks in batch (for migrations and bulk uploads)
   */
  async upsertChunksBatch(points: QdrantPoint[]): Promise<void> {
    this.initializeClient();

    try {
      // Qdrant recommends batch size of 100-1000
      const batchSize = 500;

      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);

        await this.client!.upsert(COLLECTION_NAME, {
          wait: true,
          points: batch,
        });

        logger.info(
          {
            batch: Math.floor(i / batchSize) + 1,
            total: Math.ceil(points.length / batchSize),
            processed: Math.min(i + batchSize, points.length),
            total_points: points.length
          },
          'Batch upserted to Qdrant'
        );
      }

      logger.info({ count: points.length }, 'All chunks upserted to Qdrant');
    } catch (error) {
      logger.error({ error, count: points.length }, 'Failed to upsert batch to Qdrant');
      throw error;
    }
  }

  /**
   * Search for similar chunks
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: Record<string, any>;
    } = {}
  ): Promise<SearchResult[]> {
    this.initializeClient();

    const { limit = 5, scoreThreshold = 0.7, filter } = options;

    try {
      const searchResult = await this.client!.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        limit,
        score_threshold: scoreThreshold,
        filter: filter ? { must: [filter] } : undefined,
        with_payload: true,
      });

      logger.debug(
        {
          results: searchResult.length,
          topScore: searchResult[0]?.score || 0
        },
        'Qdrant search completed'
      );

      return searchResult.map((result) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as QdrantPoint['payload'],
      }));
    } catch (error) {
      logger.error({ error }, 'Qdrant search failed');
      throw error;
    }
  }

  /**
   * Delete chunks by document ID (when document is deleted)
   */
  async deleteChunksByDocument(documentId: string): Promise<void> {
    this.initializeClient();

    try {
      await this.client!.delete(COLLECTION_NAME, {
        wait: true,
        filter: {
          must: [
            {
              key: 'document_id',
              match: {
                value: documentId,
              },
            },
          ],
        },
      });

      logger.info({ document_id: documentId }, 'Chunks deleted from Qdrant');
    } catch (error) {
      logger.error({ error, document_id: documentId }, 'Failed to delete chunks from Qdrant');
      throw error;
    }
  }

  /**
   * Delete a specific chunk by ID
   */
  async deleteChunk(chunkId: string): Promise<void> {
    this.initializeClient();

    try {
      await this.client!.delete(COLLECTION_NAME, {
        wait: true,
        points: [chunkId],
      });

      logger.debug({ chunk_id: chunkId }, 'Chunk deleted from Qdrant');
    } catch (error) {
      logger.error({ error, chunk_id: chunkId }, 'Failed to delete chunk from Qdrant');
      throw error;
    }
  }

  /**
   * Get collection info (for monitoring)
   */
  async getCollectionInfo() {
    this.initializeClient();

    try {
      const info = await this.client!.getCollection(COLLECTION_NAME);
      const vectors = info.config.params.vectors;
      return {
        name: COLLECTION_NAME,
        pointsCount: info.points_count,
        vectorSize: vectors && typeof vectors === 'object' && 'size' in vectors ? vectors.size : 0,
        distance: vectors && typeof vectors === 'object' && 'distance' in vectors ? vectors.distance : 'Cosine',
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get Qdrant collection info');
      throw error;
    }
  }

  /**
   * Check if Qdrant is configured and reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.initializeClient();
      await this.client!.getCollections();
      return true;
    } catch (error) {
      logger.error({ error }, 'Qdrant health check failed');
      return false;
    }
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

// Export types
export type { QdrantPoint, SearchResult };
