import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/adminAuth';
import { scrapingQueue } from '@/lib/queues';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

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
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    const isValidType = validTypes.includes(audioFile.type) || audioFile.name.match(/\.(mp3|wav|m4a)$/i);

    if (!isValidType) {
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

    // Check if document exists for this video
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('source_url', videoUrl)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Document not found for video ID: ${videoId}. Please submit the video URL through the YouTube processor first.` },
        { status: 404 }
      );
    }

    // Convert audio file to base64 for storage in job queue
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    // Update document status to queued
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', document.id);

    // Queue the job for background processing
    const job = await scrapingQueue.add('process-long-video', {
      documentId: document.id,
      videoId,
      audioFileBase64: base64Audio,
      fileName: audioFile.name,
      fileSize: audioFile.size,
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      jobId: job.id,
      message: 'Audio file uploaded successfully. Processing will begin shortly and may take 15-30 minutes.',
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
