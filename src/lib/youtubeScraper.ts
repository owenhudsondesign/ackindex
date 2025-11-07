/**
 * YouTube video scraping and transcription pipeline
 * Integrates with Apify orchestrator actor for processing YouTube meetings
 */

import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';
import {
  createDocument,
  updateDocument,
  storeChunks,
  markDocumentCompleted,
} from '@/lib/database';
import logger from '@/lib/logger';
import { chunkText } from '@/lib/chunking';
import { createHash } from 'crypto';

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

// Apify client
function getApifyClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN is not set');
  }
  return new ApifyClient({ token });
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
 * Process a YouTube URL through the orchestrator actor
 * This calls Actor 4 which automatically chains Actors 1, 2, and 3
 */
export async function processYouTubeUrl(schedule: {
  id: string;
  url: string;
  title?: string;
  priority: number;
  chunk_size?: number;
  chunk_overlap?: number;
  scrape_options?: any;
}): Promise<void> {
  try {
    logger.info({ url: schedule.url }, 'Starting YouTube video processing');

    // Create or find existing document
    let documentId: string;
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('source_url', schedule.url)
      .single();

    if (existingDoc) {
      documentId = existingDoc.id;
      await updateDocument(documentId, { status: 'processing' } as any);
    } else {
      const { data: scheduleData } = await supabase
        .from('scheduled_scrapes')
        .select('created_by')
        .eq('id', schedule.id)
        .single();

      const document = await createDocument({
        source_type: 'url',
        source_url: schedule.url,
        title: schedule.title || 'YouTube Video',
        created_by: scheduleData?.created_by,
      });
      documentId = document.id;
    }

    // Get API keys from environment
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    const transcriptionApiKey = process.env.DEEPGRAM_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const orchestratorActorId = process.env.YOUTUBE_ORCHESTRATOR_ACTOR_ID;

    if (!youtubeApiKey || !transcriptionApiKey || !openaiApiKey || !orchestratorActorId) {
      throw new Error('Missing required API keys or orchestrator actor ID');
    }

    // Prepare orchestrator input
    const orchestratorInput = {
      youtubeUrls: [schedule.url],
      youtubeApiKey,
      maxVideos: schedule.scrape_options?.maxVideos || 10,
      transcriptionService: schedule.scrape_options?.transcriptionService || 'deepgram',
      transcriptionApiKey,
      openaiApiKey,
      openaiModel: schedule.scrape_options?.openaiModel || 'gpt-4o-mini',
      enableEmbeddings: schedule.scrape_options?.enableEmbeddings !== false,
    };

    logger.info({ orchestratorActorId }, 'Calling YouTube orchestrator actor');

    // Call the orchestrator actor
    const client = getApifyClient();
    const run = await client.actor(orchestratorActorId).call(orchestratorInput, {
      memory: 4096,
      timeout: 7200, // 2 hours for large video batches
    });

    logger.info({ runId: run.id }, 'Orchestrator run started, waiting for completion');

    // Wait for completion (orchestrator already waits for sub-actors)
    await waitForOrchestratorCompletion(run.id, client);

    logger.info({ runId: run.id }, 'Orchestrator completed, fetching results');

    // Get enriched results from the orchestrator's dataset
    const dataset = client.dataset(run.defaultDatasetId);
    const { items: enrichedMeetings } = await dataset.listItems();

    if (!enrichedMeetings || enrichedMeetings.length === 0) {
      logger.warn({ url: schedule.url }, 'No videos were processed by orchestrator');
      await updateDocument(documentId, {
        status: 'completed',
        description: 'No videos found or processed',
      } as any);
      return;
    }

    logger.info(
      { videoCount: enrichedMeetings.length },
      'Processing enriched meeting data'
    );

    // Process enriched meetings and store in database
    await storeEnrichedMeetings(documentId, enrichedMeetings, schedule);

    // Reset error count on success
    await supabase
      .from('scheduled_scrapes')
      .update({
        error_count: 0,
        error_message: null,
      })
      .eq('id', schedule.id);

    logger.info(
      { url: schedule.url, videoCount: enrichedMeetings.length },
      'Completed YouTube video processing'
    );
  } catch (error) {
    logger.error({ error }, 'YouTube processing failed');
    throw error;
  }
}

/**
 * Wait for orchestrator actor to complete
 */
