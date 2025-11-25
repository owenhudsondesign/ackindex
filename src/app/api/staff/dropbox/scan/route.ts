/**
 * Dropbox Folder Scan API
 *
 * Scans a shared Dropbox folder and returns list of video files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStaffUserFromRequest } from '@/lib/staffAuth';
import { listSharedFolderFiles, parseMetadataFromFilename } from '@/lib/dropbox';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/staff/dropbox/scan' });

export async function POST(request: NextRequest) {
  try {
    // Check staff authentication
    const session = await getStaffUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dropboxUrl } = body;

    if (!dropboxUrl) {
      return NextResponse.json(
        { error: 'Dropbox URL is required' },
        { status: 400 }
      );
    }

    log.info({ staffId: session.user.id, dropboxUrl }, 'Scanning Dropbox folder');

    // Scan the Dropbox folder
    const result = await listSharedFolderFiles(dropboxUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to scan Dropbox folder' },
        { status: 400 }
      );
    }

    // Parse metadata from filenames
    const filesWithMetadata = result.files.map(file => ({
      ...file,
      parsedMetadata: parseMetadataFromFilename(file.name),
      sizeFormatted: formatFileSize(file.size),
    }));

    log.info({
      staffId: session.user.id,
      fileCount: filesWithMetadata.length,
      totalSizeGB: (result.totalSize / 1024 / 1024 / 1024).toFixed(2),
    }, 'Dropbox scan complete');

    return NextResponse.json({
      success: true,
      folderName: result.folderName,
      files: filesWithMetadata,
      totalFiles: filesWithMetadata.length,
      totalSize: result.totalSize,
      totalSizeFormatted: formatFileSize(result.totalSize),
    });
  } catch (error) {
    log.error({ err: error }, 'Dropbox scan error');
    return NextResponse.json(
      { error: 'Failed to scan Dropbox folder' },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
