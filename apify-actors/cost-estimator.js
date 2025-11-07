#!/usr/bin/env node

/**
 * Cost Estimator for YouTube Meeting Processing Pipeline
 *
 * Calculates estimated costs for processing YouTube town meeting videos
 * through the complete pipeline: Download → Transcribe → AI Enrichment
 */

// ============================================
// PRICING CONSTANTS
// ============================================

const PRICING = {
  // YouTube API (free tier)
  youtube: {
    quota: 10000,        // units/day (free)
    costPerVideo: 0,     // Free within quota
    videoCost: 3         // units per video
  },

  // Apify Storage
  storage: {
    freeGB: 10,
    costPerGB: 0.25      // $/GB/month
  },

  // Transcription Services
  transcription: {
    deepgram: {
      perMinute: 0.0043,
      name: 'Deepgram Nova-2'
    },
    assemblyai: {
      perMinute: 0.0222,
      name: 'AssemblyAI'
    },
    'openai-whisper': {
      perMinute: 0.006,
      name: 'OpenAI Whisper'
    }
  },

  // OpenAI Models
  openai: {
    'gpt-4o-mini': {
      input: 0.15,       // $/1M tokens
      output: 0.60,
      name: 'GPT-4o-mini'
    },
    'gpt-4o': {
      input: 2.50,
      output: 10.00,
      name: 'GPT-4o'
    },
    'gpt-4-turbo': {
      input: 10.00,
      output: 30.00,
      name: 'GPT-4-turbo'
    },
    embeddings: {
      per1M: 0.02,       // text-embedding-3-small
      name: 'text-embedding-3-small'
    }
  },

  // Apify Compute Units
  apify: {
    perCU: 0.25,         // $0.25 per 1M CU
    downloadPerVideo: 0.01,   // CU per video
    transcribePerVideo: 0.005,
    enrichPerVideo: 0.005
  }
};

// ============================================
// ESTIMATION FUNCTIONS
// ============================================

function estimateStorage(numVideos, avgDurationMinutes) {
  // Assume ~50 MB per hour of audio (low quality for transcription)
  const mbPerMinute = 50 / 60;
  const totalMB = numVideos * avgDurationMinutes * mbPerMinute;
  const totalGB = totalMB / 1024;

  const billableGB = Math.max(0, totalGB - PRICING.storage.freeGB);
  const monthlyCost = billableGB * PRICING.storage.costPerGB;

  return {
    totalGB: totalGB.toFixed(2),
    billableGB: billableGB.toFixed(2),
    monthlyCost: monthlyCost.toFixed(2)
  };
}

function estimateTranscription(numVideos, avgDurationMinutes, service = 'deepgram') {
  const pricing = PRICING.transcription[service];
  const totalMinutes = numVideos * avgDurationMinutes;
  const cost = totalMinutes * pricing.perMinute;

  return {
    service: pricing.name,
    totalMinutes,
    costPerMinute: pricing.perMinute,
    totalCost: cost.toFixed(2),
    perVideo: (cost / numVideos).toFixed(4)
  };
}

function estimateOpenAI(numVideos, avgTranscriptWords, model = 'gpt-4o-mini', includeEmbeddings = true) {
  const pricing = PRICING.openai[model];

  // Estimate tokens (rough: 1 token ≈ 0.75 words)
  const inputTokensPerVideo = Math.ceil(avgTranscriptWords / 0.75);
  const outputTokensPerVideo = 1000; // Summary/analysis output

  const inputCost = (inputTokensPerVideo / 1000000) * pricing.input;
  const outputCost = (outputTokensPerVideo / 1000000) * pricing.output;
  const gptCostPerVideo = inputCost + outputCost;

  let embeddingCost = 0;
  if (includeEmbeddings) {
    // Embeddings on summary (~150 words = 200 tokens)
    embeddingCost = (200 / 1000000) * PRICING.openai.embeddings.per1M;
  }

  const totalPerVideo = gptCostPerVideo + embeddingCost;
  const totalCost = totalPerVideo * numVideos;

  return {
    model: pricing.name,
    inputTokens: inputTokensPerVideo,
    outputTokens: outputTokensPerVideo,
    gptCost: (gptCostPerVideo * numVideos).toFixed(4),
    embeddingCost: (embeddingCost * numVideos).toFixed(4),
    totalCost: totalCost.toFixed(2),
    perVideo: totalPerVideo.toFixed(4),
    includesEmbeddings: includeEmbeddings
  };
}

