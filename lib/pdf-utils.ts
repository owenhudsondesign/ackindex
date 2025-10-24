export async function extractTextFromPDF(file: Buffer): Promise<string> {
  try {
    // Use pdfjs-dist legacy build for Node.js/serverless environments
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    console.log('Starting PDF text extraction...');

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(file),
      useSystemFonts: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/',
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`PDF loaded with ${numPages} pages`);

    // Extract text from all pages
    let fullText = '';
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    console.log('PDF extraction successful, text length:', fullText.length);
    return fullText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
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
