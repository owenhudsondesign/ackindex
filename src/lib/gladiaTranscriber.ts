/**
 * Gladia API Transcription Service
 * Handles audio/video transcription using Gladia's pre-recorded API
 */

import logger from '@/lib/logger';

export interface GladiaTranscriptionOptions {
  audioUrl: string;
  language?: string; // ISO 639 code (e.g., 'en', 'es')
  enableCodeSwitching?: boolean;
  webhookUrl?: string;
}

export interface GladiaTranscriptionSegment {
  text: string;
  start: number; // seconds
  end: number; // seconds
  speaker?: number;
  confidence?: number;
}

export interface GladiaTranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  result?: {
    transcription: {
      full_transcript: string;
      utterances: Array<{
        text: string;
        start: number;
        end: number;
        speaker: number;
        confidence: number;
        language?: string;
      }>;
      languages?: string[];
    };
    metadata?: {
      audio_duration?: number;
      number_of_distinct_channels?: number;
    };
  };
  error?: {
    message: string;
    type: string;
  };
}

/**
 * Initialize a transcription job with Gladia
 */
export async function startGladiaTranscription(
  options: GladiaTranscriptionOptions
): Promise<{ id: string; resultUrl: string }> {
  const apiKey = process.env.GLADIA_API_KEY;

  if (!apiKey) {
    throw new Error('GLADIA_API_KEY is not set in environment variables');
  }

  try {
    logger.info({ audioUrl: options.audioUrl }, 'Starting Gladia transcription');

    const requestBody: Record<string, any> = {
      audio_url: options.audioUrl,
    };

    // Configure language settings (v2 API uses language_config)
    if (options.language || options.enableCodeSwitching) {
      requestBody.language_config = {
        languages: options.language ? [options.language] : [],
        code_switching: options.enableCodeSwitching ?? false,
      };
    }

    // Add webhook if provided
    if (options.webhookUrl) {
      requestBody.callback_url = options.webhookUrl;
    }

    const response = await fetch('https://api.gladia.io/v2/pre-recorded', {
      method: 'POST',
      headers: {
        'x-gladia-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gladia API error (${response.status}): ${errorText}`
      );
    }

    const result = await response.json();

    logger.info(
      { transcriptionId: result.id },
      'Gladia transcription job initiated'
    );

    return {
      id: result.id,
      resultUrl: result.result_url || `https://api.gladia.io/v2/pre-recorded/${result.id}`,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to start Gladia transcription');
    throw error;
  }
}

/**
 * Check the status of a transcription job
 */
export async function getGladiaTranscriptionStatus(
  transcriptionId: string
): Promise<GladiaTranscriptionResult> {
  const apiKey = process.env.GLADIA_API_KEY;

  if (!apiKey) {
    throw new Error('GLADIA_API_KEY is not set in environment variables');
  }

  try {
    const response = await fetch(
      `https://api.gladia.io/v2/pre-recorded/${transcriptionId}`,
      {
        method: 'GET',
        headers: {
          'x-gladia-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gladia API error (${response.status}): ${errorText}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    logger.error(
      { error, transcriptionId },
      'Failed to get Gladia transcription status'
    );
    throw error;
  }
}

/**
 * Wait for a transcription job to complete (with polling)
 */
export async function waitForGladiaTranscription(
  transcriptionId: string,
  options: {
    pollInterval?: number; // milliseconds (default: 5000)
    timeout?: number; // milliseconds (default: 1800000 = 30 minutes)
  } = {}
): Promise<GladiaTranscriptionResult> {
  const pollInterval = options.pollInterval || 5000;
  const timeout = options.timeout || 1800000; // 30 minutes
  const startTime = Date.now();

  logger.info(
    { transcriptionId, pollInterval, timeout },
    'Waiting for Gladia transcription to complete'
  );

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(
        `Gladia transcription timed out after ${timeout}ms`
      );
    }

    // Get status
    const result = await getGladiaTranscriptionStatus(transcriptionId);

    // Check if done
    if (result.status === 'done') {
      logger.info({ transcriptionId }, 'Gladia transcription completed');
      return result;
    }

    // Check if error
    if (result.status === 'error') {
      const errorMessage =
        result.error?.message || 'Unknown transcription error';
      throw new Error(`Gladia transcription failed: ${errorMessage}`);
    }

    // Log status and wait
    logger.info(
      { transcriptionId, status: result.status },
      'Gladia transcription in progress'
    );

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

/**
 * Convert Gladia utterances to simplified transcript format
 */
export function formatGladiaTranscript(
  result: GladiaTranscriptionResult
): {
  fullText: string;
  segments: GladiaTranscriptionSegment[];
  duration: number;
  languages?: string[];
} {
  if (!result.result?.transcription) {
    throw new Error('Transcription result not available');
  }

  const transcription = result.result.transcription;
  const metadata = result.result.metadata;

  const segments: GladiaTranscriptionSegment[] =
    transcription.utterances?.map((utterance) => ({
      text: utterance.text,
      start: utterance.start,
      end: utterance.end,
      speaker: utterance.speaker,
      confidence: utterance.confidence,
    })) || [];

  return {
    fullText: transcription.full_transcript || '',
    segments,
    duration: metadata?.audio_duration || 0,
    languages: transcription.languages,
  };
}

/**
 * Complete transcription workflow: start -> wait -> format
 */
export async function transcribeAudio(
  audioUrl: string,
  options?: {
    language?: string;
    enableCodeSwitching?: boolean;
    pollInterval?: number;
    timeout?: number;
  }
): Promise<{
  fullText: string;
  segments: GladiaTranscriptionSegment[];
  duration: number;
  languages?: string[];
  transcriptionId: string;
}> {
  // Start transcription
  const { id } = await startGladiaTranscription({
    audioUrl,
    language: options?.language,
    enableCodeSwitching: options?.enableCodeSwitching,
  });

  // Wait for completion
  const result = await waitForGladiaTranscription(id, {
    pollInterval: options?.pollInterval,
    timeout: options?.timeout,
  });

  // Format result
  const formatted = formatGladiaTranscript(result);

  return {
    ...formatted,
    transcriptionId: id,
  };
}
