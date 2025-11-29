/**
 * Google Document AI Integration
 *
 * Parses complex documents (PDFs, images) with high accuracy table extraction
 * for town meeting warrants, budgets, and other structured documents.
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import logger from './logger';

const log = logger.child({ module: 'documentAI' });

// Configuration from environment variables
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us'; // 'us' or 'eu'
const PROCESSOR_ID = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

// Initialize client
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
let client: DocumentProcessorServiceClient | null = null;

function getClient(): DocumentProcessorServiceClient {
  if (!client) {
    client = new DocumentProcessorServiceClient();
  }
  return client;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  pageNumber: number;
  confidence: number;
}

export interface ParsedDocument {
  text: string;
  tables: ParsedTable[];
  pages: number;
  mimeType: string;
  processingTime: number;
}

export interface DocumentChunk {
  content: string;
  type: 'text' | 'table';
  pageNumber: number;
  metadata: {
    tableIndex?: number;
    headers?: string[];
  };
}

/**
 * Parse a document using Google Document AI
 */
export async function parseDocument(
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<ParsedDocument> {
  if (!PROJECT_ID || !PROCESSOR_ID) {
    throw new Error('Google Document AI not configured. Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID');
  }

  const startTime = Date.now();
  const docClient = getClient();

  const processorName = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

  log.info({ mimeType, size: fileBuffer.length }, 'Processing document with Google Document AI');

  try {
    const [result] = await docClient.processDocument({
      name: processorName,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType,
      },
    });

    const { document } = result;
    if (!document) {
      throw new Error('No document returned from Document AI');
    }

    const processingTime = Date.now() - startTime;

    // Extract full text
    const text = document.text || '';

    // Extract tables
    const tables: ParsedTable[] = [];

    if (document.pages) {
      for (const page of document.pages) {
        const pageNumber = page.pageNumber || 1;

        if (page.tables) {
          for (const table of page.tables) {
            const parsedTable = extractTable(table, text);
            if (parsedTable) {
              tables.push({
                ...parsedTable,
                pageNumber,
              });
            }
          }
        }
      }
    }

    log.info(
      { pages: document.pages?.length || 0, tables: tables.length, processingTime },
      'Document parsed successfully'
    );

    return {
      text,
      tables,
      pages: document.pages?.length || 0,
      mimeType,
      processingTime,
    };
  } catch (error) {
    log.error({ error, mimeType }, 'Failed to parse document');
    throw error;
  }
}

/**
 * Extract table data from Document AI table object
 */
function extractTable(
  table: any,
  fullText: string
): Omit<ParsedTable, 'pageNumber'> | null {
  try {
    const headers: string[] = [];
    const rows: string[][] = [];
    let confidence = 0;
    let confidenceCount = 0;

    // Extract header row
    if (table.headerRows) {
      for (const headerRow of table.headerRows) {
        if (headerRow.cells) {
          const headerCells: string[] = [];
          for (const cell of headerRow.cells) {
            const cellText = extractTextFromLayout(cell.layout, fullText);
            headerCells.push(cellText.trim());
            if (cell.layout?.confidence) {
              confidence += cell.layout.confidence;
              confidenceCount++;
            }
          }
          headers.push(...headerCells);
        }
      }
    }

    // Extract body rows
    if (table.bodyRows) {
      for (const bodyRow of table.bodyRows) {
        if (bodyRow.cells) {
          const rowCells: string[] = [];
          for (const cell of bodyRow.cells) {
            const cellText = extractTextFromLayout(cell.layout, fullText);
            rowCells.push(cellText.trim());
            if (cell.layout?.confidence) {
              confidence += cell.layout.confidence;
              confidenceCount++;
            }
          }
          rows.push(rowCells);
        }
      }
    }

    if (headers.length === 0 && rows.length === 0) {
      return null;
    }

    return {
      headers,
      rows,
      confidence: confidenceCount > 0 ? confidence / confidenceCount : 0,
    };
  } catch (error) {
    log.warn({ error }, 'Failed to extract table');
    return null;
  }
}

/**
 * Extract text from layout using text anchors
 */
function extractTextFromLayout(layout: any, fullText: string): string {
  if (!layout?.textAnchor?.textSegments) {
    return '';
  }

  let text = '';
  for (const segment of layout.textAnchor.textSegments) {
    const startIndex = parseInt(segment.startIndex || '0', 10);
    const endIndex = parseInt(segment.endIndex || '0', 10);
    text += fullText.substring(startIndex, endIndex);
  }
  return text;
}

/**
 * Convert parsed document to chunks for embedding
 */
export function documentToChunks(
  parsed: ParsedDocument,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // Chunk the main text (excluding tables)
  const textChunks = chunkText(parsed.text, chunkSize, chunkOverlap);
  for (const content of textChunks) {
    chunks.push({
      content,
      type: 'text',
      pageNumber: 1, // Text spans multiple pages, default to 1
      metadata: {},
    });
  }

  // Convert tables to markdown and add as chunks
  for (let i = 0; i < parsed.tables.length; i++) {
    const table = parsed.tables[i];
    const markdown = tableToMarkdown(table);

    chunks.push({
      content: markdown,
      type: 'table',
      pageNumber: table.pageNumber,
      metadata: {
        tableIndex: i,
        headers: table.headers,
      },
    });
  }

  return chunks;
}

/**
 * Convert table to markdown format for embedding
 */
export function tableToMarkdown(table: ParsedTable): string {
  const lines: string[] = [];

  // Header row
  if (table.headers.length > 0) {
    lines.push('| ' + table.headers.join(' | ') + ' |');
    lines.push('| ' + table.headers.map(() => '---').join(' | ') + ' |');
  }

  // Data rows
  for (const row of table.rows) {
    lines.push('| ' + row.join(' | ') + ' |');
  }

  return lines.join('\n');
}

/**
 * Simple text chunking with overlap
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence or paragraph boundary
    if (end < text.length) {
      const breakPoints = ['\n\n', '\n', '. ', '! ', '? '];
      for (const bp of breakPoints) {
        const lastBreak = text.lastIndexOf(bp, end);
        if (lastBreak > start + chunkSize / 2) {
          end = lastBreak + bp.length;
          break;
        }
      }
    }

    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Check if Document AI is configured
 */
export function isDocumentAIConfigured(): boolean {
  return !!(PROJECT_ID && PROCESSOR_ID);
}

/**
 * Get configuration status for admin display
 */
export function getDocumentAIStatus(): {
  configured: boolean;
  projectId: string | null;
  location: string;
  processorId: string | null;
} {
  return {
    configured: isDocumentAIConfigured(),
    projectId: PROJECT_ID || null,
    location: LOCATION,
    processorId: PROCESSOR_ID ? `${PROCESSOR_ID.substring(0, 8)}...` : null,
  };
}
