/**
 * Bulk PDF Upload Script
 *
 * Upload multiple PDFs from a folder to AckIndex
 * Run with: npx tsx scripts/bulk-upload-pdfs.ts /path/to/pdfs
 *
 * Optional flags:
 *   --recursive  : Include PDFs in subdirectories
 *   --max N      : Upload max N files (default: unlimited)
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve, basename, join } from 'path';
import { readdir, stat } from 'fs/promises';
import { createReadStream, statSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface UploadResult {
  filename: string;
  success: boolean;
  documentId?: string;
  error?: string;
  size: number;
}

async function findPDFs(dirPath: string, recursive: boolean = false): Promise<string[]> {
  const pdfs: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory() && recursive) {
        const subPdfs = await findPDFs(fullPath, recursive);
        pdfs.push(...subPdfs);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return pdfs;
}

async function uploadPDF(filePath: string, apiUrl: string): Promise<UploadResult> {
  const filename = basename(filePath);

  try {
    // Get file size
    const stats = statSync(filePath);
    const sizeInMB = stats.size / 1024 / 1024;

    console.log(`  📤 Uploading: ${filename} (${sizeInMB.toFixed(2)} MB)`);

    // Create form data
    const formData = new FormData();
    formData.append('file', createReadStream(filePath), {
      filename: filename,
      contentType: 'application/pdf',
    });

    // Upload to API
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      filename,
      success: true,
      documentId: result.documentId,
      size: stats.size,
    };
  } catch (error) {
    return {
      filename,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      size: 0,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let folderPath = args.find(arg => !arg.startsWith('--'));
  const recursive = args.includes('--recursive');
  const maxFilesArg = args.findIndex(arg => arg === '--max');
  const maxFiles = maxFilesArg >= 0 ? parseInt(args[maxFilesArg + 1]) : Infinity;

  if (!folderPath) {
    console.error('❌ No folder path provided!\n');
    console.log('Usage: npx tsx scripts/bulk-upload-pdfs.ts /path/to/pdfs [options]\n');
    console.log('Options:');
    console.log('  --recursive    Include PDFs in subdirectories');
    console.log('  --max N        Upload maximum N files\n');
    console.log('Examples:');
    console.log('  npx tsx scripts/bulk-upload-pdfs.ts ~/Downloads/pdfs');
    console.log('  npx tsx scripts/bulk-upload-pdfs.ts ~/Documents --recursive --max 10');
    process.exit(1);
  }

  // Resolve to absolute path
  folderPath = resolve(folderPath);

  console.log('📁 Bulk PDF Upload\n');
  console.log('─'.repeat(80));
  console.log(`Folder: ${folderPath}`);
  console.log(`Recursive: ${recursive ? 'Yes' : 'No'}`);
  console.log(`Max files: ${maxFiles === Infinity ? 'Unlimited' : maxFiles}`);
  console.log('─'.repeat(80));
  console.log('');

  // Check if folder exists
  try {
    const stats = await stat(folderPath);
    if (!stats.isDirectory()) {
      console.error(`❌ Not a directory: ${folderPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Cannot access folder: ${folderPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Find all PDFs
  console.log('🔍 Scanning for PDF files...\n');
  const pdfFiles = await findPDFs(folderPath, recursive);

  if (pdfFiles.length === 0) {
    console.log('⚠️  No PDF files found in the specified folder.');
    process.exit(0);
  }

  const filesToUpload = pdfFiles.slice(0, maxFiles);

  console.log(`Found ${pdfFiles.length} PDF file(s)`);
  if (filesToUpload.length < pdfFiles.length) {
    console.log(`Limiting to first ${filesToUpload.length} file(s)\n`);
  } else {
    console.log('');
  }

  // Get API URL from environment or use default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/admin/upload-pdf`;

  console.log('─'.repeat(80));
  console.log(`🚀 Starting upload to: ${apiUrl}\n`);

  // Upload each file
  const results: UploadResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < filesToUpload.length; i++) {
    const filePath = filesToUpload[i];
    console.log(`[${i + 1}/${filesToUpload.length}]`);

    const result = await uploadPDF(filePath, apiUrl);
    results.push(result);

    if (result.success) {
      console.log(`  ✅ Success! Document ID: ${result.documentId}`);
      successCount++;
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
      failCount++;
    }

    console.log('');

    // Add a small delay between uploads to avoid overwhelming the server
    if (i < filesToUpload.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('─'.repeat(80));
  console.log('📊 Upload Summary\n');
  console.log(`Total files: ${filesToUpload.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (successCount > 0) {
    const totalSize = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.size, 0);
    console.log(`📦 Total size uploaded: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }

  if (failCount > 0) {
    console.log('\n⚠️  Failed uploads:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.filename}: ${r.error}`);
      });
  }

  console.log('\n✅ Batch upload complete!');
  console.log('\nNote: PDFs are being processed in the background.');
  console.log('Check your admin dashboard to see processing status.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
