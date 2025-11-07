import { Actor } from 'apify';
import { createClient } from '@deepgram/sdk';
import FormData from 'form-data';

// Transcription service implementations

class DeepgramTranscriber {
  constructor(apiKey) {
    this.client = createClient(apiKey);
  }

  async transcribe(audioBuffer, options = {}) {
    const {
      enableDiarization = true,
      language = 'en',
      model = 'nova-2'
    } = options;

    console.log(`   Using Deepgram model: ${model}`);

    try {
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model,
          language,
          punctuate: true,
          paragraphs: true,
          utterances: true,
          diarize: enableDiarization,
          smart_format: true
        }
      );

      if (error) {
        throw new Error(`Deepgram error: ${error.message}`);
      }

      const channel = result.results.channels[0];
      const transcript = channel.alternatives[0];

      // Build segments with timestamps and speakers
      const segments = [];
      if (transcript.paragraphs) {
        for (const paragraph of transcript.paragraphs.paragraphs) {
          for (const sentence of paragraph.sentences) {
            segments.push({
              start: sentence.start,
              end: sentence.end,
              text: sentence.text,
              speaker: enableDiarization ? `Speaker ${paragraph.speaker || 0}` : null
            });
          }
        }
      } else if (transcript.words) {
        // Fallback to word-level grouping if paragraphs not available
        let currentSegment = { words: [], start: 0, end: 0, text: '' };
        for (const word of transcript.words) {
          if (currentSegment.words.length === 0) {
            currentSegment.start = word.start;
          }
          currentSegment.words.push(word);
          currentSegment.end = word.end;

          // Create segment every ~30 seconds or at punctuation
          if (word.punctuated_word.match(/[.!?]$/) || currentSegment.end - currentSegment.start > 30) {
            currentSegment.text = currentSegment.words.map(w => w.punctuated_word).join(' ');
            segments.push({
              start: currentSegment.start,
              end: currentSegment.end,
              text: currentSegment.text,
              speaker: enableDiarization && currentSegment.words[0].speaker !== undefined
                ? `Speaker ${currentSegment.words[0].speaker}`
                : null
            });
            currentSegment = { words: [], start: 0, end: 0, text: '' };
          }
        }

        // Add remaining words
        if (currentSegment.words.length > 0) {
          currentSegment.text = currentSegment.words.map(w => w.punctuated_word).join(' ');
          segments.push({
            start: currentSegment.start,
            end: currentSegment.end,
            text: currentSegment.text,
            speaker: enableDiarization && currentSegment.words[0].speaker !== undefined
              ? `Speaker ${currentSegment.words[0].speaker}`
              : null
          });
        }
      }

      // Extract full text
      const fullText = transcript.transcript;

      // Get unique speakers
      const speakers = enableDiarization
        ? [...new Set(segments.map(s => s.speaker).filter(Boolean))]
        : [];

      // Get word count
      const wordCount = transcript.words ? transcript.words.length : fullText.split(/\s+/).length;

      return {
        text: fullText,
        segments,
        wordCount,
        speakers: speakers.length,
        confidence: transcript.confidence || null,
        duration: result.metadata.duration
      };
    } catch (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }
  }

  estimateCost(durationSeconds) {
    // Deepgram Nova-2: $0.0043 per minute
    const minutes = durationSeconds / 60;
    return minutes * 0.0043;
  }
}

