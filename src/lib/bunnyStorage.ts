/**
 * Bunny.net Storage Integration
 *
 * Handles video uploads to Bunny Storage + CDN delivery
 *
 * Cost: $0.005/GB/month storage + $0.01/GB bandwidth
 *
 * Setup Required:
 * 1. Create Storage Zone at bunny.net
 * 2. Create Pull Zone (CDN) linked to storage
 * 3. Get Access Key from storage zone settings
 * 4. Add env variables to .env.local
 */

import logger from './logger';

interface BunnyConfig {
  storageZoneName: string;
  accessKey: string;
  pullZoneUrl: string;
  storageRegion?: string; // 'de' for Germany/EU, 'ny' for USA, 'la' for Asia
}

interface UploadOptions {
  onProgress?: (percent: number) => void;
  contentType?: string;
}

interface UploadResult {
  success: boolean;
  storageUrl: string;
  cdnUrl: string;
  fileSize: number;
  error?: string;
}

class BunnyStorage {
  private config: BunnyConfig | null = null;
  private baseUrl: string = '';

  constructor() {
    // Don't initialize immediately - wait for first use
    // This allows env vars to be loaded by dotenv first
  }

  private initializeConfig() {
    if (this.config) {
      return; // Already initialized
    }

    // Load config from environment variables
    this.config = {
      storageZoneName: process.env.BUNNY_STORAGE_ZONE || '',
      accessKey: process.env.BUNNY_ACCESS_KEY || '',
      pullZoneUrl: process.env.BUNNY_PULL_ZONE_URL || '',
      storageRegion: process.env.BUNNY_STORAGE_REGION || 'ny', // Default to New York
    };

    if (!this.config.storageZoneName || !this.config.accessKey) {
      throw new Error('Bunny.net credentials not configured. Check BUNNY_STORAGE_ZONE and BUNNY_ACCESS_KEY env variables.');
    }

    // Construct base URL based on region
    // Region-specific endpoints:
    // NY (New York): https://ny.storage.bunnycdn.com/{storageZoneName}
    // LA (Los Angeles): https://la.storage.bunnycdn.com/{storageZoneName}
    // SG (Singapore): https://sg.storage.bunnycdn.com/{storageZoneName}
    // DE (Germany): https://storage.bunnycdn.com/{storageZoneName}
    // UK (London): https://uk.storage.bunnycdn.com/{storageZoneName}
    const regionPrefix = this.config.storageRegion && this.config.storageRegion !== 'de'
      ? `${this.config.storageRegion}.`
      : '';
    this.baseUrl = `https://${regionPrefix}storage.bunnycdn.com/${this.config.storageZoneName}`;
  }

  /**
   * Upload a video file to Bunny Storage
   *
   * @param file - File buffer or stream
   * @param path - Destination path in storage (e.g., "meetings/meeting-123/original.mp4")
   * @param options - Upload options including progress callback
   * @returns Upload result with CDN URL
   */
  async uploadVideo(
    file: Buffer | ReadableStream,
    path: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      this.initializeConfig();

      logger.info({ path }, 'Starting Bunny.net upload');

      // Ensure path doesn't start with /
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;

      // Full upload URL
      const uploadUrl = `${this.baseUrl}/${cleanPath}`;

      // Convert Buffer to Uint8Array for fetch compatibility
      const bodyData = Buffer.isBuffer(file) ? new Uint8Array(file) : file;

      // Upload file using PUT request
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': this.config!.accessKey,
          'Content-Type': options.contentType || 'video/mp4',
        },
        body: bodyData as BodyInit,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bunny upload failed: ${response.status} ${errorText}`);
      }

      // Get file size from response or buffer
      const fileSize = Buffer.isBuffer(file) ? file.length : 0;

      // Construct CDN URL for playback
      const cdnUrl = `${this.config!.pullZoneUrl}/${cleanPath}`;

      // Storage URL for management
      const storageUrl = uploadUrl;

      logger.info({ cdnUrl, fileSize }, 'Bunny.net upload successful');

      return {
        success: true,
        storageUrl,
        cdnUrl,
        fileSize,
      };
    } catch (error) {
      logger.error({ error, path }, 'Bunny.net upload failed');
      return {
        success: false,
        storageUrl: '',
        cdnUrl: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload a file from a URL (e.g., download from another service and upload to Bunny)
   *
   * @param sourceUrl - URL to download from
   * @param destinationPath - Path in Bunny storage
   * @returns Upload result
   */
  async uploadFromUrl(sourceUrl: string, destinationPath: string): Promise<UploadResult> {
    try {
      this.initializeConfig();

      logger.info({ sourceUrl, destinationPath }, 'Downloading file from URL for Bunny upload');

      // Download file
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to download from ${sourceUrl}: ${response.status}`);
      }

      const fileBuffer = Buffer.from(await response.arrayBuffer());

      // Upload to Bunny
      return await this.uploadVideo(fileBuffer, destinationPath);
    } catch (error) {
      logger.error({ error, sourceUrl }, 'Failed to upload from URL');
      return {
        success: false,
        storageUrl: '',
        cdnUrl: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a file from Bunny Storage
   *
   * @param path - File path to delete
   * @returns Success status
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      this.initializeConfig();

      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      const deleteUrl = `${this.baseUrl}/${cleanPath}`;

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config!.accessKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      logger.info({ path }, 'File deleted from Bunny.net');
      return true;
    } catch (error) {
      logger.error({ error, path }, 'Failed to delete file from Bunny.net');
      return false;
    }
  }

  /**
   * List files in a directory
   *
   * @param directory - Directory path to list
   * @returns Array of file objects
   */
  async listFiles(directory: string = ''): Promise<any[]> {
    try {
      this.initializeConfig();

      const cleanPath = directory.startsWith('/') ? directory.slice(1) : directory;
      const listUrl = `${this.baseUrl}/${cleanPath}/`;

      const response = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'AccessKey': this.config!.accessKey,
        },
      });

      if (!response.ok) {
        throw new Error(`List files failed: ${response.status}`);
      }

      const files = await response.json();
      return files;
    } catch (error) {
      logger.error({ error, directory }, 'Failed to list files from Bunny.net');
      return [];
    }
  }

  /**
   * Get CDN URL for a file
   *
   * @param path - File path in storage
   * @returns CDN URL for playback
   */
  getCdnUrl(path: string): string {
    this.initializeConfig();

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.config!.pullZoneUrl}/${cleanPath}`;
  }

  /**
   * Generate a unique storage path for a meeting video
   *
   * @param organizationId - Organization UUID
   * @param meetingId - Meeting UUID
   * @param filename - Original filename
   * @returns Storage path
   */
  generateMeetingPath(organizationId: string, meetingId: string, filename: string): string {
    // Structure: organizations/{orgId}/meetings/{meetingId}/{filename}
    // This allows easy organization-level management
    const ext = filename.split('.').pop() || 'mp4';
    return `organizations/${organizationId}/meetings/${meetingId}/original.${ext}`;
  }
}

// Export singleton instance
export const bunnyStorage = new BunnyStorage();

// Export class for testing
export { BunnyStorage };
export type { UploadResult, UploadOptions };
