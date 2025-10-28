/**
 * Text Chunking Utilities
 * 
 * Splits large text content into smaller, semantically meaningful chunks
 * for better retrieval and processing.
 */

export interface TextChunk {
  content: string;
  index: number;
  tokens: number;
  metadata: {
    start_char: number;
    end_char: number;
    has_heading?: boolean;
    heading_text?: string;
  };
}

export interface ChunkingOptions {
  maxTokens?: number;
  overlap?: number;
  preserveParagraphs?: boolean;
  preserveHeadings?: boolean;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Detect if text starts with a heading
 */
function detectHeading(text: string): { isHeading: boolean; heading?: string } {
  // Check for markdown-style headings
  const markdownHeading = text.match(/^#{1,6}\s+(.+)$/m);
  if (markdownHeading) {
    return { isHeading: true, heading: markdownHeading[1] };
  }

  // Check for all-caps short lines (common heading pattern)
  const lines = text.split('\n');
  const firstLine = lines[0]?.trim() || '';
  if (
    firstLine.length < 100 &&
    firstLine === firstLine.toUpperCase() &&
    /^[A-Z\s\-:]+$/.test(firstLine)
  ) {
    return { isHeading: true, heading: firstLine };
  }

  return { isHeading: false };
}

/**
 * Chunk text into smaller pieces for RAG retrieval
 * 
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    maxTokens = 500,
    overlap = 50,
    preserveParagraphs = true,
    preserveHeadings = true,
  } = options;

  // Clean and normalize text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .trim();

  if (estimateTokens(cleanText) <= maxTokens) {
    // Text is small enough, return as single chunk
    return [
      {
        content: cleanText,
        index: 0,
        tokens: estimateTokens(cleanText),
        metadata: {
          start_char: 0,
          end_char: cleanText.length,
        },
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;
  let lastHeading = '';

  const paragraphs = preserveParagraphs
    ? splitIntoParagraphs(cleanText)
    : [cleanText];

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphTokens = estimateTokens(paragraph);

    // Check for heading
    const headingInfo = preserveHeadings
      ? detectHeading(paragraph)
      : { isHeading: false };

    if (headingInfo.isHeading && headingInfo.heading) {
      lastHeading = headingInfo.heading;
    }

    // If adding this paragraph would exceed max tokens, save current chunk
    if (
      currentChunk &&
      estimateTokens(currentChunk + '\n\n' + paragraph) > maxTokens
    ) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        tokens: estimateTokens(currentChunk),
        metadata: {
          start_char: currentStartChar,
          end_char: currentStartChar + currentChunk.length,
          has_heading: !!lastHeading,
          heading_text: lastHeading,
        },
      });

      // Start new chunk with overlap
      if (overlap > 0 && currentChunk) {
        const overlapText = getLastNTokens(currentChunk, overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
        currentStartChar += currentChunk.length - overlapText.length - 2;
      } else {
        currentChunk = paragraph;
        currentStartChar += currentChunk.length;
      }
    } else if (paragraphTokens > maxTokens) {
      // Paragraph is too large, split by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        if (estimateTokens(currentChunk + ' ' + sentence) > maxTokens) {
          if (currentChunk) {
            chunks.push({
              content: currentChunk.trim(),
              index: chunkIndex++,
              tokens: estimateTokens(currentChunk),
              metadata: {
                start_char: currentStartChar,
                end_char: currentStartChar + currentChunk.length,
                has_heading: !!lastHeading,
                heading_text: lastHeading,
              },
            });
          }
          currentChunk = sentence;
          currentStartChar += currentChunk.length;
        } else {
          currentChunk += ' ' + sentence;
        }
      }
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokens: estimateTokens(currentChunk),
      metadata: {
        start_char: currentStartChar,
        end_char: currentStartChar + currentChunk.length,
        has_heading: !!lastHeading,
        heading_text: lastHeading,
      },
    });
  }

  return chunks;
}

/**
 * Get the last N tokens from text (approximately)
 */
function getLastNTokens(text: string, n: number): string {
  const approxChars = n * 4;
  if (text.length <= approxChars) {
    return text;
  }

  // Try to break at a natural boundary (space, newline)
  const substring = text.slice(-approxChars);
  const firstSpace = substring.indexOf(' ');
  const firstNewline = substring.indexOf('\n');

  const breakPoint = Math.min(
    firstSpace > 0 ? firstSpace : Infinity,
    firstNewline > 0 ? firstNewline : Infinity
  );

  if (breakPoint < Infinity) {
    return substring.slice(breakPoint + 1);
  }

  return substring;
}

/**
 * Clean and normalize text for processing
 */
export function cleanText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Normalize quotes
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
  );
}

/**
 * Extract metadata from text (title, description, etc.)
 */
export function extractMetadata(text: string): {
  title?: string;
  description?: string;
} {
  const lines = text.split('\n').filter(l => l.trim());

  // Try to find a title (usually first non-empty line or heading)
  const title = lines.find(line => {
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length < 200 &&
      (trimmed.startsWith('#') || trimmed === trimmed.toUpperCase())
    );
  })?.replace(/^#+\s*/, '').trim();

  // Try to find a description (first substantial paragraph)
  const description = lines.find(line => {
    const trimmed = line.trim();
    return trimmed.length > 50 && trimmed.length < 500;
  })?.trim();

  return {
    title,
    description,
  };
}