class AssemblyAITranscriber {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.assemblyai.com/v2';
  }

  async transcribe(audioBuffer, options = {}) {
    const {
      enableDiarization = true,
      language = 'en'
    } = options;

    console.log(`   Using AssemblyAI`);

    try {
      // Step 1: Upload audio file
      console.log('   Uploading audio to AssemblyAI...');
      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/octet-stream'
        },
        body: audioBuffer
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const { upload_url } = await uploadResponse.json();
      console.log('   Audio uploaded successfully');

      // Step 2: Create transcription
      console.log('   Requesting transcription...');
      const transcriptResponse = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: upload_url,
          language_code: language,
          punctuate: true,
          format_text: true,
          speaker_labels: enableDiarization,
          auto_highlights: false
        })
      });

      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed: ${transcriptResponse.status}`);
      }

      const transcript = await transcriptResponse.json();
      const transcriptId = transcript.id;

      // Step 3: Poll for completion
      console.log(`   Polling for completion (ID: ${transcriptId})...`);
      let result = transcript;
      while (result.status !== 'completed' && result.status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const pollResponse = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
          headers: { 'authorization': this.apiKey }
        });

        if (!pollResponse.ok) {
          throw new Error(`Polling failed: ${pollResponse.status}`);
        }

        result = await pollResponse.json();
        console.log(`   Status: ${result.status}`);
      }

      if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      // Parse results
      const segments = [];
      if (enableDiarization && result.utterances) {
        for (const utterance of result.utterances) {
          segments.push({
            start: utterance.start / 1000, // Convert ms to seconds
            end: utterance.end / 1000,
            text: utterance.text,
            speaker: `Speaker ${utterance.speaker}`
          });
        }
      } else if (result.words) {
        // Group words into ~30 second segments
        let currentSegment = { words: [], start: 0, end: 0 };
        for (const word of result.words) {
          if (currentSegment.words.length === 0) {
            currentSegment.start = word.start / 1000;
          }
          currentSegment.words.push(word.text);
          currentSegment.end = word.end / 1000;

          if (currentSegment.end - currentSegment.start > 30) {
            segments.push({
              start: currentSegment.start,
              end: currentSegment.end,
              text: currentSegment.words.join(' '),
              speaker: null
            });
            currentSegment = { words: [], start: 0, end: 0 };
          }
        }

        if (currentSegment.words.length > 0) {
          segments.push({
            start: currentSegment.start,
            end: currentSegment.end,
            text: currentSegment.words.join(' '),
            speaker: null
          });
        }
      }

      const speakers = enableDiarization && result.utterances
        ? [...new Set(result.utterances.map(u => `Speaker ${u.speaker}`))]
        : [];

      return {
        text: result.text,
        segments,
        wordCount: result.words ? result.words.length : result.text.split(/\s+/).length,
        speakers: speakers.length,
        confidence: result.confidence || null,
        duration: result.audio_duration
      };
    } catch (error) {
      throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
  }

  estimateCost(durationSeconds) {
    // AssemblyAI: $0.00037 per second ($0.0222 per minute)
    return durationSeconds * 0.00037;
  }
}

class OpenAIWhisperTranscriber {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async transcribe(audioBuffer, options = {}) {
    const {
      enableDiarization = false, // Whisper API doesn't support diarization
      language = 'en',
      model = 'whisper-1'
    } = options;

    console.log(`   Using OpenAI Whisper (${model})`);

    if (enableDiarization) {
      console.log('   ⚠️ Note: OpenAI Whisper API does not support speaker diarization');
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });
      formData.append('model', model);
      formData.append('language', language);
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${response.status} ${error}`);
      }

      const result = await response.json();

      // Parse segments
      const segments = (result.segments || []).map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
        speaker: null // Whisper doesn't provide speaker labels
      }));

      const wordCount = result.text.split(/\s+/).length;

      return {
        text: result.text,
        segments,
        wordCount,
        speakers: 0,
        confidence: null,
        duration: result.duration
      };
    } catch (error) {
      throw new Error(`OpenAI Whisper transcription failed: ${error.message}`);
    }
  }

  estimateCost(durationSeconds) {
    // OpenAI Whisper: $0.006 per minute
    const minutes = durationSeconds / 60;
    return minutes * 0.006;
  }
}

