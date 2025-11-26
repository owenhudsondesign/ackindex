/**
 * Blog Post Generator
 *
 * Automatically generates SEO-optimized blog posts from town meeting transcripts
 * after video ingestion completes.
 */

import { supabaseAdmin } from './supabase';
import { openai } from './openai';
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
 * Generate blog post content from meeting transcript chunks
 */
async function generateBlogContent(
  documentTitle: string,
  transcriptChunks: ChunkWithTimestamp[],
  meetingType: string | null,
  meetingDate: Date | null
): Promise<Omit<BlogPostData, 'meetingType' | 'meetingDate'>> {
  // Sample transcript with timestamps (use first 8 chunks, truncated to avoid token limits)
  const MAX_CHUNK_LENGTH = 1500; // Truncate each chunk to avoid 429 errors
  const chunksWithTimestamps = transcriptChunks.slice(0, 8).map((chunk, idx) => {
    const timestamp = chunk.startTime
      ? `[Timestamp: ${formatTimestampDisplay(chunk.startTime)} | #t=${Math.floor(chunk.startTime)}]`
      : `[Chunk ${idx + 1}]`;
    const truncatedContent = chunk.content.length > MAX_CHUNK_LENGTH
      ? chunk.content.slice(0, MAX_CHUNK_LENGTH) + '...'
      : chunk.content;
    return `${timestamp}\n${truncatedContent}`;
  }).join('\n\n---\n\n');

  const meetingDateStr = meetingDate
    ? meetingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent';

  const meetingTypeStr = meetingType || 'Town Meeting';

  const prompt = `You are writing an SEO-optimized blog post summarizing a Nantucket town meeting for AckIndex.com.

Meeting: ${documentTitle}
Type: ${meetingTypeStr}
Date: ${meetingDateStr}

Transcript Chunks (with video timestamps):
${chunksWithTimestamps}

Write a blog post that:
1. Has an engaging, SEO-friendly title (include "Nantucket", meeting type, and key topics)
2. Includes a compelling 160-character excerpt (meta description)
3. Summarizes key decisions, votes, and discussions
4. **IMPORTANT: For each key decision or topic, include a "Watch" link using the timestamp from the relevant chunk**
   - Format: [▶ Watch discussion](#t=SECONDS) where SECONDS is from the #t= value in the transcript
   - Example: "The board voted to approve the zoning change. [▶ Watch vote](#t=1847)"
   - Place these links at the end of each key point or after important quotes
5. Highlights important quotes from officials with video links
6. Uses proper markdown formatting (headings, lists, bold for emphasis)
7. Includes relevant keywords naturally: "Nantucket", meeting type, key topics, official names
8. Is 500-900 words long
9. Ends with a call-to-action to search AckIndex for more details

Provide response in JSON format:
{
  "title": "SEO-optimized title here",
  "excerpt": "160-char meta description",
  "content": "Full markdown blog post with [▶ Watch](#t=SECONDS) links",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Focus on factual reporting. Include specific details about votes, proposals, and public comments. Make sure each major topic has a video timestamp link!`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional civic journalist writing SEO-optimized summaries of Nantucket town meetings. Your writing is clear, factual, and optimized for search engines.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate response
    if (!result.title || !result.excerpt || !result.content || !result.keywords) {
      throw new Error('Incomplete blog post generation response');
    }

    const slug = generateSlug(result.title, meetingDate);

    return {
      title: result.title,
      slug,
      excerpt: result.excerpt.slice(0, 160), // Ensure max 160 chars
      content: result.content,
      keywords: result.keywords.slice(0, 10), // Max 10 keywords
    };
  } catch (error) {
    log.error({ error, documentTitle }, 'Failed to generate blog content with OpenAI');
    throw error;
  }
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

    // 3. Fetch transcript chunks with timestamp metadata (ordered by chunk_index)
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, chunk_index, metadata')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .limit(10); // Get first 10 chunks (will use ~8, truncated to avoid OpenAI token limits)

    if (chunksError || !chunks || chunks.length === 0) {
      log.error({ error: chunksError, documentId }, 'Failed to fetch document chunks');
      return null;
    }

    // Extract content and timestamps from chunks
    const transcriptChunks: ChunkWithTimestamp[] = chunks.map(c => ({
      content: c.content,
      startTime: (c.metadata as any)?.start_time ?? null,
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
