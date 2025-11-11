#!/usr/bin/env tsx
/**
 * Manual Long Video Processor
 *
 * Usage:
 *   tsx scripts/process-long-video.ts <video-id> <audio-file-path>
 *
 * Example:
 *   tsx scripts/process-long-video.ts abc123xyz /path/to/downloaded-audio.mp3
 *
 * This script:
 * 1. Uploads audio file to AssemblyAI
 * 2. Waits for transcription
 * 3. Enriches with AI summaries
 * 4. Stores in database
 * 5. Marks document as complete
 *
 * NOTE: Make sure the document already exists in database (created by worker)
 */

import { createClient } from '@supabase/supabase-js';
import { transcribeWithAssemblyAI } from '../src/lib/assemblyAITranscriber';
import { storeLongVideoTranscript } from '../src/lib/longVideoProcessor';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const videoId = process.argv[2];
  const audioFilePath = process.argv[3];

  // Validate arguments
  if (!videoId || !audioFilePath) {
    console.error('❌ Usage: tsx scripts/process-long-video.ts <video-id> <audio-file-path>');
    console.error('   Example: tsx scripts/process-long-video.ts abc123xyz /path/to/meeting.mp3');
    process.exit(1);
  }

  if (!fs.existsSync(audioFilePath)) {
    console.error(`❌ Audio file not found: ${audioFilePath}`);
    process.exit(1);
  }

  const fileName = path.basename(audioFilePath);
  const fileSizeMB = (fs.statSync(audioFilePath).size / (1024 * 1024)).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('MANUAL LONG VIDEO PROCESSING');
  console.log('='.repeat(80));
  console.log(`Video ID: ${videoId}`);
  console.log(`Audio file: ${fileName}`);
  console.log(`File size: ${fileSizeMB} MB`);
  console.log('='.repeat(80));

  try {
    // 1. Get document from database
    console.log(`\n📋 Looking up document in database...`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, source_url, status')
      .eq('source_url', videoUrl)
      .single();

    if (docError || !document) {
      console.error(`❌ Document not found for video ID: ${videoId}`);
      console.error(`   Expected URL: ${videoUrl}`);
      console.error(`\n💡 The document should have been created automatically when the video was detected.`);
      console.error(`   Check the database or run the video through the normal processing flow first.`);
      process.exit(1);
    }

    console.log(`✅ Found document: ${document.id}`);
    console.log(`   Title: ${document.title || 'Untitled'}`);
    console.log(`   Status: ${document.status}`);

    // 2. Get video metadata
    console.log(`\n📹 Fetching video metadata from YouTube API...`);
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error('❌ YOUTUBE_API_KEY not set in environment');
      process.exit(1);
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found on YouTube');
    }

    const video = data.items[0];
    const videoInfo = {
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      description: video.snippet.description,
    };

    console.log(`✅ Video metadata retrieved`);
    console.log(`   Title: ${videoInfo.title}`);
    console.log(`   Channel: ${videoInfo.channel}`);

    // 3. Update document status
    console.log(`\n📝 Updating document status to processing...`);
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', document.id);

    // 4. Transcribe with AssemblyAI
    console.log(`\n🎙️  Starting AssemblyAI transcription...`);
    console.log(`   This may take a while for long videos (typically 15-30% of audio duration)`);

    const transcription = await transcribeWithAssemblyAI(audioFilePath, {
      speaker_labels: true,
      language_code: 'en_us',
    });

    console.log(`\n✅ Transcription complete!`);
    console.log(`   Transcript length: ${transcription.fullText.length} characters`);
    console.log(`   Duration: ${Math.floor(transcription.duration / 60)} minutes`);
    console.log(`   Segments: ${transcription.segments.length}`);

    // 5. Store in database
    console.log(`\n💾 Storing transcript and generating embeddings...`);

    await storeLongVideoTranscript(
      document.id,
      videoId,
      {
        fullText: transcription.fullText,
        segments: transcription.segments,
        totalDuration: transcription.duration,
      },
      videoInfo
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ PROCESSING COMPLETE!');
    console.log('='.repeat(80));
    console.log(`Document ID: ${document.id}`);
    console.log(`Video: ${videoInfo.title}`);
    console.log(`Duration: ${Math.floor(transcription.duration / 60)} minutes`);
    console.log(`Status: Ready for search`);
    console.log('='.repeat(80));

    // 6. Calculate cost
    const durationHours = transcription.duration / 3600;
    const assemblyAICost = durationHours * 0.65;
    const revenueAt075 = (transcription.duration / 60) * 0.75;
    const profit = revenueAt075 - assemblyAICost;

    console.log(`\n💰 Cost breakdown:`);
    console.log(`   AssemblyAI: $${assemblyAICost.toFixed(2)} (${durationHours.toFixed(2)} hrs @ $0.65/hr)`);
    console.log(`   Revenue: $${revenueAt075.toFixed(2)} (${Math.floor(transcription.duration/60)} min @ $0.75/min)`);
    console.log(`   Profit: $${profit.toFixed(2)} (${((profit/revenueAt075)*100).toFixed(1)}% margin)`);

  } catch (error) {
    console.error('\n❌ Processing failed:', error);

    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    }

    process.exit(1);
  }
}

main();
