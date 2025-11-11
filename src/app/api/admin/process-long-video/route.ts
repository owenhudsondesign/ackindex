import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcribeWithAssemblyAI } from '@/lib/assemblyAITranscriber';
import { storeLongVideoTranscript } from '@/lib/longVideoProcessor';
import fs from 'fs';
import path from 'path';
import os from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const videoId = formData.get('videoId') as string;
    const audioFile = formData.get('audioFile') as File;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a'];
    if (!validTypes.includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav|m4a)$/i)) {
      return NextResponse.json(
        { error: 'Invalid audio file type. Please upload MP3, WAV, or M4A' },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB' },
        { status: 400 }
      );
    }

    // 1. Check if document exists for this video
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('source_url', videoUrl)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Document not found for video ID: ${videoId}. Please submit the video URL through normal processing first.` },
        { status: 404 }
      );
    }

    // 2. Update document status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', document.id);

    // 3. Save audio file to temp directory
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${videoId}-${Date.now()}.mp3`);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);

    // 4. Fetch video metadata from YouTube API
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found on YouTube');
    }

    const video = data.items[0];
    const videoInfo = {
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      description: video.snippet.description,
    };

    // 5. Start AssemblyAI transcription in background
    // Note: This is a simplified version. In production, you'd want to use a job queue
    // For now, we'll process synchronously with a timeout
    const transcription = await transcribeWithAssemblyAI(tempFilePath, {
      speaker_labels: true,
      language_code: 'en_us',
    });

    // 6. Store in database
    await storeLongVideoTranscript(
      document.id,
      videoId,
      {
        fullText: transcription.fullText,
        segments: transcription.segments,
        totalDuration: transcription.duration,
      },
      videoInfo
    );

    // 7. Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: 'Audio file processed successfully',
    });
  } catch (error) {
    console.error('Audio processing error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process audio file',
      },
      { status: 500 }
    );
  }
}
