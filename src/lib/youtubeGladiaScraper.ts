/**
 * YouTube video scraping and transcription pipeline using Gladia
 * This replaces the old Apify-based YouTube transcription with Gladia's API
 */

import { createClient } from '@supabase/supabase-js';
import {
  createDocument,
  updateDocument,
  storeChunks,
  markDocumentCompleted,
} from '@/lib/database';
import { transcribeAudio, GladiaTranscriptionSegment } from '@/lib/gladiaTranscriber';
import logger from '@/lib/logger';
import { chunkText } from '@/lib/chunking';
import { createHash } from 'crypto';
import OpenAI from 'openai';

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// OpenAI client for enrichment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface YouTubeVideoInfo {
  videoId: string;
  url: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  duration: number;
  viewCount: number;
}

export interface EnrichedMeetingData {
  videoId: string;
  title: string;
  channel: string;
  publishedAt: string;
  duration: number;
  url: string;
  summary?: string;
  searchableSummary?: string;
  transcript: string;
  transcriptSegments: GladiaTranscriptionSegment[];
  meetingType?: string;
  departments?: string[];
  attendees?: Array<{ name: string; title?: string }>;
  keyDecisions?: Array<{
    decision: string;
    context?: string;
    votingResult?: string;
  }>;
  actionItems?: Array<{
    action: string;
    responsible?: string;
    deadline?: string;
  }>;
  notableQuotes?: Array<{
    quote: string;
    speaker: string;
    timestamp?: string;
    context?: string;
  }>;
  topics?: string[];
  keywords?: string[];
  category?: string;
  priorityLevel?: string;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('youtube.com') ||
      urlObj.hostname.includes('youtu.be')
    );
  } catch {
    return false;
  }
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Handle youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;
    }

    // Handle youtu.be/VIDEO_ID
    if (urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get YouTube video metadata using YouTube Data API
 */
async function getVideoMetadata(videoId: string): Promise<YouTubeVideoInfo> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }

  const video = data.items[0];
  const duration = parseDuration(video.contentDetails.duration);

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: video.snippet.title,
    description: video.snippet.description,
    channel: video.snippet.channelTitle,
    channelId: video.snippet.channelId,
    publishedAt: video.snippet.publishedAt,
    duration,
    viewCount: parseInt(video.statistics.viewCount) || 0,
  };
}

/**
 * Parse ISO 8601 duration to seconds (PT1H30M15S -> 5415)
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get direct audio/video URL for a YouTube video (for Gladia)
 * This needs to be a publicly accessible URL
 * For now, we'll pass the YouTube URL directly to Gladia (it supports YouTube URLs)
 */
