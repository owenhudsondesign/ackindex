/**
 * AssemblyAI Transcription Service
 * Used for long videos (>120 min) that are manually downloaded
 * Supports up to 10 hours of audio
 */

import { AssemblyAI } from 'assemblyai';
import logger from '@/lib/logger';
import type { GladiaTranscriptionSegment } from './gladiaTranscriber';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export interface AssemblyAITranscriptionResult {
  id: string;
  text: string;
  words: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
  utterances?: Array<{
    text: string;
    start: number;
    end: number;
    speaker: string;
    confidence: number;
  }>;
  audio_duration: number;
}

/**
 * Upload and transcribe audio file with AssemblyAI
 * Handles files up to 10 hours
 */
export async function transcribeWithAssemblyAI(
  audioFilePath: string,
  options: {
    speaker_labels?: boolean; // Enable speaker diarization
    language_code?: string; // e.g., 'en', 'en_us'
  } = {}
): Promise<{
  fullText: string;
  segments: GladiaTranscriptionSegment[];
  duration: number;
  transcriptionId: string;
}> {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is not set');
  }

  console.log(`\n🎙️  [ASSEMBLYAI] Starting transcription`);
  console.log(`   File: ${audioFilePath}`);
  console.log(`   Speaker labels: ${options.speaker_labels ?? true}`);

  logger.info({ audioFilePath, options }, 'Starting AssemblyAI transcription');

  try {
    // Upload audio file
    console.log(`\n📤 Uploading audio file...`);
    const uploadUrl = await client.files.upload(audioFilePath);
    console.log(`✅ Upload complete`);

    // Start transcription
    console.log(`\n⏳ Starting transcription (this may take a while for long files)...`);
    const transcript = await client.transcripts.transcribe({
      audio: uploadUrl,
      speaker_labels: options.speaker_labels ?? true,
      language_code: options.language_code || 'en_us',
    });

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }

    console.log(`✅ [ASSEMBLYAI] Transcription completed`);
    console.log(`   Transcript length: ${transcript.text?.length || 0} characters`);
    console.log(`   Duration: ${Math.floor((transcript.audio_duration || 0) / 60)} minutes`);

    // Convert to Gladia-compatible segment format
    const segments: GladiaTranscriptionSegment[] = [];

    if (transcript.utterances && transcript.utterances.length > 0) {
      // Use utterances if speaker diarization was enabled
      for (const utterance of transcript.utterances) {
        segments.push({
          text: utterance.text,
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          speaker: parseInt(utterance.speaker.replace('Speaker ', '')) || undefined,
          confidence: utterance.confidence,
        });
      }
    } else if (transcript.words && transcript.words.length > 0) {
      // Fallback to words, group into sentences
      let currentSentence = '';
      let sentenceStart = 0;
      let sentenceEnd = 0;
      let wordCount = 0;

      for (const word of transcript.words) {
        if (wordCount === 0) {
          sentenceStart = word.start / 1000;
        }

        currentSentence += (currentSentence ? ' ' : '') + word.text;
        sentenceEnd = word.end / 1000;
        wordCount++;

        // Create segment every ~20 words or at sentence boundaries
        if (wordCount >= 20 || word.text.match(/[.!?]$/)) {
          segments.push({
            text: currentSentence,
            start: sentenceStart,
            end: sentenceEnd,
            confidence: word.confidence,
          });

          currentSentence = '';
          wordCount = 0;
        }
      }

      // Add final segment if any
      if (currentSentence) {
        segments.push({
          text: currentSentence,
          start: sentenceStart,
          end: sentenceEnd,
        });
      }
    }

    logger.info(
      {
        transcriptionId: transcript.id,
        duration: transcript.audio_duration,
        segmentCount: segments.length,
      },
      'AssemblyAI transcription completed'
    );

    return {
      fullText: transcript.text || '',
      segments,
      duration: (transcript.audio_duration || 0) / 1000, // Convert ms to seconds
      transcriptionId: transcript.id,
    };
  } catch (error) {
    logger.error({ error, audioFilePath }, 'AssemblyAI transcription failed');
    throw error;
  }
}

/**
 * Get transcription status (if polling is needed)
 */
export async function getAssemblyAITranscriptionStatus(
  transcriptionId: string
): Promise<'queued' | 'processing' | 'completed' | 'error'> {
  const transcript = await client.transcripts.get(transcriptionId);

  return transcript.status as 'queued' | 'processing' | 'completed' | 'error';
}