// Helper: Format seconds to HH:MM:SS
function formatTimestamp(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Main actor logic
await Actor.main(async () => {
  const input = await Actor.getInput();

  if (!input) {
    throw new Error('Input is required');
  }

  const {
    datasetId,
    transcriptionService = 'deepgram',
    apiKey,
    enableSpeakerDiarization = true,
    language = 'en',
    maxConcurrent = 3,
    model = 'nova-2',
    skipExisting = true
  } = input;

  if (!datasetId) {
    throw new Error('datasetId is required');
  }

  if (!apiKey) {
    throw new Error('apiKey is required');
  }

  console.log('🎙️ Starting Transcription Processor...');
  console.log(`📊 Service: ${transcriptionService}`);
  console.log(`🔊 Speaker diarization: ${enableSpeakerDiarization}`);
  console.log(`🌐 Language: ${language}`);

  // Initialize transcription service
  let transcriber;
  switch (transcriptionService) {
    case 'deepgram':
      transcriber = new DeepgramTranscriber(apiKey);
      break;
    case 'assemblyai':
      transcriber = new AssemblyAITranscriber(apiKey);
      break;
    case 'openai-whisper':
      transcriber = new OpenAIWhisperTranscriber(apiKey);
      break;
    default:
      throw new Error(`Unknown transcription service: ${transcriptionService}`);
  }

  // Open input dataset from Actor 1
  const dataset = await Actor.openDataset(datasetId);
  const { items } = await dataset.getData();

  console.log(`📦 Found ${items.length} videos in dataset`);

  // Filter to videos with downloaded audio
  const videosToTranscribe = items.filter(item =>
    item.status === 'downloaded' && item.audioFileKey
  );

  console.log(`🎵 ${videosToTranscribe.length} videos have audio ready for transcription`);

  if (videosToTranscribe.length === 0) {
    console.log('⚠️ No videos with downloaded audio found. Exiting.');
    return;
  }

  // Process videos
  let transcribed = 0;
  let skipped = 0;
  let failed = 0;
  let totalCost = 0;

  for (const video of videosToTranscribe) {
    try {
      console.log(`\n📹 Processing: ${video.title}`);
      console.log(`   Video ID: ${video.videoId}`);
      console.log(`   Duration: ${video.durationFormatted}`);

      // Check if already transcribed
      const transcriptKey = `transcript_${video.videoId}.json`;
      if (skipExisting) {
        const existing = await Actor.getValue(transcriptKey);
        if (existing) {
          console.log('   ⏭️ Transcript already exists, skipping');
          skipped++;
          continue;
        }
      }

      // Download audio from KVS
      console.log(`   📥 Downloading audio from KVS: ${video.audioFileKey}`);
      const audioBuffer = await Actor.getValue(video.audioFileKey);

      if (!audioBuffer) {
        throw new Error('Audio file not found in KVS');
      }

      console.log(`   ✅ Downloaded ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Estimate cost
      const estimatedCost = transcriber.estimateCost(video.duration);
      console.log(`   💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
      totalCost += estimatedCost;

      // Transcribe
      console.log('   🎙️ Transcribing...');
      const startTime = Date.now();

      const result = await transcriber.transcribe(audioBuffer, {
        enableDiarization: enableSpeakerDiarization,
        language,
        model
      });

      const transcribeTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Transcription complete in ${transcribeTime}s`);
      console.log(`   📝 ${result.wordCount} words, ${result.segments.length} segments`);
      if (result.speakers > 0) {
        console.log(`   👥 ${result.speakers} speakers detected`);
      }

      // Save full transcript to KVS
      const transcriptData = {
        videoId: video.videoId,
        videoUrl: video.url,
        videoTitle: video.title,
        transcribedAt: new Date().toISOString(),
        service: transcriptionService,
        language,
        duration: result.duration,
        wordCount: result.wordCount,
        speakers: result.speakers,
        confidence: result.confidence,
        fullText: result.text,
        segments: result.segments
      };

      await Actor.setValue(transcriptKey, transcriptData, { contentType: 'application/json' });
      console.log(`   💾 Saved transcript to KVS: ${transcriptKey}`);

      // Save to output dataset
      await Actor.pushData({
        videoId: video.videoId,
        url: video.url,
        title: video.title,
        channel: video.channel,
        duration: video.duration,
        transcriptKey,
        transcriptText: result.text,
        segments: result.segments,
        wordCount: result.wordCount,
        speakers: result.speakers,
        confidence: result.confidence,
        transcriptionService,
        estimatedCost,
        transcribeTime: parseFloat(transcribeTime),
        status: 'transcribed',
        processedAt: new Date().toISOString()
      });

      transcribed++;
      console.log(`   ✅ Saved to dataset (${transcribed}/${videosToTranscribe.length})`);

      // Rate limiting between requests
      if (transcribed < videosToTranscribe.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
      failed++;

      // Save error record
      await Actor.pushData({
        videoId: video.videoId,
        url: video.url,
        title: video.title,
        status: 'transcription_failed',
        error: error.message,
        processedAt: new Date().toISOString()
      });
    }
  }

  console.log('\n🎉 Processing complete!');
  console.log(`📊 Summary:`);
  console.log(`   Videos transcribed: ${transcribed}`);
  console.log(`   Videos skipped: ${skipped}`);
  console.log(`   Videos failed: ${failed}`);
  console.log(`   💰 Total estimated cost: $${totalCost.toFixed(2)}`);
});
