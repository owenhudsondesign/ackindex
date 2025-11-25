/**
 * Dropbox Integration Utilities
 *
 * Handles listing files from shared folders and generating download URLs
 * for server-side batch import of video archives.
 */

import logger from './logger';

const log = logger.child({ module: 'dropbox' });

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: string;
  downloadUrl: string;
}

export interface DropboxScanResult {
  success: boolean;
  files: DropboxFile[];
  folderName: string;
  totalSize: number;
  error?: string;
}

/**
 * Extract shared link key from Dropbox URL
 * Supports formats:
 * - https://www.dropbox.com/sh/abc123/xyz?dl=0
 * - https://www.dropbox.com/scl/fo/abc123/xyz?dl=0
 * - https://www.dropbox.com/s/abc123/file.mp4?dl=0
 */
function parseDropboxUrl(url: string): { type: 'folder' | 'file'; url: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('dropbox.com')) {
      return null;
    }

    // Normalize the URL (remove dl parameter, we'll add it back as needed)
    parsed.searchParams.delete('dl');

    // Determine if it's a folder or file share
    const path = parsed.pathname;
    if (path.startsWith('/sh/') || path.startsWith('/scl/fo/')) {
      return { type: 'folder', url: parsed.toString() };
    } else if (path.startsWith('/s/') || path.startsWith('/scl/fi/')) {
      return { type: 'file', url: parsed.toString() };
    }

    return { type: 'folder', url: parsed.toString() };
  } catch {
    return null;
  }
}

/**
 * Convert a Dropbox shared link to a direct download URL
 */
export function getDirectDownloadUrl(sharedUrl: string): string {
  try {
    const url = new URL(sharedUrl);
    url.searchParams.set('dl', '1');
    return url.toString();
  } catch {
    // If URL parsing fails, try simple string replacement
    if (sharedUrl.includes('dl=0')) {
      return sharedUrl.replace('dl=0', 'dl=1');
    }
    return sharedUrl + (sharedUrl.includes('?') ? '&dl=1' : '?dl=1');
  }
}

/**
 * List files in a Dropbox shared folder using the API
 * Requires DROPBOX_ACCESS_TOKEN environment variable
 */
export async function listSharedFolderFiles(sharedLink: string): Promise<DropboxScanResult> {
  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    log.error('DROPBOX_ACCESS_TOKEN not configured');
    return {
      success: false,
      files: [],
      folderName: '',
      totalSize: 0,
      error: 'Dropbox integration not configured. Please set DROPBOX_ACCESS_TOKEN.',
    };
  }

  const parsed = parseDropboxUrl(sharedLink);
  if (!parsed) {
    return {
      success: false,
      files: [],
      folderName: '',
      totalSize: 0,
      error: 'Invalid Dropbox URL format',
    };
  }

  try {
    log.info({ sharedLink, type: parsed.type }, 'Scanning Dropbox folder');

    // Use Dropbox API to list shared link contents
    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '',
        shared_link: {
          url: parsed.url,
        },
        recursive: false,
        include_media_info: true,
        limit: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, error: errorText }, 'Dropbox API error');

      // Handle specific error cases
      if (response.status === 409) {
        // Try alternative: get shared link metadata first
        return await listViaSharedLinkMetadata(sharedLink, accessToken);
      }

      return {
        success: false,
        files: [],
        folderName: '',
        totalSize: 0,
        error: `Dropbox API error: ${response.status}`,
      };
    }

    const data = await response.json();

    // Filter for video files
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const videoFiles: DropboxFile[] = [];
    let totalSize = 0;

    for (const entry of data.entries || []) {
      if (entry['.tag'] !== 'file') continue;

      const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
      if (!videoExtensions.includes(ext)) continue;

      // Generate download URL for this file
      const fileDownloadUrl = await getSharedLinkFileDownload(
        parsed.url,
        entry.path_display || entry.path_lower,
        accessToken
      );

      videoFiles.push({
        id: entry.id,
        name: entry.name,
        path: entry.path_display || entry.path_lower,
        size: entry.size,
        modified: entry.client_modified || entry.server_modified,
        downloadUrl: fileDownloadUrl,
      });

      totalSize += entry.size;
    }

    log.info({
      fileCount: videoFiles.length,
      totalSizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2)
    }, 'Dropbox scan complete');

    return {
      success: true,
      files: videoFiles,
      folderName: data.entries?.[0]?.path_display?.split('/')[1] || 'Dropbox Folder',
      totalSize,
    };
  } catch (error) {
    log.error({ err: error }, 'Failed to scan Dropbox folder');
    return {
      success: false,
      files: [],
      folderName: '',
      totalSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error scanning Dropbox',
    };
  }
}

