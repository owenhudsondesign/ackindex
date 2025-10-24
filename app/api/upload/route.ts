import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { extractTextFromPDF, sanitizeFileName, validateFileSize, validateFileType } from '@/lib/pdf-utils';
import { parseDocumentWithClaude } from '@/lib/ai-parser';

export const runtime = 'nodejs';
export const maxDuration = 60; // Max 60 seconds for parsing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const source = formData.get('source') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!validateFileType(file)) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    if (!validateFileSize(file, 10)) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(buffer);

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract sufficient text from PDF' },
        { status: 400 }
      );
    }

    // Parse with AI
    const parsedData = await parseDocumentWithClaude(extractedText, {
      title,
      category,
      source,
    });

    // Upload PDF to Supabase Storage
    const supabase = getServiceSupabase();
    const sanitizedFileName = sanitizeFileName(file.name);
    const filePath = `documents/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('civic-documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue even if upload fails - we have the parsed data
    }

    // Store parsed data in database
    const { data: insertedEntry, error: dbError } = await supabase
      .from('entries')
      .insert({
        title: parsedData.title,
        source: parsedData.source,
        category: parsedData.category,
        summary: parsedData.summary,
        key_metrics: parsedData.key_metrics,
        visualizations: parsedData.visualizations,
        notable_updates: parsedData.notable_updates,
        date_published: parsedData.date_published,
        document_excerpt: parsedData.document_excerpt,
        file_path: filePath,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store parsed data', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entry: insertedEntry,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}
