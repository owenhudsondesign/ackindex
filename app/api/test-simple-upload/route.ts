import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('Simple upload test endpoint called');
    
    return NextResponse.json({
      success: true,
      message: 'Upload API endpoint is accessible',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Simple upload test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}