/**
 * Alternative method: Get folder contents via shared link metadata
 */
async function listViaSharedLinkMetadata(sharedLink: string, accessToken: string): Promise<DropboxScanResult> {
  try {
    // First get the shared link metadata
    const metadataResponse = await fetch('https://api.dropboxapi.com/2/sharing/get_shared_link_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: sharedLink,
      }),
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      log.error({ error: errorText }, 'Failed to get shared link metadata');
      return {
        success: false,
        files: [],
        folderName: '',
        totalSize: 0,
        error: 'Could not access Dropbox folder. Make sure the link is publicly shared.',
      };
    }

    const metadata = await metadataResponse.json();

    if (metadata['.tag'] === 'file') {
      // It's a single file, not a folder
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
      const ext = metadata.name.toLowerCase().substring(metadata.name.lastIndexOf('.'));

      if (!videoExtensions.includes(ext)) {
        return {
          success: false,
          files: [],
          folderName: '',
          totalSize: 0,
          error: 'The shared link points to a non-video file',
        };
      }

      return {
        success: true,
        files: [{
          id: metadata.id,
          name: metadata.name,
          path: metadata.path_lower || '/' + metadata.name,
          size: metadata.size,
          modified: metadata.client_modified || metadata.server_modified,
          downloadUrl: getDirectDownloadUrl(sharedLink),
        }],
        folderName: 'Single File',
        totalSize: metadata.size,
      };
    }

    // It's a folder - list its contents
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '',
        shared_link: { url: sharedLink },
        recursive: true, // Get all nested files too
        limit: 2000,
      }),
    });

    if (!listResponse.ok) {
      return {
        success: false,
        files: [],
        folderName: '',
        totalSize: 0,
        error: 'Could not list folder contents',
      };
    }

    const listData = await listResponse.json();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const videoFiles: DropboxFile[] = [];
    let totalSize = 0;

    for (const entry of listData.entries || []) {
      if (entry['.tag'] !== 'file') continue;

      const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
      if (!videoExtensions.includes(ext)) continue;

      const fileDownloadUrl = await getSharedLinkFileDownload(
        sharedLink,
        entry.path_display || entry.path_lower,
        accessToken
      );

      videoFiles.push({
        id: entry.id,
        name: entry.name,
        path: entry.path_display || entry.path_lower,
        size: entry.size,
        modified: entry.client_modified || entry.server_modified,
        downloadUrl: fileDownloadUrl,
      });

      totalSize += entry.size;
    }

    return {
      success: true,
      files: videoFiles,
      folderName: metadata.name || 'Dropbox Folder',
      totalSize,
    };
  } catch (error) {
    log.error({ err: error }, 'Failed to list via shared link metadata');
    return {
      success: false,
      files: [],
      folderName: '',
      totalSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a direct download link for a file within a shared folder
 */
async function getSharedLinkFileDownload(
  sharedLink: string,
  filePath: string,
  accessToken: string
): Promise<string> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/sharing/get_shared_link_file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          url: sharedLink,
          path: filePath,
        }),
      },
    });

    // The actual download would use content.dropboxapi.com
    // For now, construct a direct download URL
    const downloadUrl = new URL(sharedLink);
    downloadUrl.searchParams.set('dl', '1');

    // For files within a shared folder, we need to use the API download endpoint
    return `https://content.dropboxapi.com/2/sharing/get_shared_link_file`;
  } catch {
    // Fallback to direct link modification
    return getDirectDownloadUrl(sharedLink);
  }
}

/**
 * Download a file from Dropbox shared link
 * Returns a readable stream for piping to storage
 */
