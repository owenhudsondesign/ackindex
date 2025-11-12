import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

interface PageProps {
  params: Promise<{
    documentId: string;
  }>;
}

/**
 * GET /api/transcripts/[documentId]
 * Get full transcript and chunks for a document
 */
export async function GET(request: NextRequest, { params }: PageProps) {
  const log = logger.child({ endpoint: '/api/transcripts/:documentId' });

  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, text, srt
    const includeTimestamps = searchParams.get('timestamps') !== 'false';
    const searchQuery = searchParams.get('search');

    const supabase = await createClient();

    // If search query provided, use search function
    if (searchQuery) {
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_document_transcript',
        {
          doc_id: documentId,
          search_query: searchQuery,
        }
      );

      if (searchError) {
        log.error({ err: searchError }, 'Failed to search transcript');
        return NextResponse.json(
          { error: 'Failed to search transcript' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        documentId,
        query: searchQuery,
        results: searchResults || [],
      });
    }

    // Get full transcript
    const { data: transcriptData, error: transcriptError } = await supabase.rpc(
      'get_full_transcript',
      { doc_id: documentId }
    );

    if (transcriptError) {
      log.error({ err: transcriptError }, 'Failed to fetch transcript');
      return NextResponse.json(
        { error: 'Failed to fetch transcript' },
        { status: 500 }
      );
    }

    if (!transcriptData || transcriptData.length === 0) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    const transcript = transcriptData[0];

    // Get chunks with metadata if needed
    let chunks = null;
    if (includeTimestamps || format === 'srt') {
      const { data: chunksData, error: chunksError } = await supabase.rpc(
        'get_transcript_chunks',
        { doc_id: documentId }
      );

      if (chunksError) {
        log.warn({ err: chunksError }, 'Failed to fetch chunk metadata');
      } else {
        chunks = chunksData;
      }
    }

    // Format response based on requested format
    if (format === 'text') {
      return new NextResponse(transcript.full_text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="transcript-${documentId}.txt"`,
        },
      });
    }

    if (format === 'srt' && chunks) {
      const srtContent = generateSRT(chunks);
      return new NextResponse(srtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="transcript-${documentId}.srt"`,
        },
      });
    }

    if (format === 'vtt' && chunks) {
      const vttContent = generateVTT(chunks);
      return new NextResponse(vttContent, {
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Content-Disposition': `attachment; filename="transcript-${documentId}.vtt"`,
        },
      });
    }

    // Default JSON response
    return NextResponse.json({
      success: true,
      documentId,
      transcript: {
        fullText: transcript.full_text,
        totalChunks: transcript.total_chunks,
        hasTimestamps: transcript.has_timestamps,
      },
      chunks: includeTimestamps ? chunks : null,
    });
  } catch (error) {
    log.error({ err: error }, 'Transcript endpoint error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate SRT format from transcript chunks
 */
function generateSRT(chunks: any[]): string {
  let srt = '';
  let index = 1;

  for (const chunk of chunks) {
    if (chunk.start_time !== null && chunk.end_time !== null) {
      const startTime = formatSRTTime(chunk.start_time);
      const endTime = formatSRTTime(chunk.end_time);

      srt += `${index}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${chunk.content}\n\n`;
      index++;
    }
  }

  return srt;
}

/**
 * Generate WebVTT format from transcript chunks
 */
function generateVTT(chunks: any[]): string {
  let vtt = 'WEBVTT\n\n';

  for (const chunk of chunks) {
    if (chunk.start_time !== null && chunk.end_time !== null) {
      const startTime = formatVTTTime(chunk.start_time);
      const endTime = formatVTTTime(chunk.end_time);

      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${chunk.content}\n\n`;
    }
  }

  return vtt;
}

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

/**
 * Format seconds to WebVTT timestamp (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(millis, 3)}`;
}

/**
 * Pad number with zeros
 */
function pad(num: number, size: number): string {
  return num.toString().padStart(size, '0');
}
