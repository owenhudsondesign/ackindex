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
    openaiApiKey,
    openaiModel = 'gpt-4o-mini',
    enableEmbeddings = true,
    actorIds = {
      transcriptFetcher: 'legible_radish/youtube-transcript-fetcher',
      enricher: 'legible_radish/meeting-ai-enrichment'
    }
  } = input;

  if (!youtubeApiKey) {
    throw new Error('youtubeApiKey is required');
  }

  if (!openaiApiKey) {
    throw new Error('openaiApiKey is required');
  }

  console.log('🎬 Starting YouTube Meetings Orchestrator...');
  console.log(`📊 Pipeline: Fetch Transcripts (YouTube API) → Enrich (${openaiModel})`);
  console.log(`🎯 Max videos: ${maxVideos}`);
  console.log('');

  // Initialize Apify client
  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN
  });

  const pipelineStart = Date.now();
  let totalCost = 0;

  // ============================================
  // STAGE 1: Video Discovery & Transcript Fetching
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 STAGE 1: Video Discovery & Transcript Fetching');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const transcriptFetcherInput = {
    youtubeUrls,
    channelIds,
    youtubeApiKey,
    maxVideos,
    filterKeywords: ['meeting', 'council', 'board', 'hearing', 'session', 'committee'],
    minDuration: 300,
    maxDuration: 18000,
    includeLivestreams: true
  };

  console.log(`🎬 Starting Actor: ${actorIds.transcriptFetcher}`);
  const stage1Start = Date.now();

  const transcriptFetcherRun = await client.actor(actorIds.transcriptFetcher).call(transcriptFetcherInput, {
    memory: 4096,
    timeout: 3600
  });

  const stage1Duration = ((Date.now() - stage1Start) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Stage 1 complete in ${stage1Duration} minutes`);
  console.log(`📦 Dataset: ${transcriptFetcherRun.defaultDatasetId}`);

  // Get results from Stage 1
  const transcriptDataset = client.dataset(transcriptFetcherRun.defaultDatasetId);
  const { items: fetchedVideos } = await transcriptDataset.listItems();

  const successfulFetches = fetchedVideos.filter(v => v.status === 'transcript_fetched');
  console.log(`✅ ${successfulFetches.length} transcripts fetched successfully`);

  if (successfulFetches.length === 0) {
    console.log('⚠️ No transcripts were fetched. Exiting pipeline.');
    return;
  }


  // ============================================
  // STAGE 2: AI Enrichment
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 STAGE 2: AI Enrichment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const enricherInput = {
    datasetId: transcriptFetcherRun.defaultDatasetId,
    openaiApiKey,
    openaiModel,
    outputFormat: 'ackindex',
    enableEmbeddings,
    maxTokens: 4096
  };

  console.log(`🤖 Starting Actor: ${actorIds.enricher}`);
  console.log(`   Model: ${openaiModel}`);
  console.log(`   Embeddings: ${enableEmbeddings ? 'Enabled' : 'Disabled'}`);
  const stage2Start = Date.now();

  const enricherRun = await client.actor(actorIds.enricher).call(enricherInput, {
    memory: 4096,
    timeout: 7200
  });

  const stage2Duration = ((Date.now() - stage2Start) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Stage 2 complete in ${stage2Duration} minutes`);
  console.log(`📦 Dataset: ${enricherRun.defaultDatasetId}`);

  // Get results from Stage 2
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
  console.log(`   Videos discovered: ${fetchedVideos.length}`);
  console.log(`   Transcripts fetched: ${successfulFetches.length}`);
  console.log(`   Meetings enriched: ${successfulEnrichments.length}`);
  console.log('');

  console.log('💰 COST BREAKDOWN:');
  console.log(`   Transcript fetching: $0.00 (free from YouTube)`);
  console.log(`   AI enrichment: $${aiCost.toFixed(2)}`);
  console.log(`   ─────────────────────────`);
  console.log(`   TOTAL: $${totalCost.toFixed(2)}`);
  console.log(`   Per video: $${(totalCost / successfulEnrichments.length).toFixed(4)}`);
  console.log('');

  console.log('📦 OUTPUT DATASETS:');
  console.log(`   Stage 1 (Transcripts): ${transcriptFetcherRun.defaultDatasetId}`);
  console.log(`   Stage 2 (Enriched): ${enricherRun.defaultDatasetId}`);
  console.log('');

  console.log('🔗 APIFY CONSOLE LINKS:');
  console.log(`   Stage 1: https://console.apify.com/actors/runs/${transcriptFetcherRun.id}`);
  console.log(`   Stage 2: https://console.apify.com/actors/runs/${enricherRun.id}`);
  console.log('');

  // Save summary to output
  await Actor.pushData({
    pipeline: 'youtube-meetings-complete',
    status: 'success',
    runtime: {
      total: pipelineDuration,
      stage1: stage1Duration,
      stage2: stage2Duration
    },
    videos: {
      discovered: fetchedVideos.length,
      transcriptsFetched: successfulFetches.length,
      enriched: successfulEnrichments.length
    },
    costs: {
      transcription: 0, // Free from YouTube
      ai: parseFloat(aiCost.toFixed(2)),
      total: parseFloat(totalCost.toFixed(2)),
      perVideo: parseFloat((totalCost / successfulEnrichments.length).toFixed(4))
    },
    datasets: {
      stage1: transcriptFetcherRun.defaultDatasetId,
      stage2: enricherRun.defaultDatasetId
    },
    runs: {
      stage1: transcriptFetcherRun.id,
      stage2: enricherRun.id
    },
    completedAt: new Date().toISOString()
  });

  console.log('✅ Summary saved to output dataset');
  console.log('\n🚀 Ready to import into ackindex!');
  console.log(`   Download final dataset: https://console.apify.com/storage/datasets/${enricherRun.defaultDatasetId}`);
});