export async function downloadFromDropbox(
  sharedLink: string,
  filePath?: string
): Promise<{ stream: ReadableStream; size: number; filename: string } | null> {
  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    log.error('DROPBOX_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    const apiArg: any = { url: sharedLink };
    if (filePath) {
      apiArg.path = filePath;
    }

    const response = await fetch('https://content.dropboxapi.com/2/sharing/get_shared_link_file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify(apiArg),
      },
    });

    if (!response.ok) {
      log.error({ status: response.status }, 'Dropbox download failed');
      return null;
    }

    // Get metadata from response header
    const metadata = response.headers.get('Dropbox-API-Result');
    let filename = 'video.mp4';
    let size = 0;

    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        filename = parsed.name || filename;
        size = parsed.size || 0;
      } catch {
        // Use defaults
      }
    }

    if (!response.body) {
      return null;
    }

    return {
      stream: response.body,
      size,
      filename,
    };
  } catch (error) {
    log.error({ err: error }, 'Failed to download from Dropbox');
    return null;
  }
}

/**
 * Parse meeting metadata from filename
 * Attempts to extract date and meeting type from common naming patterns
 */
export function parseMetadataFromFilename(filename: string): {
  meetingTitle: string;
  meetingDate: string | null;
  boardOrCommittee: string;
} {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Common date patterns
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/, // 2024-01-15
    /(\d{2})-(\d{2})-(\d{4})/, // 01-15-2024
    /(\d{2})\.(\d{2})\.(\d{4})/, // 01.15.2024
    /(\d{1,2})[-_](\d{1,2})[-_](\d{2,4})/, // 1-15-24 or 1_15_2024
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/, // January 15, 2024
  ];

  let meetingDate: string | null = null;
  let remainingName = nameWithoutExt;

  // Try to extract date
  for (const pattern of datePatterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      // Attempt to parse and normalize the date
      try {
        let year: number, month: number, day: number;

        if (match[1].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else if (match[3].length === 4) {
          // MM-DD-YYYY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else if (match[3].length === 2) {
          // MM-DD-YY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = 2000 + parseInt(match[3]);
        } else if (isNaN(parseInt(match[1]))) {
          // Month name format
          const monthNames: Record<string, number> = {
            january: 1, february: 2, march: 3, april: 4,
            may: 5, june: 6, july: 7, august: 8,
            september: 9, october: 10, november: 11, december: 12,
            jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7,
            aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
          };
          month = monthNames[match[1].toLowerCase()] || 1;
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else {
          continue;
        }

        if (year && month && day && month <= 12 && day <= 31) {
          meetingDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          remainingName = nameWithoutExt.replace(match[0], '').trim();
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Common board/committee patterns
  const boardPatterns = [
    { pattern: /select\s*board/i, name: 'Select Board' },
    { pattern: /town\s*meeting/i, name: 'Town Meeting' },
    { pattern: /planning\s*board/i, name: 'Planning Board' },
    { pattern: /zoning\s*board/i, name: 'Zoning Board of Appeals' },
    { pattern: /finance\s*committee/i, name: 'Finance Committee' },
    { pattern: /school\s*committee/i, name: 'School Committee' },
    { pattern: /conservation/i, name: 'Conservation Commission' },
    { pattern: /board\s*of\s*health/i, name: 'Board of Health' },
    { pattern: /historic/i, name: 'Historic District Commission' },
    { pattern: /council\s*on\s*aging/i, name: 'Council on Aging' },
  ];

  let boardOrCommittee = '';
  for (const { pattern, name } of boardPatterns) {
    if (pattern.test(remainingName)) {
      boardOrCommittee = name;
      break;
    }
  }

  // Clean up the meeting title
  let meetingTitle = remainingName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If we found a board type, use it as part of the title
  if (boardOrCommittee && !meetingTitle.toLowerCase().includes(boardOrCommittee.toLowerCase())) {
    meetingTitle = boardOrCommittee + (meetingDate ? '' : ' Meeting');
  }

  // Default title if empty
  if (!meetingTitle) {
    meetingTitle = 'Town Meeting';
  }

  return {
    meetingTitle,
    meetingDate,
    boardOrCommittee,
  };
}