function getAudioUrl(videoId: string): string {
  // Gladia supports YouTube URLs directly
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Enrich transcript with OpenAI to extract meeting information
 */
async function enrichTranscriptWithAI(
  videoInfo: YouTubeVideoInfo,
  transcript: string
): Promise<Partial<EnrichedMeetingData>> {
  try {
    const prompt = `Analyze this meeting transcript and extract structured information.

Video Title: ${videoInfo.title}
Channel: ${videoInfo.channel}
Description: ${videoInfo.description}

Transcript:
${transcript.slice(0, 30000)} ${transcript.length > 30000 ? '...(truncated)' : ''}

Extract the following as JSON:
{
  "summary": "2-3 sentence overview",
  "searchableSummary": "Detailed summary optimized for semantic search (300-500 words)",
  "meetingType": "Select: town_hall, city_council, board_meeting, public_hearing, committee, other",
  "departments": ["array of relevant departments/committees"],
  "attendees": [{"name": "Name", "title": "Title"}],
  "keyDecisions": [{"decision": "Decision text", "context": "Context", "votingResult": "Vote result"}],
  "actionItems": [{"action": "Action text", "responsible": "Person/dept", "deadline": "Date if mentioned"}],
  "notableQuotes": [{"quote": "Quote text", "speaker": "Speaker name", "context": "Why notable"}],
  "topics": ["main topics discussed"],
  "keywords": ["key terms and phrases"],
  "category": "primary category (zoning, budget, planning, public_safety, etc)",
  "priorityLevel": "high/medium/low"
}

Return ONLY valid JSON, no other text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI that extracts structured information from meeting transcripts. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content || '{}';
    const enrichedData = JSON.parse(content);

    logger.info({ videoId: videoInfo.videoId }, 'Successfully enriched transcript with AI');

    return enrichedData;
  } catch (error) {
    logger.error({ error, videoId: videoInfo.videoId }, 'Failed to enrich transcript with AI');

    // Return minimal enrichment
    return {
      summary: `Meeting from ${videoInfo.channel}: ${videoInfo.title}`,
      searchableSummary: `${videoInfo.title}. ${videoInfo.description}`,
      topics: [],
      keywords: [],
    };
  }
}

/**
 * Process a single YouTube video: download audio, transcribe, enrich, store
 */
export async function processYouTubeVideo(
  url: string,
  scheduleId?: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
    language?: string;
    enableCodeSwitching?: boolean;
  } = {}
): Promise<string> {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${new Date().toISOString()}] PROCESS YOUTUBE VIDEO`);
    console.log(`URL: ${url}`);
    console.log(`Schedule ID: ${scheduleId || 'N/A'}`);
    console.log(`Options:`, JSON.stringify(options, null, 2));
    console.log('='.repeat(80));

    logger.info({ url }, 'Starting YouTube video processing with Gladia');

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    console.log(`✅ Extracted video ID: ${videoId}`);

    // Get or create document
    let documentId: string;
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('source_url', url)
      .single();

    if (existingDoc) {
      documentId = existingDoc.id;
      await updateDocument(documentId, { status: 'processing' } as any);
    } else {
      let createdBy: string | undefined;

      if (scheduleId) {
        const { data: scheduleData } = await supabase
          .from('scheduled_scrapes')
          .select('created_by')
          .eq('id', scheduleId)
          .single();
        createdBy = scheduleData?.created_by;
      }

      const document = await createDocument({
        source_type: 'url',
        source_url: url,
        title: 'YouTube Video',
        created_by: createdBy,
      });
      documentId = document.id;
    }

    // Get video metadata from YouTube API
    console.log(`\n📹 Fetching video metadata from YouTube API...`);
    logger.info({ videoId }, 'Fetching video metadata');
    const videoInfo = await getVideoMetadata(videoId);
    console.log(`✅ Got metadata: "${videoInfo.title}" (${Math.floor(videoInfo.duration / 60)}m ${videoInfo.duration % 60}s)`);

    // Check if video exceeds Gladia's limit (135 minutes for regular, 120 for YouTube URLs)
    const GLADIA_MAX_DURATION_SECONDS = 120 * 60; // 120 minutes for YouTube URLs
    if (videoInfo.duration > GLADIA_MAX_DURATION_SECONDS) {
      const durationMinutes = Math.floor(videoInfo.duration / 60);
      const maxMinutes = Math.floor(GLADIA_MAX_DURATION_SECONDS / 60);

      logger.warn(
        { videoId, duration: durationMinutes, maxDuration: maxMinutes },
        'Video exceeds Gladia maximum duration for YouTube URLs'
      );

      // Update document with error status
      await updateDocument(documentId, {
        title: videoInfo.title,
        description: videoInfo.description.slice(0, 200),
        status: 'failed',
      } as any);

      // Store error message in database
      await supabase
        .from('documents')
        .update({
          error_message: `Video duration (${durationMinutes} minutes) exceeds Gladia's maximum for YouTube URLs (${maxMinutes} minutes). Please contact support to enable longer video processing or split the video into shorter segments.`,
        })
        .eq('id', documentId);

      throw new Error(
        `Video too long: ${durationMinutes} minutes (max: ${maxMinutes} minutes). ` +
        `Gladia limits YouTube URLs to ${maxMinutes} minutes. Contact Gladia support for enterprise limits.`
      );
    }

    // Update document with video title
    await updateDocument(documentId, {
      title: videoInfo.title,
      description: videoInfo.description.slice(0, 200),
    } as any);

    // Get audio URL for Gladia (YouTube URL works directly)
    const audioUrl = getAudioUrl(videoId);

    // Transcribe with Gladia
    console.log(`\n🎙️  Starting Gladia transcription...`);
    logger.info({ videoId, audioUrl }, 'Starting Gladia transcription');
    const transcriptionResult = await transcribeAudio(audioUrl, {
      language: options.language || 'en',
      enableCodeSwitching: options.enableCodeSwitching ?? false,
      timeout: 1800000, // 30 minutes
    });

    console.log(`\n✅ Gladia transcription completed!`);
    console.log(`   Transcript length: ${transcriptionResult.fullText.length} chars`);
    console.log(`   Segments: ${transcriptionResult.segments.length}`);

    logger.info(
      {
        videoId,
        transcriptLength: transcriptionResult.fullText.length,
        segmentCount: transcriptionResult.segments.length,
      },
      'Gladia transcription completed'
    );

    // Enrich transcript with OpenAI
    console.log(`\n🤖 Enriching transcript with OpenAI...`);
    logger.info({ videoId }, 'Enriching transcript with OpenAI');
    const enrichedData = await enrichTranscriptWithAI(
      videoInfo,
      transcriptionResult.fullText
    );
    console.log(`✅ Enrichment complete`);

    // Build enriched meeting data
    const enrichedMeeting: EnrichedMeetingData = {
      videoId,
      title: videoInfo.title,
      channel: videoInfo.channel,
      publishedAt: videoInfo.publishedAt,
      duration: videoInfo.duration,
      url: videoInfo.url,
      transcript: transcriptionResult.fullText,
      transcriptSegments: transcriptionResult.segments,
      ...enrichedData,
    };

    // Build searchable content
    const meetingContent = buildMeetingContent(enrichedMeeting);

    // Chunk the content
    const chunks = chunkText(meetingContent, {
      maxTokens: options.chunkSize ?? 500,
      overlap: options.chunkOverlap ?? 50,
    });

    // Add metadata to chunks
    const chunksWithMetadata = chunks.map((chunk, index) => ({
      content: chunk.content,
      index,
      tokens: chunk.tokens,
      metadata: {
        ...chunk.metadata, // Keep original metadata (start_char, end_char, etc.)
        video_id: videoId,
        video_title: videoInfo.title,
        channel: videoInfo.channel,
        published_at: videoInfo.publishedAt,
        duration: videoInfo.duration,
        meeting_type: enrichedData.meetingType,
        departments: enrichedData.departments,
        topics: enrichedData.topics,
        keywords: enrichedData.keywords,
        category: enrichedData.category,
        priority_level: enrichedData.priorityLevel,
      },
    }));

    // Store content hash for deduplication
    const contentHash = createHash('sha256')
      .update(transcriptionResult.fullText)
      .digest('hex');

    await supabase.from('content_hashes').insert({
      url: videoInfo.url,
      content_hash: contentHash,
      document_id: documentId,
      chunk_count: chunksWithMetadata.length,
      content_length: transcriptionResult.fullText.length,
    });

    // Store chunks in database
    console.log(`\n💾 Storing ${chunksWithMetadata.length} chunks in database...`);
    await storeChunks(documentId, chunksWithMetadata);
    console.log(`✅ Chunks stored`);

    // Mark document as completed
    const totalTokens = chunksWithMetadata.reduce(
      (sum, chunk) => sum + chunk.tokens,
      0
    );
    console.log(`\n✅ Marking document as completed (${totalTokens} tokens)...`);
    await markDocumentCompleted(documentId, chunksWithMetadata.length, totalTokens);

    // Reset error count if this was a scheduled scrape
    if (scheduleId) {
      await supabase
        .from('scheduled_scrapes')
        .update({
          error_count: 0,
          error_message: null,
        })
        .eq('id', scheduleId);
    }

    logger.info(
      {
        videoId,
        documentId,
        chunkCount: chunksWithMetadata.length,
        totalTokens,
      },
      'Completed YouTube video processing'
    );

    return documentId;
  } catch (error) {
    logger.error({ error, url }, 'YouTube video processing failed');
    throw error;
  }
}

