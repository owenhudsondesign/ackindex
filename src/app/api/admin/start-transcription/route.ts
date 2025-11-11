import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Starts a transcription job with AssemblyAI given an upload URL
 */
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

    const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyAIKey) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio URL is required' },
        { status: 400 }
      );
    }

    // Start transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': assemblyAIKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        language_code: 'en_us',
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('AssemblyAI transcription error:', errorText);
      return NextResponse.json(
        { error: `AssemblyAI transcription request failed: ${transcriptResponse.status}` },
        { status: transcriptResponse.status }
      );
    }

    const transcriptData = await transcriptResponse.json();

    return NextResponse.json({
      success: true,
      transcriptId: transcriptData.id
    });
  } catch (error) {
    console.error('Start transcription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start transcription' },
      { status: 500 }
    );
  }
}
