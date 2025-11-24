/**
 * Upload resume helpers for chunked video uploads
 * Stores upload state in localStorage to allow resumption after connection loss or page refresh
 */

export interface SavedUploadState {
  sessionId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  meetingDate: string;
  meetingTitle: string;
  meetingDescription: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[]; // Array of chunk indices that were successfully uploaded
  lastUpdated: string;
}

const STORAGE_KEY = 'video_upload_resume';

/**
 * Save current upload state to localStorage
 */
export function saveUploadState(state: SavedUploadState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save upload state:', error);
  }
}

/**
 * Load saved upload state from localStorage
 */
export function loadUploadState(): SavedUploadState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved) as SavedUploadState;

    // Check if state is still valid (within 4 hours)
    const lastUpdated = new Date(state.lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 4) {
      // State expired
      clearUploadState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to load upload state:', error);
    return null;
  }
}

/**
 * Clear saved upload state from localStorage
 */
export function clearUploadState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear upload state:', error);
  }
}

/**
 * Mark a chunk as uploaded
 */
export function markChunkUploaded(chunkIndex: number): void {
  const state = loadUploadState();
  if (!state) return;

  if (!state.uploadedChunks.includes(chunkIndex)) {
    state.uploadedChunks.push(chunkIndex);
    state.uploadedChunks.sort((a, b) => a - b); // Keep sorted
  }

  state.lastUpdated = new Date().toISOString();
  saveUploadState(state);
}

/**
 * Check if a chunk has already been uploaded
 */
export function isChunkUploaded(chunkIndex: number): boolean {
  const state = loadUploadState();
  if (!state) return false;
  return state.uploadedChunks.includes(chunkIndex);
}

/**
 * Get list of chunks that still need to be uploaded
 */
export function getRemainingChunks(totalChunks: number): number[] {
  const state = loadUploadState();
  if (!state) return Array.from({ length: totalChunks }, (_, i) => i);

  const remaining: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!state.uploadedChunks.includes(i)) {
      remaining.push(i);
    }
  }

  return remaining;
}
