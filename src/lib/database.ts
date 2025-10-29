/**
 * Database Utilities for Document Storage
 * 
 * Handles storing and retrieving documents and chunks in Supabase.
 */

import { supabaseAdmin } from './supabase';
import { TextChunk } from './chunking';

export interface Document {
  id: string;
  source_type: 'url' | 'pdf';
  source_url?: string;
  filename?: string;
  title?: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  total_chunks: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  created_by?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, any>;
  embedding?: string; // Vector embedding as string
  created_at: string;
}

export interface ScrapeJob {
  id: string;
  document_id: string;
  apify_run_id?: string;
  apify_status?: string;
  url: string;
  config: Record<string, any>;
  pages_crawled: number;
  pdfs_found: number;
  created_at: string;
  completed_at?: string;
}

/**
 * Create a new document record
 */
export async function createDocument(data: {
  source_type: 'url' | 'pdf';
  source_url?: string;
  filename?: string;
  title?: string;
  description?: string;
  created_by?: string;
}): Promise<Document> {
  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .insert({
      ...data,
      status: 'pending',
      total_chunks: 0,
      total_tokens: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Failed to create document:', error);
    throw new Error('Failed to create document record');
  }

  return document as Document;
}

/**
 * Update document status and metadata
 */
export async function updateDocument(
  documentId: string,
  updates: Partial<Document>
): Promise<Document> {
  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('[DB] Failed to update document:', error);
    throw new Error('Failed to update document');
  }

  return document as Document;
}

/**
 * Mark document as completed
 */
export async function markDocumentCompleted(
  documentId: string,
  totalChunks: number,
  totalTokens: number
): Promise<Document> {
  return updateDocument(documentId, {
    status: 'completed',
    total_chunks: totalChunks,
    total_tokens: totalTokens,
    processed_at: new Date().toISOString(),
  } as any);
}

/**
 * Mark document as failed
 */
export async function markDocumentFailed(
  documentId: string,
  errorMessage: string
): Promise<Document> {
  return updateDocument(documentId, {
    status: 'failed',
    error_message: errorMessage,
  } as any);
}

/**
 * Store chunks for a document
 */
export async function storeChunks(
  documentId: string,
  chunks: TextChunk[]
): Promise<void> {
  const chunkRecords = chunks.map(chunk => ({
    document_id: documentId,
    content: chunk.content,
    chunk_index: chunk.index,
    metadata: chunk.metadata,
  }));

  const { error } = await supabaseAdmin
    .from('document_chunks')
    .insert(chunkRecords);

  if (error) {
    console.error('[DB] Failed to store chunks:', error);
    throw new Error('Failed to store document chunks');
  }

  console.log(`[DB] Stored ${chunks.length} chunks for document ${documentId}`);
}

/**
 * Update embedding for a chunk
 */
export async function updateChunkEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  // Store as array - Supabase will automatically cast to vector(1536) type
  const { error } = await supabaseAdmin
    .from('document_chunks')
    .update({ embedding: embedding })
    .eq('id', chunkId);

  if (error) {
    console.error('[DB] Failed to update chunk embedding:', error);
    throw new Error('Failed to update embedding');
  }
}

/**
 * Get chunks without embeddings
 */
export async function getChunksWithoutEmbeddings(
  limit: number = 100
): Promise<DocumentChunk[]> {
  const { data, error } = await supabaseAdmin
    .from('document_chunks')
    .select('*')
    .is('embedding', null)
    .limit(limit);

  if (error) {
    console.error('[DB] Failed to get chunks without embeddings:', error);
    throw new Error('Failed to fetch chunks');
  }

  return (data || []) as DocumentChunk[];
}

/**
 * Get total count of chunks with and without embeddings
 */