function estimateApifyCompute(numVideos) {
  const totalCU = numVideos * (
    PRICING.apify.downloadPerVideo +
    PRICING.apify.transcribePerVideo +
    PRICING.apify.enrichPerVideo
  );
  const cost = (totalCU / 1000000) * PRICING.apify.perCU;

  return {
    totalCU: totalCU.toFixed(2),
    cost: cost.toFixed(4)
  };
}

// ============================================
// MAIN ESTIMATION FUNCTION
// ============================================

function estimatePipeline(config) {
  const {
    numVideos,
    avgDurationMinutes,
    transcriptionService = 'deepgram',
    openaiModel = 'gpt-4o-mini',
    enableEmbeddings = true
  } = config;

  // Calculate average words in transcript
  // Assume ~150 words per minute of speech
  const avgTranscriptWords = avgDurationMinutes * 150;

  // Estimate each component
  const storage = estimateStorage(numVideos, avgDurationMinutes);
  const transcription = estimateTranscription(numVideos, avgDurationMinutes, transcriptionService);
  const openai = estimateOpenAI(numVideos, avgTranscriptWords, openaiModel, enableEmbeddings);
  const compute = estimateApifyCompute(numVideos);

  // Total costs
  const totalOneTime = parseFloat(transcription.totalCost) +
                       parseFloat(openai.totalCost) +
                       parseFloat(compute.cost);
  const totalMonthly = parseFloat(storage.monthlyCost);

  return {
    input: {
      numVideos,
      avgDurationMinutes,
      avgDurationFormatted: `${Math.floor(avgDurationMinutes / 60)}h ${avgDurationMinutes % 60}m`,
      totalHours: (numVideos * avgDurationMinutes / 60).toFixed(1),
      transcriptionService,
      openaiModel,
      enableEmbeddings
    },
    storage,
    transcription,
    openai,
    compute,
    totals: {
      oneTime: totalOneTime.toFixed(2),
      monthly: totalMonthly,
      perVideo: (totalOneTime / numVideos).toFixed(4),
      total: (totalOneTime + totalMonthly).toFixed(2)
    }
  };
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayEstimate(estimate) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 YouTube Meeting Processing Cost Estimate');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 INPUT:');
  console.log(`   Videos: ${estimate.input.numVideos}`);
  console.log(`   Avg duration: ${estimate.input.avgDurationFormatted}`);
  console.log(`   Total hours: ${estimate.input.totalHours}h`);
  console.log(`   Transcription: ${estimate.input.transcriptionService}`);
  console.log(`   AI Model: ${estimate.input.openaiModel}`);
  console.log(`   Embeddings: ${estimate.input.enableEmbeddings ? 'Yes' : 'No'}`);
  console.log('');

  console.log('💾 STORAGE (Apify):');
  console.log(`   Total: ${estimate.storage.totalGB} GB`);
  console.log(`   Billable: ${estimate.storage.billableGB} GB (after ${PRICING.storage.freeGB} GB free)`);
  console.log(`   Cost: $${estimate.storage.monthlyCost}/month`);
  console.log('');

  console.log('🎙️ TRANSCRIPTION:');
  console.log(`   Service: ${estimate.transcription.service}`);
  console.log(`   Total minutes: ${estimate.transcription.totalMinutes}`);
  console.log(`   Rate: $${estimate.transcription.costPerMinute}/minute`);
  console.log(`   Total: $${estimate.transcription.totalCost}`);
  console.log(`   Per video: $${estimate.transcription.perVideo}`);
  console.log('');

  console.log('🤖 AI ENRICHMENT (OpenAI):');
  console.log(`   Model: ${estimate.openai.model}`);
  console.log(`   Avg input tokens: ${estimate.openai.inputTokens.toLocaleString()}`);
  console.log(`   Avg output tokens: ${estimate.openai.outputTokens.toLocaleString()}`);
  console.log(`   GPT cost: $${estimate.openai.gptCost}`);
  if (estimate.input.enableEmbeddings) {
    console.log(`   Embedding cost: $${estimate.openai.embeddingCost}`);
  }
  console.log(`   Total: $${estimate.openai.totalCost}`);
  console.log(`   Per video: $${estimate.openai.perVideo}`);
  console.log('');

  console.log('⚙️ COMPUTE (Apify):');
  console.log(`   Total CU: ${estimate.compute.totalCU}`);
  console.log(`   Cost: $${estimate.compute.cost} (usually negligible)`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💵 TOTAL COSTS:');
  console.log(`   One-time processing: $${estimate.totals.oneTime}`);
  console.log(`   Monthly storage: $${estimate.totals.monthly}/month`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   TOTAL: $${estimate.totals.total}`);
  console.log(`   Per video: $${estimate.totals.perVideo}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function compareModels(numVideos, avgDurationMinutes) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 MODEL COMPARISON');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];
  const services = ['deepgram', 'assemblyai', 'openai-whisper'];

  console.log('AI MODELS (for enrichment):');
  models.forEach(model => {
    const est = estimatePipeline({
      numVideos,
      avgDurationMinutes,
      openaiModel: model,
      enableEmbeddings: true
    });
    console.log(`   ${est.openai.model.padEnd(20)} $${est.openai.perVideo}/video`);
  });

  console.log('\nTRANSCRIPTION SERVICES:');
  services.forEach(service => {
    const est = estimatePipeline({
      numVideos,
      avgDurationMinutes,
      transcriptionService: service,
      openaiModel: 'gpt-4o-mini',
      enableEmbeddings: true
    });
    console.log(`   ${est.transcription.service.padEnd(20)} $${est.transcription.perVideo}/video`);
  });

  console.log('');
}

// ============================================
// CLI INTERFACE
// ============================================

function printUsage() {
  console.log(`
Usage: node cost-estimator.js [options]

Options:
  --videos <n>              Number of videos (default: 10)
  --duration <minutes>      Average video duration in minutes (default: 60)
  --transcription <service> Transcription service: deepgram, assemblyai, openai-whisper (default: deepgram)
  --model <model>           OpenAI model: gpt-4o-mini, gpt-4o, gpt-4-turbo (default: gpt-4o-mini)
  --no-embeddings           Disable embeddings generation
  --compare                 Show model comparison
  --help                    Show this help message

Examples:
  # Estimate cost for 10 one-hour videos
  node cost-estimator.js --videos 10 --duration 60

  # Estimate with GPT-4o (more expensive but higher quality)
  node cost-estimator.js --videos 10 --duration 60 --model gpt-4o

  # Weekly batch: 4 meetings per week
  node cost-estimator.js --videos 4 --duration 90

  # Compare all models
  node cost-estimator.js --videos 10 --duration 60 --compare
`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    numVideos: 10,
    avgDurationMinutes: 60,
    transcriptionService: 'deepgram',
    openaiModel: 'gpt-4o-mini',
    enableEmbeddings: true,
    compare: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
        printUsage();
        process.exit(0);
      case '--videos':
        config.numVideos = parseInt(args[++i]);
        break;
      case '--duration':
        config.avgDurationMinutes = parseInt(args[++i]);
        break;
      case '--transcription':
        config.transcriptionService = args[++i];
        break;
      case '--model':
        config.openaiModel = args[++i];
        break;
      case '--no-embeddings':
        config.enableEmbeddings = false;
        break;
      case '--compare':
        config.compare = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  return config;
}

// ============================================
// MAIN
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs();

  // Show main estimate
  const estimate = estimatePipeline(config);
  displayEstimate(estimate);

  // Show comparison if requested
  if (config.compare) {
    compareModels(config.numVideos, config.avgDurationMinutes);
  }

  // Show common scenarios
  console.log('📋 COMMON SCENARIOS:\n');

  console.log('1️⃣ Weekly batch (4 meetings/week):');
  const weekly = estimatePipeline({ numVideos: 4, avgDurationMinutes: 90 });
  console.log(`   $${weekly.totals.oneTime} per week → ~$${(parseFloat(weekly.totals.oneTime) * 4).toFixed(2)}/month\n`);

  console.log('2️⃣ Monthly archive (20 historical meetings):');
  const archive = estimatePipeline({ numVideos: 20, avgDurationMinutes: 75 });
  console.log(`   $${archive.totals.total} one-time\n`);

  console.log('3️⃣ Full year backlog (100 meetings):');
  const backlog = estimatePipeline({ numVideos: 100, avgDurationMinutes: 60 });
  console.log(`   $${backlog.totals.total} one-time\n`);
}

// Export for use as module
export { estimatePipeline, displayEstimate, compareModels, PRICING };