/**
 * Build searchable content from enriched meeting data
 */
function buildMeetingContent(meeting: EnrichedMeetingData): string {
  const sections: string[] = [];

  // Title and metadata
  sections.push(`# ${meeting.title}`);
  sections.push(`Channel: ${meeting.channel}`);
  sections.push(`Published: ${meeting.publishedAt}`);
  sections.push(`Duration: ${Math.floor(meeting.duration / 60)}m`);
  sections.push('');

  // Summary
  if (meeting.summary) {
    sections.push('## Summary');
    sections.push(meeting.summary);
    sections.push('');
  }

  // Searchable summary
  if (meeting.searchableSummary) {
    sections.push('## Key Points');
    sections.push(meeting.searchableSummary);
    sections.push('');
  }

  // Attendees
  if (meeting.attendees && meeting.attendees.length > 0) {
    sections.push('## Attendees');
    meeting.attendees.forEach((attendee) => {
      sections.push(
        `- ${attendee.name}${attendee.title ? ` (${attendee.title})` : ''}`
      );
    });
    sections.push('');
  }

  // Key decisions
  if (meeting.keyDecisions && meeting.keyDecisions.length > 0) {
    sections.push('## Key Decisions');
    meeting.keyDecisions.forEach((decision, idx) => {
      sections.push(`${idx + 1}. ${decision.decision}`);
      if (decision.context) {
        sections.push(`   Context: ${decision.context}`);
      }
      if (decision.votingResult) {
        sections.push(`   Vote: ${decision.votingResult}`);
      }
    });
    sections.push('');
  }

  // Action items
  if (meeting.actionItems && meeting.actionItems.length > 0) {
    sections.push('## Action Items');
    meeting.actionItems.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item.action}`);
      if (item.responsible) {
        sections.push(`   Responsible: ${item.responsible}`);
      }
      if (item.deadline) {
        sections.push(`   Deadline: ${item.deadline}`);
      }
    });
    sections.push('');
  }

  // Notable quotes
  if (meeting.notableQuotes && meeting.notableQuotes.length > 0) {
    sections.push('## Notable Quotes');
    meeting.notableQuotes.forEach((quote) => {
      sections.push(`"${quote.quote}"`);
      sections.push(`— ${quote.speaker}`);
      if (quote.context) {
        sections.push(`Context: ${quote.context}`);
      }
      sections.push('');
    });
  }

  // Topics
  if (meeting.topics && meeting.topics.length > 0) {
    sections.push('## Topics Discussed');
    meeting.topics.forEach((topic) => {
      sections.push(`- ${topic}`);
    });
    sections.push('');
  }

  // Keywords
  if (meeting.keywords && meeting.keywords.length > 0) {
    sections.push(`Keywords: ${meeting.keywords.join(', ')}`);
    sections.push('');
  }

  // Full transcript
  sections.push('## Full Transcript');
  sections.push(meeting.transcript);

  return sections.join('\n');
}