export async function getEmbeddingStats(): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  percentage: number;
}> {
  const { count: total } = await supabaseAdmin
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbeddings } = await supabaseAdmin
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const totalCount = total || 0;
  const withEmbeddingsCount = withEmbeddings || 0;
  const withoutEmbeddingsCount = totalCount - withEmbeddingsCount;

  return {
    total: totalCount,
    withEmbeddings: withEmbeddingsCount,
    withoutEmbeddings: withoutEmbeddingsCount,
    percentage: totalCount > 0 ? Math.round((withEmbeddingsCount / totalCount) * 100) : 0,
  };
}

/**
 * Create a scrape job record
 */
export async function createScrapeJob(data: {
  document_id: string;
  url: string;
  apify_run_id?: string;
  config?: Record<string, any>;
}): Promise<ScrapeJob> {
  const { data: job, error } = await supabaseAdmin
    .from('scrape_jobs')
    .insert({
      ...data,
      pages_crawled: 0,
      pdfs_found: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Failed to create scrape job:', error);
    throw new Error('Failed to create scrape job record');
  }

  return job as ScrapeJob;
}

/**
 * Update scrape job status
 */
export async function updateScrapeJob(
  jobId: string,
  updates: Partial<ScrapeJob>
): Promise<ScrapeJob> {
  const { data: job, error } = await supabaseAdmin
    .from('scrape_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    console.error('[DB] Failed to update scrape job:', error);
    throw new Error('Failed to update scrape job');
  }

  return job as ScrapeJob;
}

/**
 * Get recent documents with optional status filter
 */
export async function getRecentDocuments(
  limit: number = 10,
  status?: Document['status']
): Promise<Document[]> {
  let query = supabaseAdmin
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[DB] Failed to get recent documents:', error);
    throw new Error('Failed to retrieve documents');
  }

  return (data || []) as Document[];
}

/**
 * Get document by ID with its chunks
 */
export async function getDocumentWithChunks(
  documentId: string
): Promise<{ document: Document; chunks: DocumentChunk[] } | null> {
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    return null;
  }

  const { data: chunks, error: chunksError } = await supabaseAdmin
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (chunksError) {
    console.error('[DB] Failed to get chunks:', chunksError);
    return { document: document as Document, chunks: [] };
  }

  return {
    document: document as Document,
    chunks: (chunks || []) as DocumentChunk[],
  };
}

/**
 * Search chunks by content
 */
export async function searchChunks(
  query: string,
  limit: number = 10
): Promise<Array<DocumentChunk & { document: Document }>> {
  const { data, error } = await supabaseAdmin
    .from('document_chunks')
    .select(
      `
      *,
      document:documents(*)
    `
    )
    .textSearch('content', query, {
      type: 'websearch',
      config: 'english',
    })
    .limit(limit);

  if (error) {
    console.error('[DB] Failed to search chunks:', error);
    throw new Error('Failed to search content');
  }

  return data as any[];
}

/**
 * Delete a document and all its chunks
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    console.error('[DB] Failed to delete document:', error);
    throw new Error('Failed to delete document');
  }

  console.log(`[DB] Deleted document ${documentId} and its chunks`);
}

/**
 * Get statistics about stored content
 */
export async function getContentStats(): Promise<{
  totalDocuments: number;
  totalChunks: number;
  documentsByStatus: Record<string, number>;
  documentsByType: Record<string, number>;
}> {
  // Get total documents
  const { count: totalDocuments } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true });

  // Get total chunks
  const { count: totalChunks } = await supabaseAdmin
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  // Get documents by status
  const { data: statusData } = await supabaseAdmin
    .from('documents')
    .select('status');

  const documentsByStatus: Record<string, number> = {};
  statusData?.forEach((doc: any) => {
    documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1;
  });

  // Get documents by type
  const { data: typeData } = await supabaseAdmin
    .from('documents')
    .select('source_type');

  const documentsByType: Record<string, number> = {};
  typeData?.forEach((doc: any) => {
    documentsByType[doc.source_type] = (documentsByType[doc.source_type] || 0) + 1;
  });

  return {
    totalDocuments: totalDocuments || 0,
    totalChunks: totalChunks || 0,
    documentsByStatus,
    documentsByType,
  };
}
