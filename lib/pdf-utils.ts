export async function extractTextFromPDF(file: Buffer): Promise<string> {
  try {
    // Use unpdf - a modern, serverless-friendly PDF text extraction library
    const { extractText } = await import('unpdf');

    console.log('Starting PDF text extraction with unpdf...');

    // Convert Buffer to Uint8Array (unpdf requirement)
    const uint8Array = new Uint8Array(file);

    // Extract text from the PDF
    const { text, totalPages } = await extractText(uint8Array);

    // unpdf returns an array of strings (one per page), so join them
    const fullText = Array.isArray(text) ? text.join('\n') : text;

    console.log(`PDF extraction successful: ${totalPages} pages, ${fullText.length} characters`);

    if (!fullText || fullText.trim().length < 50) {
      throw new Error('Could not extract sufficient text from PDF. The PDF may be image-based or encrypted.');
    }

    return fullText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF: ' + (error as Error).message);
  }
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-z0-9_.-]/gi, '_')
    .toLowerCase();
}

export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

export function validateFileType(file: File): boolean {
  return file.type === 'application/pdf' || file.name.endsWith('.pdf');
}
