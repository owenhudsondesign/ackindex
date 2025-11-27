/**
 * Blog Post Generator
 *
 * Automatically generates SEO-optimized blog posts from town meeting transcripts
 * after video ingestion completes.
 */

import { supabaseAdmin } from './supabase';
import { generateClaudeResponse, claudeComplete } from './anthropic';
import logger from './logger';

const log = logger.child({ module: 'blogGenerator' });

interface BlogPostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meetingType: string | null;
  meetingDate: Date | null;
  keywords: string[];
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string, date: Date | null): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Add date prefix for uniqueness (YYYY-MM-DD format)
  if (date) {
    const datePrefix = date.toISOString().split('T')[0];
    return `${datePrefix}-${baseSlug}`;
  }

  return baseSlug;
}

/**
 * Extract meeting type and date from document title/metadata
 */
function extractMeetingInfo(title: string): { meetingType: string | null; meetingDate: Date | null } {
  let meetingType: string | null = null;
  let meetingDate: Date | null = null;

  // Extract meeting type
  const typePatterns = [
    /select board/i,
    /planning board/i,
    /town council/i,
    /public hearing/i,
    /special town meeting/i,
    /annual town meeting/i,
    /zoning board/i,
    /board of selectmen/i,
  ];

  for (const pattern of typePatterns) {
    if (pattern.test(title)) {
      meetingType = title.match(pattern)?.[0] || null;
      if (meetingType) {
        // Capitalize properly
        meetingType = meetingType
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
      break;
    }
  }

  // Extract date (various formats: MM/DD/YYYY, YYYY-MM-DD, "January 15, 2024", etc.)
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,           // MM/DD/YYYY or M/D/YYYY
    /(\d{4})-(\d{2})-(\d{2})/,                  // YYYY-MM-DD
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i,
  ];

  const monthNameToNum: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11,
  };

  for (const pattern of datePatterns) {
    const match = title.match(pattern);
    if (match) {
      try {
        let year: number, month: number, day: number;

        if (pattern.source.includes('january|february')) {
          // Month name format: "November 20, 2025"
          year = parseInt(match[3]);
          month = monthNameToNum[match[1].toLowerCase()];
          day = parseInt(match[2]);
        } else if (pattern.source.includes('\\d{4}-')) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JS months are 0-indexed
          day = parseInt(match[3]);
        } else {
          // MM/DD/YYYY format
          year = parseInt(match[3]);
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
        }

        // Create date at noon UTC to avoid timezone shifting issues
        meetingDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

        if (isNaN(meetingDate.getTime())) {
          meetingDate = null;
        }
      } catch {
        meetingDate = null;
      }
      break;
    }
  }

  return { meetingType, meetingDate };
}

interface ChunkWithTimestamp {
  content: string;
  startTime: number | null;
  chunkIndex: number;
}

interface SectionSummary {
  section: string;
  timestamp: number | null;
  keyPoints: string[];
  quotes: string[];
  decisions: string[];
}

/**
 * Format seconds as HH:MM:SS or MM:SS for display
 */
function formatTimestampDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Pass 1: Summarize a batch of chunks to extract key points
 * Uses gpt-4o-mini for efficiency
 */
