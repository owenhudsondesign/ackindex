import { Actor } from 'apify';
import { ApifyClient } from 'apify-client';

// Helper: Format duration
function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else {
    return `${mins}m ${secs}s`;
  }
}

// Main orchestrator logic
await Actor.main(async () => {
  const input = await Actor.getInput();

  if (!input) {
    throw new Error('Input is required');
  }

  const {
    youtubeUrls = [],
    channelIds = [],
    youtubeApiKey,
    maxVideos = 10,
    transcriptionService = 'deepgram',
    transcriptionApiKey,
    openaiApiKey,
    openaiModel = 'gpt-4o-mini',
    enableEmbeddings = true,
    actorIds = {
      downloader: 'legible_radish/youtube-audio-downloader',
      transcriber: 'legible_radish/transcription-processor',
      enricher: 'legible_radish/meeting-ai-enrichment'
    }
  } = input;

  if (!transcriptionApiKey) {
    throw new Error('transcriptionApiKey is required');
  }

  if (!openaiApiKey) {
    throw new Error('openaiApiKey is required');
  }

  console.log('🎬 Starting YouTube Meetings Orchestrator...');
  console.log(`📊 Pipeline: Download → Transcribe (${transcriptionService}) → Enrich (${openaiModel})`);
  console.log(`🎯 Max videos: ${maxVideos}`);
  console.log('');

  // Initialize Apify client
  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN
  });

  const pipelineStart = Date.now();
  let totalCost = 0;

  // ============================================
  // STAGE 1: Video Discovery & Audio Download
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 STAGE 1: Video Discovery & Audio Download');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const downloaderInput = {
    youtubeUrls,
    channelIds,
    youtubeApiKey,
    downloadAudio: true,
    maxVideos,
    filterKeywords: ['meeting', 'council', 'board', 'hearing', 'session', 'committee'],
    minDuration: 300,
    maxDuration: 18000
  };

  console.log(`🎬 Starting Actor: ${actorIds.downloader}`);
  const stage1Start = Date.now();

  const downloaderRun = await client.actor(actorIds.downloader).call(downloaderInput, {
    memory: 4096,
    timeout: 3600
  });

  const stage1Duration = ((Date.now() - stage1Start) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Stage 1 complete in ${stage1Duration} minutes`);
  console.log(`📦 Dataset: ${downloaderRun.defaultDatasetId}`);

  // Get results from Stage 1
  const downloaderDataset = client.dataset(downloaderRun.defaultDatasetId);
  const { items: downloadedVideos } = await downloaderDataset.listItems();

  const successfulDownloads = downloadedVideos.filter(v => v.status === 'downloaded');
  console.log(`✅ ${successfulDownloads.length} videos downloaded successfully`);

  if (successfulDownloads.length === 0) {
    console.log('⚠️ No videos were downloaded. Exiting pipeline.');
    return;
  }

  // Calculate storage costs
  const totalStorageGB = successfulDownloads.reduce((sum, v) => sum + (v.audioFileSizeMB || 0), 0) / 1024;
  const storageCost = totalStorageGB * 0.25; // $0.25/GB/month
  totalCost += storageCost;

  console.log(`💾 Storage: ${totalStorageGB.toFixed(2)} GB (~$${storageCost.toFixed(2)}/month)`);

  // ============================================
  // STAGE 2: Transcription
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎙️ STAGE 2: Transcription');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const transcriberInput = {
    datasetId: downloaderRun.defaultDatasetId,
    transcriptionService,
    apiKey: transcriptionApiKey,
    enableSpeakerDiarization: true,
    language: 'en',
    maxConcurrent: 3,
    skipExisting: true
  };

  console.log(`🎙️ Starting Actor: ${actorIds.transcriber}`);
  console.log(`   Service: ${transcriptionService}`);
  const stage2Start = Date.now();

  const transcriberRun = await client.actor(actorIds.transcriber).call(transcriberInput, {
    memory: 4096,
    timeout: 7200
  });

  const stage2Duration = ((Date.now() - stage2Start) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Stage 2 complete in ${stage2Duration} minutes`);
  console.log(`📦 Dataset: ${transcriberRun.defaultDatasetId}`);

  // Get results from Stage 2
  const transcriberDataset = client.dataset(transcriberRun.defaultDatasetId);
  const { items: transcribedVideos } = await transcriberDataset.listItems();

  const successfulTranscriptions = transcribedVideos.filter(v => v.status === 'transcribed');
  console.log(`✅ ${successfulTranscriptions.length} videos transcribed successfully`);

  if (successfulTranscriptions.length === 0) {
    console.log('⚠️ No videos were transcribed. Exiting pipeline.');
    return;
  }

  // Calculate transcription costs
  const transcriptionCost = successfulTranscriptions.reduce((sum, v) => sum + (v.estimatedCost || 0), 0);
  totalCost += transcriptionCost;

  console.log(`💰 Transcription cost: $${transcriptionCost.toFixed(2)}`);

  // ============================================
  // STAGE 3: AI Enrichment
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 STAGE 3: AI Enrichment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const enricherInput = {
    datasetId: transcriberRun.defaultDatasetId,
    openaiApiKey,
    openaiModel,
    outputFormat: 'ackindex',
    enableEmbeddings,
    maxTokens: 4096
  };

  console.log(`🤖 Starting Actor: ${actorIds.enricher}`);
  console.log(`   Model: ${openaiModel}`);
  console.log(`   Embeddings: ${enableEmbeddings ? 'Enabled' : 'Disabled'}`);
  const stage3Start = Date.now();

  const enricherRun = await client.actor(actorIds.enricher).call(enricherInput, {
    memory: 4096,
    timeout: 7200
  });

  const stage3Duration = ((Date.now() - stage3Start) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Stage 3 complete in ${stage3Duration} minutes`);
  console.log(`📦 Dataset: ${enricherRun.defaultDatasetId}`);

  // Get results from Stage 3
  const enricherDataset = client.dataset(enricherRun.defaultDatasetId);
  const { items: enrichedMeetings } = await enricherDataset.listItems();

  const successfulEnrichments = enrichedMeetings.filter(m => m.videoId && !m.status?.includes('failed'));
  console.log(`✅ ${successfulEnrichments.length} meetings enriched successfully`);

  // Calculate AI costs
  const aiCost = successfulEnrichments.reduce((sum, m) => {
    return sum + (m.costs?.openai || 0) + (m.costs?.embedding || 0);
  }, 0);
  totalCost += aiCost;

  console.log(`💰 AI enrichment cost: $${aiCost.toFixed(2)}`);

  // ============================================
  // FINAL SUMMARY
  // ============================================
  const pipelineDuration = ((Date.now() - pipelineStart) / 1000 / 60).toFixed(1);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 PIPELINE COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 SUMMARY:');
  console.log(`   Total runtime: ${pipelineDuration} minutes`);
  console.log(`   Videos discovered: ${downloadedVideos.length}`);
  console.log(`   Videos downloaded: ${successfulDownloads.length}`);
  console.log(`   Videos transcribed: ${successfulTranscriptions.length}`);
  console.log(`   Meetings enriched: ${successfulEnrichments.length}`);
  console.log('');

  console.log('💰 COST BREAKDOWN:');
  console.log(`   Storage: $${storageCost.toFixed(2)}/month`);
  console.log(`   Transcription: $${transcriptionCost.toFixed(2)}`);
  console.log(`   AI enrichment: $${aiCost.toFixed(2)}`);
  console.log(`   ─────────────────────────`);
  console.log(`   TOTAL: $${totalCost.toFixed(2)}`);
  console.log(`   Per video: $${(totalCost / successfulEnrichments.length).toFixed(4)}`);
  console.log('');

  console.log('📦 OUTPUT DATASETS:');
  console.log(`   Stage 1 (Downloads): ${downloaderRun.defaultDatasetId}`);
  console.log(`   Stage 2 (Transcripts): ${transcriberRun.defaultDatasetId}`);
  console.log(`   Stage 3 (Enriched): ${enricherRun.defaultDatasetId}`);
  console.log('');

  console.log('🔗 APIFY CONSOLE LINKS:');
  console.log(`   Stage 1: https://console.apify.com/actors/runs/${downloaderRun.id}`);
  console.log(`   Stage 2: https://console.apify.com/actors/runs/${transcriberRun.id}`);
  console.log(`   Stage 3: https://console.apify.com/actors/runs/${enricherRun.id}`);
  console.log('');

  // Save summary to output
  await Actor.pushData({
    pipeline: 'youtube-meetings-complete',
    status: 'success',
    runtime: {
      total: pipelineDuration,
      stage1: stage1Duration,
      stage2: stage2Duration,
      stage3: stage3Duration
    },
    videos: {
      discovered: downloadedVideos.length,
      downloaded: successfulDownloads.length,
      transcribed: successfulTranscriptions.length,
      enriched: successfulEnrichments.length
    },
    costs: {
      storage: parseFloat(storageCost.toFixed(2)),
      transcription: parseFloat(transcriptionCost.toFixed(2)),
      ai: parseFloat(aiCost.toFixed(2)),
      total: parseFloat(totalCost.toFixed(2)),
      perVideo: parseFloat((totalCost / successfulEnrichments.length).toFixed(4))
    },
    datasets: {
      stage1: downloaderRun.defaultDatasetId,
      stage2: transcriberRun.defaultDatasetId,
      stage3: enricherRun.defaultDatasetId
    },
    runs: {
      stage1: downloaderRun.id,
      stage2: transcriberRun.id,
      stage3: enricherRun.id
    },
    completedAt: new Date().toISOString()
  });

  console.log('✅ Summary saved to output dataset');
  console.log('\n🚀 Ready to import into ackindex!');
  console.log(`   Download final dataset: https://console.apify.com/storage/datasets/${enricherRun.defaultDatasetId}`);
});
