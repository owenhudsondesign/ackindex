/**
 * Long Video Processor - Manual Chunking Support
 *
 * Handles videos over 120 minutes that need to be manually chunked and processed
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import logger from '@/lib/logger';
import { chunkText } from '@/lib/chunking';
import { storeChunks, markDocumentCompleted } from '@/lib/database';
import { enrichTranscriptWithAI, buildMeetingContent } from './youtubeGladiaScraper';
import type { GladiaTranscriptionSegment } from './gladiaTranscriber';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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

export interface ChunkTranscript {
  fullText: string;
  segments: GladiaTranscriptionSegment[];
  duration: number;
  offsetSeconds: number; // Time offset for this chunk
}

/**
 * Upload an audio file directly to Gladia API
 * Used for manual chunking of long videos
 */
export async function uploadAudioFileToGladia(
  filePath: string,
  options: {
    language?: string;
    enableCodeSwitching?: boolean;
  } = {}
): Promise<{ id: string; resultUrl: string }> {
  const apiKey = process.env.GLADIA_API_KEY;

  if (!apiKey) {
    throw new Error('GLADIA_API_KEY is not set');
  }

  console.log(`\n🎙️  [GLADIA FILE UPLOAD] Starting transcription`);
  console.log(`   File: ${path.basename(filePath)}`);
  console.log(`   Language: ${options.language || 'auto-detect'}`);

  logger.info({ filePath }, 'Uploading audio file to Gladia');

  try {
    // Read file
    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);

    console.log(`   File size: ${fileSizeMB} MB`);

    // Create form data
    const formData = new FormData();
    formData.append('audio', fileStream, {
      filename: path.basename(filePath),
      contentType: 'audio/mpeg', // Adjust based on actual file type
    });

    // Add language config if specified
    if (options.language || options.enableCodeSwitching) {
      formData.append('language_config', JSON.stringify({
        languages: options.language ? [options.language] : [],
        code_switching: options.enableCodeSwitching ?? false,
      }));
    }

    // Upload to Gladia
    const response = await fetch('https://api.gladia.io/v2/pre-recorded', {
      method: 'POST',
      headers: {
        'x-gladia-key': apiKey,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gladia file upload error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    console.log(`✅ [GLADIA FILE UPLOAD] Upload successful`);
    console.log(`   Transcription ID: ${result.id}`);

    logger.info({ transcriptionId: result.id }, 'Audio file uploaded to Gladia');

    return {
      id: result.id,
      resultUrl: result.result_url || `https://api.gladia.io/v2/pre-recorded/${result.id}`,
    };
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to upload audio file to Gladia');
    throw error;
  }
}

/**
 * Wait for Gladia transcription to complete and return results
 */
export async function waitForGladiaFileTranscription(
  transcriptionId: string,
  pollInterval: number = 5000,
  timeout: number = 1800000 // 30 minutes
): Promise<{
  fullText: string;
  segments: GladiaTranscriptionSegment[];
  duration: number;
}> {
  const apiKey = process.env.GLADIA_API_KEY;

  if (!apiKey) {
    throw new Error('GLADIA_API_KEY is not set');
  }

  const startTime = Date.now();

  console.log(`\n⏳ [GLADIA] Waiting for transcription (ID: ${transcriptionId})...`);

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(`Gladia transcription timed out after ${timeout}ms`);
    }

    // Get status
    const response = await fetch(
      `https://api.gladia.io/v2/pre-recorded/${transcriptionId}`,
      {
        method: 'GET',
        headers: {
          'x-gladia-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gladia API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // Check if done
    if (result.status === 'done') {
      console.log(`✅ [GLADIA] Transcription completed`);

      const transcription = result.result?.transcription;
      if (!transcription) {
        throw new Error('Transcription result not available');
      }

      const segments: GladiaTranscriptionSegment[] =
        transcription.utterances?.map((utterance: any) => ({
          text: utterance.text,
          start: utterance.start,
          end: utterance.end,
          speaker: utterance.speaker,
          confidence: utterance.confidence,
        })) || [];

      return {
        fullText: transcription.full_transcript || '',
        segments,
        duration: result.result?.metadata?.audio_duration || 0,
      };
    }

    // Check if error
    if (result.status === 'error') {
      const errorMessage = result.error?.message || 'Unknown transcription error';
      throw new Error(`Gladia transcription failed: ${errorMessage}`);
    }

    // Log status and wait
    console.log(`   Status: ${result.status} (checking again in ${pollInterval/1000}s)`);
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

/**
 * Merge multiple chunk transcripts into a single transcript with adjusted timestamps
 */
export function mergeChunkTranscripts(chunks: ChunkTranscript[]): {
  fullText: string;
  segments: GladiaTranscriptionSegment[];
  totalDuration: number;
} {
  console.log(`\n🔗 Merging ${chunks.length} transcript chunks...`);

  const fullText = chunks.map(chunk => chunk.fullText).join('\n\n');

  const segments: GladiaTranscriptionSegment[] = [];
  for (const chunk of chunks) {
    const adjustedSegments = chunk.segments.map(seg => ({
      ...seg,
      start: seg.start + chunk.offsetSeconds,
      end: seg.end + chunk.offsetSeconds,
    }));
    segments.push(...adjustedSegments);
  }

  const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration, 0);

  console.log(`✅ Merged transcript:`);
  console.log(`   Total length: ${fullText.length} characters`);
  console.log(`   Total segments: ${segments.length}`);
  console.log(`   Total duration: ${Math.floor(totalDuration/60)} minutes`);

  return {
    fullText,
    segments,
    totalDuration,
  };
}

/**
 * Process and store a long video transcript in the database
 */
export async function storeLongVideoTranscript(
  documentId: string,
  videoId: string,
  mergedTranscript: {
    fullText: string;
    segments: GladiaTranscriptionSegment[];
    totalDuration: number;
  },
  videoInfo: {
    title: string;
    channel: string;
    publishedAt: string;
    description: string;
  }
): Promise<void> {
  console.log(`\n💾 Storing transcript for document ${documentId}...`);

  // Import enrichment function
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Enrich transcript with OpenAI
  console.log(`\n🤖 Enriching transcript with AI...`);

  const enrichmentPrompt = `Analyze this meeting transcript and extract structured information.

Video Title: ${videoInfo.title}
Channel: ${videoInfo.channel}
Description: ${videoInfo.description}

Transcript:
${mergedTranscript.fullText.slice(0, 30000)} ${mergedTranscript.fullText.length > 30000 ? '...(truncated)' : ''}

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
        content: enrichmentPrompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const enrichedData = JSON.parse(response.choices[0].message.content || '{}');
  console.log(`✅ Enrichment complete`);

  // Build searchable summary content
  const summaryContent = `# ${videoInfo.title}

Channel: ${videoInfo.channel}
Published: ${videoInfo.publishedAt}
Duration: ${Math.floor(mergedTranscript.totalDuration / 60)}m

## Summary
${enrichedData.summary || ''}

## Key Points
${enrichedData.searchableSummary || ''}

${enrichedData.keyDecisions?.length ? `## Key Decisions
${enrichedData.keyDecisions.map((d: any, i: number) => `${i+1}. ${d.decision}${d.votingResult ? ` (Vote: ${d.votingResult})` : ''}`).join('\n')}
` : ''}

${enrichedData.actionItems?.length ? `## Action Items
${enrichedData.actionItems.map((a: any, i: number) => `${i+1}. ${a.action}${a.responsible ? ` (${a.responsible})` : ''}`).join('\n')}
` : ''}

${enrichedData.topics?.length ? `## Topics Discussed
${enrichedData.topics.map((t: string) => `- ${t}`).join('\n')}
` : ''}`;

  // Create hybrid chunks: summary chunks + transcript chunks
  const allChunks = [];

  // Summary chunks
  const summaryChunks = chunkText(summaryContent, {
    maxTokens: 1000,
    overlap: 50,
  });

  allChunks.push(...summaryChunks.map((chunk, index) => ({
    content: chunk.content,
    index: allChunks.length + index,
    tokens: chunk.tokens,
    metadata: {
      ...chunk.metadata,
      video_id: videoId,
      video_title: videoInfo.title,
      channel: videoInfo.channel,
      published_at: videoInfo.publishedAt,
      created_at: videoInfo.publishedAt,
      duration: mergedTranscript.totalDuration,
      meeting_type: enrichedData.meetingType,
      departments: enrichedData.departments,
      topics: enrichedData.topics,
      keywords: enrichedData.keywords,
      category: enrichedData.category,
      priority_level: enrichedData.priorityLevel,
      chunk_type: 'summary',
    },
  })));

  // Transcript chunks
  const transcriptChunks = chunkText(mergedTranscript.fullText, {
    maxTokens: 500,
    overlap: 50,
  });

  allChunks.push(...transcriptChunks.map((chunk, index) => ({
    content: chunk.content,
    index: allChunks.length + index,
    tokens: chunk.tokens,
    metadata: {
      ...chunk.metadata,
      video_id: videoId,
      video_title: videoInfo.title,
      channel: videoInfo.channel,
      published_at: videoInfo.publishedAt,
      created_at: videoInfo.publishedAt,
      duration: mergedTranscript.totalDuration,
      meeting_type: enrichedData.meetingType,
      topics: enrichedData.topics,
      category: enrichedData.category,
      chunk_type: 'transcript',
    },
  })));

  console.log(`\n📊 Created ${allChunks.length} total chunks:`);
  console.log(`   Summary chunks: ${summaryChunks.length}`);
  console.log(`   Transcript chunks: ${transcriptChunks.length}`);

  // Store content hash
  const contentHash = createHash('sha256')
    .update(mergedTranscript.fullText)
    .digest('hex');

  await supabase.from('content_hashes').insert({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    content_hash: contentHash,
    document_id: documentId,
    chunk_count: allChunks.length,
    content_length: mergedTranscript.fullText.length,
  });

  // Store chunks
  console.log(`\n💾 Storing ${allChunks.length} chunks in database...`);
  await storeChunks(documentId, allChunks);
  console.log(`✅ Chunks stored`);

  // Mark document as completed
  const totalTokens = allChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
  console.log(`\n✅ Marking document as completed (${totalTokens} tokens)...`);
  await markDocumentCompleted(documentId, allChunks.length, totalTokens);

  logger.info(
    { documentId, videoId, chunkCount: allChunks.length, totalTokens },
    'Long video transcript stored successfully'
  );
}
