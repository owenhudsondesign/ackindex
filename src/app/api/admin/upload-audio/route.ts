import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Proxy endpoint that uploads audio to AssemblyAI
 * Uses edge runtime to handle streaming without body size limits
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

    // Stream the request body directly to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': assemblyAIKey,
      },
      body: req.body,
      duplex: 'half',
    } as RequestInit);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('AssemblyAI upload error:', errorText);
      return NextResponse.json(
        { error: `AssemblyAI upload failed: ${uploadResponse.status}` },
        { status: uploadResponse.status }
      );
    }

    const uploadData = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      upload_url: uploadData.upload_url
    });
  } catch (error) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
