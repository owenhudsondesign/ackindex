export async function extractTextFromPDF(file: Buffer): Promise<string> {
  try {
    // Use pdfjs-dist for better compatibility
    const pdfjsLib = await import('pdfjs-dist');
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: file,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
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
