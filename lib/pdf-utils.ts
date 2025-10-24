export async function extractTextFromPDF(file: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid build-time issues
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(file);
    return data.text;
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