async function summarizeChunkBatch(
  chunks: ChunkWithTimestamp[],
  batchNumber: number,
  totalBatches: number,
  meetingTitle: string
): Promise<SectionSummary[]> {
  const chunksText = chunks.map((chunk) => {
    const timestamp = chunk.startTime
      ? `[${formatTimestampDisplay(chunk.startTime)} | t=${Math.floor(chunk.startTime)}s]`
      : `[Chunk ${chunk.chunkIndex}]`;
    return `${timestamp}\n${chunk.content}`;
  }).join('\n\n---\n\n');

  const prompt = `Analyze this section of a Nantucket town meeting transcript (batch ${batchNumber}/${totalBatches}).

Meeting: ${meetingTitle}

Transcript Section:
${chunksText}

Extract the most important information from this section. For each distinct topic or agenda item discussed, provide:
1. A brief topic/section label
2. The timestamp (in seconds) where this topic starts
3. Key points discussed (2-4 bullet points)
4. Notable quotes from officials or public (with speaker name if mentioned)
5. Any votes, decisions, or action items

Respond in JSON format:
{
  "summaries": [
    {
      "section": "Topic label",
      "timestamp": 1234,
      "keyPoints": ["Point 1", "Point 2"],
      "quotes": ["Quote with speaker name"],
      "decisions": ["Any votes or decisions made"]
    }
  ]
}

Focus on substantive content - skip procedural matters like roll call unless something notable happens. If this section has no significant content, return an empty summaries array.`;

  try {
    const systemPrompt = 'You are an expert at analyzing government meeting transcripts and extracting key information. Be concise but thorough. Always respond with valid JSON only.';

    const response = await claudeComplete(prompt, {
      system: systemPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const result = JSON.parse(response || '{}');
    return result.summaries || [];
  } catch (error) {
    log.error({ error, batchNumber }, 'Failed to summarize chunk batch');
    return [];
  }
}

/**
 * Pass 2: Generate final blog post from all section summaries
 * Uses Claude 4.5 Sonnet for the final synthesis
 */
async function generateBlogFromSummaries(
  documentTitle: string,
  summaries: SectionSummary[],
  meetingType: string | null,
  meetingDate: Date | null
): Promise<Omit<BlogPostData, 'meetingType' | 'meetingDate'>> {
  const meetingDateStr = meetingDate
    ? meetingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent';

  const meetingTypeStr = meetingType || 'Town Meeting';

  // Format summaries for the prompt
  const summariesText = summaries.map((s, idx) => {
    const timestamp = s.timestamp ? `[t=${s.timestamp}s]` : '';
    return `
### ${idx + 1}. ${s.section} ${timestamp}
Key Points:
${s.keyPoints.map(p => `- ${p}`).join('\n')}
${s.quotes.length > 0 ? `\nQuotes:\n${s.quotes.map(q => `- "${q}"`).join('\n')}` : ''}
${s.decisions.length > 0 ? `\nDecisions:\n${s.decisions.map(d => `- ${d}`).join('\n')}` : ''}`;
  }).join('\n');

  const prompt = `Write an SEO-optimized blog post for AckIndex.com summarizing this Nantucket town meeting.

Meeting: ${documentTitle}
Type: ${meetingTypeStr}
Date: ${meetingDateStr}

Summary of All Topics Discussed:
${summariesText}

Write a comprehensive blog post that:
1. Has an engaging, SEO-friendly title (include "Nantucket", meeting type, and 1-2 key topics)
2. Includes a compelling 160-character excerpt (meta description)
3. Covers ALL the important topics from the summaries above - don't skip any significant decisions or discussions
4. **CRITICAL: Include video timestamp links for each major topic**
   - Format: [▶ Watch](#t=SECONDS) where SECONDS comes from the [t=XXXs] markers above
   - Example: "The board approved the zoning variance. [▶ Watch vote](#t=1847)"
5. Uses proper markdown: ## headings for major sections, **bold** for emphasis, bullet lists
6. Includes relevant keywords naturally throughout
7. Is 600-1000 words to cover all topics adequately
8. Ends with a call-to-action to search AckIndex for more meeting details

Respond in JSON format:
{
  "title": "SEO title here",
  "excerpt": "160-char meta description",
  "content": "Full markdown blog post",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

  const systemPrompt = 'You are a professional civic journalist writing SEO-optimized summaries of Nantucket town meetings. Your writing is clear, factual, comprehensive, and optimized for search engines. Always respond with valid JSON only.';

  const response = await claudeComplete(prompt, {
    system: systemPrompt,
    temperature: 0.7,
    maxTokens: 2500,
  });

  const result = JSON.parse(response || '{}');

  if (!result.title || !result.excerpt || !result.content || !result.keywords) {
    throw new Error('Incomplete blog post generation response');
  }

  const slug = generateSlug(result.title, meetingDate);

  return {
    title: result.title,
    slug,
    excerpt: result.excerpt.slice(0, 160),
    content: result.content,
    keywords: result.keywords.slice(0, 10),
  };
}

/**
 * Generate blog post content using two-pass approach
 * Pass 1: Summarize chunks in batches (covers entire transcript)
 * Pass 2: Generate blog from all summaries
 */
async function generateBlogContent(
  documentTitle: string,
  transcriptChunks: ChunkWithTimestamp[],
  meetingType: string | null,
  meetingDate: Date | null
): Promise<Omit<BlogPostData, 'meetingType' | 'meetingDate'>> {
  log.info({ documentTitle, totalChunks: transcriptChunks.length }, 'Starting two-pass blog generation');

  // Process chunks in batches of 10
  const BATCH_SIZE = 10;
  const batches: ChunkWithTimestamp[][] = [];

  for (let i = 0; i < transcriptChunks.length; i += BATCH_SIZE) {
    batches.push(transcriptChunks.slice(i, i + BATCH_SIZE));
  }

  log.info({ batchCount: batches.length }, 'Processing transcript in batches');

  // Pass 1: Summarize each batch in parallel (up to 5 concurrent)
  const allSummaries: SectionSummary[] = [];
  const CONCURRENT_LIMIT = 5;

  for (let i = 0; i < batches.length; i += CONCURRENT_LIMIT) {
    const batchPromises = batches.slice(i, i + CONCURRENT_LIMIT).map((batch, idx) =>
      summarizeChunkBatch(batch, i + idx + 1, batches.length, documentTitle)
    );

    const results = await Promise.all(batchPromises);
    results.forEach(summaries => allSummaries.push(...summaries));
  }

  log.info({ summaryCount: allSummaries.length }, 'Pass 1 complete - summaries extracted');

  if (allSummaries.length === 0) {
    throw new Error('No summaries extracted from transcript');
  }

  // Pass 2: Generate final blog post from all summaries
  const blogData = await generateBlogFromSummaries(
    documentTitle,
    allSummaries,
    meetingType,
    meetingDate
  );

  log.info({ title: blogData.title }, 'Pass 2 complete - blog post generated');

  return blogData;
}

/**
 * Create a blog post for a completed document
 *
 * @param documentId - The document ID of the completed meeting
 * @returns The created blog post ID, or null if generation failed
 */
export async function createBlogPostForDocument(documentId: string): Promise<string | null> {
  try {
    log.info({ documentId }, 'Starting blog post generation');

    // 1. Fetch document details
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, status, thumbnail_url')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      log.error({ error: docError, documentId }, 'Document not found');
      return null;
    }

    if (document.status !== 'completed') {
      log.warn({ documentId, status: document.status }, 'Document not completed, skipping blog generation');
      return null;
    }

    // 2. Check if blog post already exists
    const { data: existingPost } = await supabaseAdmin
      .from('blog_posts')
      .select('id')
      .eq('document_id', documentId)
      .single();

    if (existingPost) {
      log.info({ documentId, blogPostId: existingPost.id }, 'Blog post already exists');
      return existingPost.id;
    }

    // 3. Fetch ALL transcript chunks with timestamp metadata (ordered by chunk_index)
    // Two-pass approach processes entire transcript in batches
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, chunk_index, metadata')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      log.error({ error: chunksError, documentId }, 'Failed to fetch document chunks');
      return null;
    }

    log.info({ documentId, chunkCount: chunks.length }, 'Fetched all transcript chunks');

    // Extract content, timestamps, and chunk index
    const transcriptChunks: ChunkWithTimestamp[] = chunks.map(c => ({
      content: c.content,
      startTime: (c.metadata as any)?.start_time ?? null,
      chunkIndex: c.chunk_index,
    }));

    // 4. Extract meeting metadata
    const { meetingType, meetingDate } = extractMeetingInfo(document.title);

    // 5. Generate blog post content with OpenAI
    const blogData = await generateBlogContent(
      document.title,
      transcriptChunks,
      meetingType,
      meetingDate
    );

    // 6. Insert blog post into database as DRAFT for admin review
    const { data: blogPost, error: insertError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        document_id: documentId,
        title: blogData.title,
        slug: blogData.slug,
        excerpt: blogData.excerpt,
        content: blogData.content,
        meeting_type: meetingType,
        meeting_date: meetingDate,
        keywords: blogData.keywords,
        thumbnail_url: (document as any).thumbnail_url || null,
        og_image_url: (document as any).thumbnail_url || null,
        status: 'draft', // Create as draft for admin review
        published_at: null, // Will be set when admin publishes
      })
      .select('id')
      .single();

    if (insertError || !blogPost) {
      log.error({ error: insertError, documentId }, 'Failed to insert blog post');
      return null;
    }

    log.info(
      { documentId, blogPostId: blogPost.id, slug: blogData.slug },
      'Blog post created successfully'
    );

    return blogPost.id;
  } catch (error) {
    log.error({ error, documentId }, 'Blog post generation failed');
    return null;
  }
}