async function waitForOrchestratorCompletion(
  runId: string,
  client: ApifyClient,
  timeoutMs: number = 7200000 // 2 hours
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 10000; // Poll every 10 seconds

  while (true) {
    const run = await client.run(runId).get();

    if (run?.status === 'SUCCEEDED') {
      return;
    }

    if (run?.status === 'FAILED' || run?.status === 'ABORTED' || run?.status === 'TIMED-OUT') {
      throw new Error(`Orchestrator run ${run.status}: ${run?.statusMessage || 'Unknown error'}`);
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Orchestrator run timed out');
    }

    logger.info({ runId, status: run?.status }, 'Waiting for orchestrator...');
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

/**
 * Store enriched meeting data in the database
 */
async function storeEnrichedMeetings(
  documentId: string,
  enrichedMeetings: any[],
  schedule: {
    chunk_size?: number;
    chunk_overlap?: number;
  }
): Promise<void> {
  let allChunks: any[] = [];
  let totalTokens = 0;
  let fullContent = '';

  for (const meeting of enrichedMeetings) {
    // Build searchable content from meeting data
    const meetingContent = buildMeetingContent(meeting);
    fullContent += meetingContent + '\n\n---\n\n';

    // Chunk the meeting content
    const chunks = chunkText(meetingContent, {
      maxTokens: schedule.chunk_size ?? 500,
      overlap: schedule.chunk_overlap ?? 50,
    });

    // Add meeting-specific metadata to each chunk
    chunks.forEach((chunk) => {
      allChunks.push({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          video_id: meeting.videoId,
          video_title: meeting.title,
          channel: meeting.channel,
          published_at: meeting.publishedAt,
          duration: meeting.duration,
          meeting_type: meeting.meetingType,
          departments: meeting.departments,
          attendees: meeting.attendees,
          key_decisions: meeting.keyDecisions,
          action_items: meeting.actionItems,
          topics: meeting.topics,
          keywords: meeting.keywords,
          category: meeting.category,
          priority_level: meeting.priorityLevel,
        },
      });
      totalTokens += chunk.tokens;
    });

    // Store the full transcript as a separate metadata entry
    if (meeting.transcript) {
      allChunks.push({
        text: meeting.transcript,
        tokens: Math.ceil(meeting.transcript.length / 4),
        index: allChunks.length,
        metadata: {
          video_id: meeting.videoId,
          content_type: 'full_transcript',
          video_title: meeting.title,
        },
      });
    }
  }

  // Re-index all chunks
  allChunks = allChunks.map((chunk, index) => ({
    ...chunk,
    index,
  }));

  // Store content hash for deduplication
  if (fullContent.length > 0) {
    const contentHash = createHash('sha256').update(fullContent).digest('hex');
    await supabase.from('content_hashes').insert({
      url: enrichedMeetings[0]?.videoUrl || 'youtube-batch',
      content_hash: contentHash,
      document_id: documentId,
      chunk_count: allChunks.length,
      content_length: fullContent.length,
    });
  }

  // Store all chunks with embeddings
  if (allChunks.length > 0) {
    await storeChunks(documentId, allChunks);
  }

  // Update document with summary
  const firstMeeting = enrichedMeetings[0];
  await updateDocument(documentId, {
    title: enrichedMeetings.length === 1
      ? firstMeeting.title
      : `${firstMeeting.channel} - ${enrichedMeetings.length} videos`,
    description: firstMeeting.summary?.slice(0, 200),
  } as any);

  // Mark document as completed
  await markDocumentCompleted(documentId, allChunks.length, totalTokens);
}

/**
 * Build searchable content from enriched meeting data
 */
function buildMeetingContent(meeting: any): string {
  const sections: string[] = [];

  // Title and metadata
  sections.push(`# ${meeting.title}`);
  sections.push(`Channel: ${meeting.channel}`);
  sections.push(`Published: ${meeting.publishedAt}`);
  sections.push(`Duration: ${meeting.duration}`);
  sections.push('');

  // Summary
  if (meeting.summary) {
    sections.push('## Summary');
    sections.push(meeting.summary);
    sections.push('');
  }

  // Searchable summary (optimized for semantic search)
  if (meeting.searchableSummary) {
    sections.push('## Key Points');
    sections.push(meeting.searchableSummary);
    sections.push('');
  }

  // Attendees
  if (meeting.attendees && meeting.attendees.length > 0) {
    sections.push('## Attendees');
    meeting.attendees.forEach((attendee: any) => {
      sections.push(`- ${attendee.name}${attendee.title ? ` (${attendee.title})` : ''}`);
    });
    sections.push('');
  }

  // Key decisions
  if (meeting.keyDecisions && meeting.keyDecisions.length > 0) {
    sections.push('## Key Decisions');
    meeting.keyDecisions.forEach((decision: any, idx: number) => {
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
    meeting.actionItems.forEach((item: any, idx: number) => {
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
    meeting.notableQuotes.forEach((quote: any) => {
      sections.push(`"${quote.quote}"`);
      sections.push(`— ${quote.speaker}${quote.timestamp ? ` (${quote.timestamp})` : ''}`);
      if (quote.context) {
        sections.push(`Context: ${quote.context}`);
      }
      sections.push('');
    });
  }

  // Topics discussed
  if (meeting.topics && meeting.topics.length > 0) {
    sections.push('## Topics Discussed');
    meeting.topics.forEach((topic: any) => {
      sections.push(`- ${topic}`);
    });
    sections.push('');
  }

  // Keywords
  if (meeting.keywords && meeting.keywords.length > 0) {
    sections.push(`Keywords: ${meeting.keywords.join(', ')}`);
    sections.push('');
  }

  return sections.join('\n');
}
