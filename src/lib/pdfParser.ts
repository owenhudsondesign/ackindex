/**
 * PDF Parsing Utilities
 * 
 * Uses OpenAI to extract and summarize text from PDF files.
 */

import OpenAI from 'openai';
import { cleanText, extractMetadata } from './chunking';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedPDF {
  text: string;
  title?: string;
  description?: string;
  pages?: number;
  metadata: Record<string, any>;
}

/**
 * Extract text from PDF buffer using pdf-parse
 * Note: This is a simplified version. In production, you'd want more robust parsing.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  pages: number;
  metadata: Record<string, any>;
}> {
  // For now, we'll use a simple approach with pdf-parse
  // You may need to install: npm install pdf-parse
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.info || {},
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Use OpenAI to clean and structure extracted PDF text
 */
async function enhanceWithAI(rawText: string): Promise<{
  cleanedText: string;
  title?: string;
  summary?: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a document processing assistant. Your job is to:
1. Clean up OCR or extracted text from PDFs
2. Fix obvious errors and formatting issues
3. Preserve the original meaning and structure
4. Extract a title if present
5. Do NOT summarize or change the content significantly

Return JSON with:
{
  "cleanedText": "the cleaned text",
  "title": "document title if found",
  "summary": "one sentence summary"
}`,
        },
        {
          role: 'user',
          content: `Clean and structure this extracted PDF text:\n\n${rawText.slice(0, 4000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      cleanedText: result.cleanedText || rawText,
      title: result.title,
      summary: result.summary,
    };
  } catch (error) {
    console.error('AI enhancement error:', error);
    // Fallback: just return cleaned text
    return {
      cleanedText: cleanText(rawText),
    };
  }
}

/**
 * Parse a PDF file and extract structured content
 * 
 * @param fileBuffer - PDF file as Buffer
 * @param filename - Original filename
 * @param useAI - Whether to use AI for text enhancement (default: true)
 * @returns Parsed PDF data
 */
export async function parsePDF(
  fileBuffer: Buffer,
  filename: string,
  useAI: boolean = true
): Promise<ParsedPDF> {
  console.log(`[PDF Parser] Starting parse for: ${filename}`);

  // Step 1: Extract raw text from PDF
  const { text: rawText, pages, metadata } = await extractTextFromPDF(fileBuffer);
  
  console.log(`[PDF Parser] Extracted ${rawText.length} characters from ${pages} pages`);

  if (!rawText || rawText.trim().length === 0) {
    throw new Error('PDF appears to be empty or contains no extractable text');
  }

  let finalText = rawText;
  let title: string | undefined;
  let description: string | undefined;

  // Step 2: Use AI to enhance text (optional but recommended)
  // For large documents, skip AI enhancement to avoid truncation
  if (useAI && rawText.length > 100 && rawText.length < 50000) {
    try {
      const enhanced = await enhanceWithAI(rawText);
      // Only use AI enhancement for title/summary, keep full raw text
      title = enhanced.title;
      description = enhanced.summary;
      finalText = cleanText(rawText); // Use full cleaned text, not truncated AI version

      console.log(`[PDF Parser] AI enhancement complete (metadata only)`);
    } catch (error) {
      console.error('[PDF Parser] AI enhancement failed, using raw text:', error);
      finalText = cleanText(rawText);
    }
  } else {
    console.log(`[PDF Parser] Skipping AI enhancement (document too large), using raw text`);
    finalText = cleanText(rawText);
  }

  // Step 3: Extract metadata if not found by AI
  if (!title || !description) {
    const extracted = extractMetadata(finalText);
    title = title || extracted.title || filename.replace('.pdf', '');
    description = description || extracted.description;
  }

  return {
    text: finalText,
    title,
    description,
    pages,
    metadata: {
      ...metadata,
      originalFilename: filename,
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Validate PDF file
 */
export function validatePDFFile(
  file: File | Buffer,
  maxSizeBytes: number = 200 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (file instanceof File) {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeBytes / 1024 / 1024}MB`,
      };
    }
  } else {
    // Buffer validation
    if (file.length > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeBytes / 1024 / 1024}MB`,
      };
    }

    // Check PDF magic number
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    if (!file.slice(0, 4).equals(pdfHeader)) {
      return { valid: false, error: 'File does not appear to be a valid PDF' };
    }
  }

  return { valid: true };
}
