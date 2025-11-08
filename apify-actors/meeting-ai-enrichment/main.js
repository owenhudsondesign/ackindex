import { Actor } from 'apify';
import OpenAI from 'openai';

// Helper: Parse meeting date from title or video metadata
function extractMeetingDate(video) {
  // Try to extract date from title or upload date
  const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\w+ \d{1,2},? \d{4})/;
  const titleMatch = video.title.match(dateRegex);

  if (titleMatch) {
    return new Date(titleMatch[0]).toISOString().split('T')[0];
  }

  // Fallback to upload date
  if (video.uploadDate) {
    return new Date(video.uploadDate).toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// Helper: Format timestamp for video URLs
function formatVideoTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h${minutes}m${secs}s`;
  } else {
    return `${minutes}m${secs}s`;
  }
}

// Helper: Generate embeddings using OpenAI
async function generateEmbeddings(text, openai) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000) // Limit to ~8k chars
    });

    return response.data[0].embedding;
  } catch (error) {
    console.log(`⚠️ Embedding generation failed: ${error.message}`);
    return null;
  }
}

// Main actor logic
await Actor.main(async () => {
  const input = await Actor.getInput();

  if (!input) {
    throw new Error('Input is required');
  }

  const {
    datasetId,
    openaiApiKey,
    openaiModel = 'gpt-4o-mini',
    outputFormat = 'ackindex',
    enableEmbeddings = true,
    categories = [
      'zoning',
      'budget',
      'public safety',
      'infrastructure',
      'education',
      'health',
      'environment',
      'transportation',
      'housing',
      'economic development'
    ],
    maxTokens = 4096
  } = input;

  if (!datasetId) {
    throw new Error('datasetId is required');
  }

  if (!openaiApiKey) {
    throw new Error('openaiApiKey is required');
  }

  console.log('🤖 Starting Meeting AI Enrichment...');
  console.log(`📊 OpenAI Model: ${openaiModel}`);
  console.log(`📤 Output Format: ${outputFormat}`);
  console.log(`🔍 Embeddings: ${enableEmbeddings ? 'Enabled' : 'Disabled'}`);

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: openaiApiKey
  });

  // Open input dataset from Actor 2
  const dataset = await Actor.openDataset(datasetId);
  const { items } = await dataset.getData();

  console.log(`📦 Found ${items.length} videos in dataset`);

  // Filter to videos with transcripts
  const videosToProcess = items.filter(item =>
    (item.status === 'transcript_fetched' || item.status === 'transcribed') &&
    (item.transcript || item.transcriptKey)
  );

  console.log(`📝 ${videosToProcess.length} videos have transcripts ready for processing`);

  if (videosToProcess.length === 0) {
    console.log('⚠️ No transcribed videos found. Exiting.');
    return;
  }

  // Process each video
  let processed = 0;
  let failed = 0;
  let totalOpenAICost = 0;
  let totalEmbeddingCost = 0;

  for (const video of videosToProcess) {
    try {
      console.log(`\n📹 Processing: ${video.title}`);
      console.log(`   Video ID: ${video.videoId}`);
      console.log(`   Duration: ${video.durationFormatted || `${Math.floor(video.duration / 60)}m`}`);

      // Load transcript data (either from KVS or directly from dataset)
      let transcript;

      if (video.transcriptKey) {
        // Old format: Transcript in KVS from Actor 2 (transcription-processor)
        console.log(`   📥 Loading transcript from KVS: ${video.transcriptKey}`);
        transcript = await Actor.getValue(video.transcriptKey);

        if (!transcript) {
          throw new Error('Transcript not found in KVS');
        }
      } else if (video.transcript && video.transcriptText) {
        // New format: Transcript directly from Actor 1 (youtube-transcript-fetcher)
        console.log(`   📥 Using transcript from dataset`);
        transcript = {
          fullText: video.transcriptText,
          segments: video.transcript.map(seg => ({
            start: seg.offset,
            end: seg.offset + (seg.duration || 0),
            text: seg.text,
            speaker: null // YouTube transcripts don't have speaker info
          })),
          wordCount: video.transcriptWordCount,
          speakers: 0 // No speaker diarization from YouTube
        };
      } else {
        throw new Error('No transcript data found in video record');
      }

      console.log(`   ✅ Loaded transcript: ${transcript.wordCount} words`);

      // Prepare prompt for OpenAI
      const analysisPrompt = `You are analyzing a government town meeting transcript. Extract key information and structure it for a civic information search system.

VIDEO INFORMATION:
- Title: ${video.title}
- Channel: ${video.channel}
- Duration: ${Math.floor(video.duration / 60)} minutes
- Speakers detected: ${transcript.speakers}

FULL TRANSCRIPT:
${transcript.fullText}

Please analyze this meeting and provide:

1. **Executive Summary** (2-3 sentences): What was discussed and decided?

2. **Meeting Type**: Identify the type of meeting (e.g., "Town Council Regular Meeting", "Planning Board Hearing", "Budget Committee", etc.)

3. **Attendees**: List key attendees/speakers mentioned (officials, council members, etc.)

4. **Key Topics**: List 3-7 main topics discussed

5. **Decisions & Motions**: List any votes, motions, or decisions made with outcomes

6. **Action Items**: List any follow-up tasks, deadlines, or future actions

7. **Important Moments**: Identify 3-5 key moments with approximate timestamps (in seconds) from the transcript segments:
   - Public comment periods
   - Votes or decisions
   - Heated debates or important discussions
   - Budget/financial discussions

8. **Categories**: Tag this meeting with relevant categories from: ${categories.join(', ')}

9. **Key Quotes**: Extract 2-3 important direct quotes with speaker attribution (if available)

10. **Searchable Summary**: Create a dense, keyword-rich summary (100-150 words) optimized for semantic search. Include all important names, topics, decisions, and technical terms.

Please respond in JSON format with this structure:
{
  "executiveSummary": "...",
  "meetingType": "...",
  "attendees": ["...", "..."],
  "topics": ["...", "..."],
  "decisions": [
    {"motion": "...", "outcome": "...", "vote": "..."}
  ],
  "actionItems": [
    {"task": "...", "deadline": "...", "responsible": "..."}
  ],
  "keyMoments": [
    {"timestamp": 1234, "description": "...", "topic": "..."}
  ],
  "categories": ["...", "..."],
  "keyQuotes": [
    {"quote": "...", "speaker": "...", "context": "..."}
  ],
  "searchableSummary": "..."
}`;

      // Call OpenAI API
      console.log('   🤖 Analyzing with OpenAI...');
      const startTime = Date.now();

      const completion = await openai.chat.completions.create({
        model: openaiModel,
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes government meeting transcripts and returns structured JSON data.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      });

      const openaiTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Analysis complete in ${openaiTime}s`);

      // Parse OpenAI's response
      const responseText = completion.choices[0].message.content;
      let analysis;

      try {
        analysis = JSON.parse(responseText);
      } catch (parseError) {
        console.log('   ⚠️ Failed to parse JSON, using fallback structure');
        analysis = {
          executiveSummary: responseText.substring(0, 500),
          meetingType: 'Unknown',
          attendees: [],
          topics: [],
          decisions: [],
          actionItems: [],
          keyMoments: [],
          categories: [],
          keyQuotes: [],
          searchableSummary: responseText.substring(0, 500)
        };
      }

      // Calculate OpenAI cost
      const promptTokens = completion.usage.prompt_tokens;
      const completionTokens = completion.usage.completion_tokens;

      // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
      // GPT-4o pricing: $2.50/1M input, $10/1M output
      let inputRate, outputRate;
      if (openaiModel.includes('gpt-4o-mini')) {
        inputRate = 0.15;
        outputRate = 0.60;
      } else if (openaiModel.includes('gpt-4o')) {
        inputRate = 2.50;
        outputRate = 10.00;
      } else if (openaiModel.includes('gpt-4-turbo')) {
        inputRate = 10.00;
        outputRate = 30.00;
      } else {
        inputRate = 0.15;
        outputRate = 0.60;
      }

      const inputCost = (promptTokens / 1000000) * inputRate;
      const outputCost = (completionTokens / 1000000) * outputRate;
      const openaiCost = inputCost + outputCost;
      totalOpenAICost += openaiCost;

      console.log(`   💰 OpenAI cost: $${openaiCost.toFixed(4)} (${promptTokens} in / ${completionTokens} out)`);

      // Generate embeddings if enabled
      let embedding = null;
      let embeddingCost = 0;
      if (enableEmbeddings) {
        console.log('   🔢 Generating embeddings...');
        embedding = await generateEmbeddings(analysis.searchableSummary, openai);
        if (embedding) {
          // text-embedding-3-small: $0.02 per 1M tokens (~750 words)
          embeddingCost = 0.00002; // Approximate cost per embedding
          totalEmbeddingCost += embeddingCost;
          console.log('   ✅ Embeddings generated');
        }
      }

      // Extract meeting date
      const meetingDate = extractMeetingDate(video);

      // Build video timestamps for key moments
      const videoTimestamps = {};
      if (analysis.keyMoments) {
        for (const moment of analysis.keyMoments) {
          const key = moment.topic?.toLowerCase().replace(/\s+/g, '_') || 'moment';
          videoTimestamps[key] = moment.timestamp;
        }
      }

      // Build output based on format
      let outputData;

      if (outputFormat === 'ackindex') {
        // ackindex-optimized format
        outputData = {
          videoId: video.videoId,
          url: video.url,
          embedUrl: `${video.url.split('&')[0]}`, // Clean URL
          meeting: {
            date: meetingDate,
            type: analysis.meetingType,
            attendees: analysis.attendees,
            location: video.channel
          },
          summary: {
            executive: analysis.executiveSummary,
            searchable: analysis.searchableSummary,
            keyPoints: analysis.topics,
            decisions: analysis.decisions,
            actionItems: analysis.actionItems
          },
          transcript: {
            full: transcript.fullText,
            segments: transcript.segments,
            wordCount: transcript.wordCount,
            speakers: transcript.speakers,
            duration: video.duration
          },
          topics: analysis.categories,
          quotes: analysis.keyQuotes,
          videoTimestamps,
          metadata: {
            channel: video.channel,
            channelId: video.channelId || null,
            title: video.title,
            uploadDate: video.uploadDate || null,
            viewCount: video.viewCount || 0,
            transcriptionService: video.transcriptionService,
            aiModel: openaiModel
          },
          embedding,
          costs: {
            transcription: video.estimatedCost || 0,
            openai: openaiCost,
            embedding: embeddingCost,
            total: (video.estimatedCost || 0) + openaiCost + embeddingCost
          },
          processedAt: new Date().toISOString()
        };
      } else if (outputFormat === 'elasticsearch') {
        // Elasticsearch-optimized format
        outputData = {
          id: video.videoId,
          type: 'government_meeting',
          title: video.title,
          url: video.url,
          date: meetingDate,
          meeting_type: analysis.meetingType,
          location: video.channel,
          attendees: analysis.attendees,
          summary: analysis.executiveSummary,
          searchable_content: analysis.searchableSummary,
          topics: analysis.topics,
          categories: analysis.categories,
          decisions: analysis.decisions,
          action_items: analysis.actionItems,
          quotes: analysis.keyQuotes,
          transcript_full: transcript.fullText,
          transcript_segments: transcript.segments,
          word_count: transcript.wordCount,
          duration_seconds: video.duration,
          speakers_count: transcript.speakers,
          video_timestamps: videoTimestamps,
          embedding_vector: embedding,
          metadata: {
            channel: video.channel,
            upload_date: video.uploadDate,
            view_count: video.viewCount,
            processing_date: new Date().toISOString()
          }
        };
      } else {
        // Generic JSON format
        outputData = {
          video: {
            id: video.videoId,
            url: video.url,
            title: video.title,
            channel: video.channel,
            duration: video.duration,
            uploadDate: video.uploadDate
          },
          meeting: {
            date: meetingDate,
            type: analysis.meetingType,
            attendees: analysis.attendees
          },
          analysis,
          transcript,
          embedding,
          processedAt: new Date().toISOString()
        };
      }

      // Save to dataset
      await Actor.pushData(outputData);

      // Also save to KVS for easy access
      const enrichedKey = `enriched_${video.videoId}.json`;
      await Actor.setValue(enrichedKey, outputData, { contentType: 'application/json' });

      processed++;
      console.log(`   ✅ Saved to dataset and KVS (${processed}/${videosToProcess.length})`);

      // Rate limiting to avoid API throttling
      if (processed < videosToProcess.length) {
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
        status: 'enrichment_failed',
        error: error.message,
        processedAt: new Date().toISOString()
      });
    }
  }

  console.log('\n🎉 Processing complete!');
  console.log(`📊 Summary:`);
  console.log(`   Videos processed: ${processed}`);
  console.log(`   Videos failed: ${failed}`);
  console.log(`   💰 Total OpenAI cost: $${totalOpenAICost.toFixed(2)}`);
  if (enableEmbeddings) {
    console.log(`   💰 Total embedding cost: $${totalEmbeddingCost.toFixed(4)}`);
  }
  console.log(`   💰 Grand total: $${(totalOpenAICost + totalEmbeddingCost).toFixed(2)}`);
});
