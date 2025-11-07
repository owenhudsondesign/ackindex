# YouTube Town Meeting Processing Pipeline

Complete Apify actor pipeline for processing YouTube government meeting videos into searchable, AI-enriched content for ackindex.

## Architecture

```
[YouTube Town Meetings]
         ↓
[Actor 1: Video Discovery & Audio Download]
  - Finds videos from channels/playlists
  - Downloads audio-only (optimized for transcription)
  - Stores in Apify Dataset + KVS
         ↓
[Actor 2: Transcription Processor]
  - Deepgram/AssemblyAI/OpenAI Whisper
  - Speaker diarization
  - Timestamped segments
         ↓
[Actor 3: AI Enrichment & ackindex Export]
  - OpenAI GPT analysis
  - Extract meetings, decisions, quotes
  - Generate embeddings
  - ackindex-ready JSON
         ↓
[ackindex Database]
  - Semantic search
  - Video timestamps
  - Full-text search
```

## Actors

| Actor | Purpose | Key Features |
|-------|---------|--------------|
| **youtube-audio-downloader** | Download videos | YouTube API integration, audio extraction, filtering |
| **transcription-processor** | Transcribe audio | 3 service options, speaker diarization, timestamps |
| **meeting-ai-enrichment** | AI analysis | GPT enrichment, embeddings, structured extraction |
| **youtube-meetings-orchestrator** | Run full pipeline | One-click automation, cost tracking, error handling |

## Quick Start

### 1. Install Apify CLI

```bash
npm install -g apify-cli
apify login
```

### 2. Publish All Actors

```bash
cd apify-actors

# Publish each actor
cd youtube-audio-downloader && apify push && cd ..
cd transcription-processor && apify push && cd ..
cd meeting-ai-enrichment && apify push && cd ..
cd youtube-meetings-orchestrator && apify push && cd ..
```

### 3. Run the Pipeline

```bash
# Option A: Use orchestrator (recommended)
apify call your-username/youtube-meetings-orchestrator --input '{
  "youtubeUrls": ["https://www.youtube.com/@NantucketTownGovernment"],
  "maxVideos": 5,
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_DEEPGRAM_KEY",
  "openaiApiKey": "sk-...",
  "youtubeApiKey": "YOUR_YOUTUBE_KEY"
}'

# Option B: Run actors manually
# 1. Run Actor 1
apify call your-username/youtube-audio-downloader --input '{...}'

# 2. Get dataset ID from Actor 1, run Actor 2
apify call your-username/transcription-processor --input '{
  "datasetId": "DATASET_ID_FROM_ACTOR_1",
  ...
}'

# 3. Get dataset ID from Actor 2, run Actor 3
apify call your-username/meeting-ai-enrichment --input '{
  "datasetId": "DATASET_ID_FROM_ACTOR_2",
  ...
}'
```

## API Keys Required

| Service | Purpose | Cost | Get Key |
|---------|---------|------|---------|
| **YouTube Data API** | Discover videos | Free (10k units/day) | [Google Cloud Console](https://console.cloud.google.com/) |
| **Deepgram** (recommended) | Transcription | $0.0043/min | [deepgram.com](https://deepgram.com/) |
| **OpenAI** | AI enrichment + embeddings | $0.15-2.50/1M tokens | [platform.openai.com](https://platform.openai.com/) |

### Alternative Transcription Services

- **AssemblyAI**: $0.0222/min (5 hours free) → [assemblyai.com](https://www.assemblyai.com/)
- **OpenAI Whisper**: $0.006/min (no free tier) → [platform.openai.com](https://platform.openai.com/)

## Cost Calculator

Use the built-in cost estimator:

```bash
node apify-actors/cost-estimator.js --videos 10 --duration 60
```

### Example Output

```
💰 YouTube Meeting Processing Cost Estimate

📊 INPUT:
   Videos: 10
   Avg duration: 1h 0m
   Total hours: 10.0h
   Transcription: deepgram
   AI Model: gpt-4o-mini
   Embeddings: Yes

💾 STORAGE (Apify):
   Total: 0.49 GB
   Cost: $0.00/month (within free 10 GB)

🎙️ TRANSCRIPTION:
   Service: Deepgram Nova-2
   Total: $2.58
   Per video: $0.2580

🤖 AI ENRICHMENT (OpenAI):
   Model: GPT-4o-mini
   Total: $1.20
   Per video: $0.1200

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL COSTS:
   One-time processing: $3.78
   Per video: $0.3780
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Cost Examples

| Scenario | Videos | Cost |
|----------|--------|------|
| Test run | 1 | $0.38 |
| Weekly batch | 4 | $1.51 |
| Monthly (16 meetings) | 16 | $6.05 |
| Annual backlog (100) | 100 | $37.80 |

**Monthly recurring** (4 meetings/week): ~$6/month

## Features

### Actor 1: Video Discovery & Audio Download

✅ YouTube API integration for channel/playlist discovery
✅ Smart filtering by keywords and duration
✅ Audio-only download (saves bandwidth)
✅ Stores audio in Apify KVS
✅ Handles rate limiting and errors

### Actor 2: Transcription Processor

✅ 3 transcription services (Deepgram, AssemblyAI, OpenAI Whisper)
✅ Speaker diarization (identifies different speakers)
✅ Timestamped segments
✅ Word-level accuracy
✅ Cost optimization (skips existing transcripts)

### Actor 3: AI Enrichment & ackindex Export

✅ Structured extraction (attendees, decisions, quotes)
✅ Executive summaries
✅ Semantic search optimization
✅ Video timestamp generation
✅ Embeddings for RAG/semantic search
✅ Multiple output formats (ackindex, Elasticsearch, JSON)

### Orchestrator

✅ One-click full pipeline
✅ Automatic dataset passing between actors
✅ Real-time progress tracking
✅ Detailed cost breakdown
✅ Error handling and recovery
✅ Summary export

## Project Structure

```
apify-actors/
├── youtube-audio-downloader/      # Actor 1
│   ├── main.js
│   ├── package.json
│   ├── input_schema.json
│   ├── Dockerfile
│   └── README.md
├── transcription-processor/        # Actor 2
│   ├── main.js
│   ├── package.json
│   ├── input_schema.json
│   ├── Dockerfile
│   └── README.md
├── meeting-ai-enrichment/          # Actor 3
│   ├── main.js
│   ├── package.json
│   ├── input_schema.json
│   ├── Dockerfile
│   └── README.md
├── youtube-meetings-orchestrator/  # Orchestrator
│   ├── main.js
│   ├── package.json
│   ├── input_schema.json
│   ├── Dockerfile
│   └── README.md
├── cost-estimator.js              # Cost calculator
└── README.md                      # This file
```

## Output Format

### Final Dataset (Actor 3)

```json
{
  "videoId": "abc123",
  "url": "https://youtube.com/watch?v=abc123",
  "meeting": {
    "date": "2025-01-15",
    "type": "Town Council Regular Meeting",
    "attendees": ["Mayor Smith", "Councilor Jones"],
    "location": "Nantucket Town Government"
  },
  "summary": {
    "executive": "The council voted to approve zoning changes...",
    "searchable": "Dense keyword-rich summary for semantic search...",
    "keyPoints": ["Zoning reform", "Affordable housing"],
    "decisions": [
      {"motion": "...", "outcome": "Passed", "vote": "5-2"}
    ],
    "actionItems": [
      {"task": "...", "deadline": "...", "responsible": "..."}
    ]
  },
  "transcript": {
    "full": "Full transcript text...",
    "segments": [...],
    "wordCount": 15420,
    "speakers": 5
  },
  "topics": ["zoning", "housing", "budget"],
  "quotes": [
    {"quote": "...", "speaker": "Mayor Smith", "context": "..."}
  ],
  "videoTimestamps": {
    "public_comment": 850,
    "zoning_vote": 2100
  },
  "embedding": [0.123, -0.456, ...],
  "costs": {
    "transcription": 0.26,
    "openai": 0.12,
    "total": 0.38
  }
}
```

## Integration with ackindex

### Import Script Example

```javascript
import { db } from './database.js';
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// Get enriched meetings from Actor 3
const datasetId = 'YOUR_DATASET_ID';
const dataset = client.dataset(datasetId);
const { items } = await dataset.listItems();

// Insert into ackindex database
for (const meeting of items) {
  await db.query(`
    INSERT INTO meetings (
      video_id, url, date, type, title,
      summary, transcript, embedding,
      topics, attendees, decisions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (video_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      transcript = EXCLUDED.transcript,
      updated_at = NOW()
  `, [
    meeting.videoId,
    meeting.url,
    meeting.meeting.date,
    meeting.meeting.type,
    meeting.metadata.title,
    meeting.summary.searchable,
    meeting.transcript.full,
    meeting.embedding,
    meeting.topics,
    meeting.meeting.attendees,
    meeting.summary.decisions
  ]);
}

console.log(`✅ Imported ${items.length} meetings`);
```

## Scheduling

Set up automatic weekly runs in Apify Console:

1. Go to **Schedules** → **Create New**
2. Set frequency: **Weekly** (e.g., Monday 9am)
3. Select actor: **youtube-meetings-orchestrator**
4. Input:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@NantucketTownGovernment"],
  "maxVideos": 20,
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "{{DEEPGRAM_API_KEY}}",
  "openaiApiKey": "{{OPENAI_API_KEY}}",
  "youtubeApiKey": "{{YOUTUBE_API_KEY}}"
}
```

5. Enable notifications on failure

## Best Practices

### Cost Optimization

✅ Use **gpt-4o-mini** (100x cheaper than gpt-4o)
✅ Use **Deepgram** for transcription (cheapest + excellent quality)
✅ Enable **skipExisting** to avoid reprocessing
✅ Process in batches (don't exceed API quotas)
✅ Monitor costs with built-in cost estimator

### Quality Optimization

✅ Enable **speaker diarization** for meeting transcripts
✅ Enable **embeddings** for semantic search
✅ Use **filterKeywords** to exclude irrelevant videos
✅ Set appropriate **minDuration** and **maxDuration**

### Production Recommendations

✅ Start with test run (1 video)
✅ Schedule weekly runs for new content
✅ Monitor Apify logs for errors
✅ Set up email/webhook notifications
✅ Backup datasets periodically
✅ Use environment variables for API keys

## Troubleshooting

### "No videos found"
- Check YouTube channel URL is correct
- Verify YouTube API key has quota remaining
- Check filterKeywords aren't too restrictive

### "Transcription failed"
- Verify transcription API key is valid
- Check API credits/quota
- Try different transcription service

### "High costs"
- Use gpt-4o-mini instead of gpt-4o
- Use Deepgram instead of AssemblyAI
- Reduce maxVideos for testing
- Check cost estimator before large runs

### "Actor run timed out"
- Increase timeout in actor settings
- Process in smaller batches
- Check for rate limiting issues

## Development

### Local Testing

```bash
# Test each actor locally
cd youtube-audio-downloader
npm install

# Create test input
mkdir -p .actor
cat > .actor/INPUT.json << EOF
{
  "youtubeUrls": ["https://www.youtube.com/watch?v=TEST_VIDEO"],
  "downloadAudio": true,
  "maxVideos": 1
}
EOF

# Run locally
npm start
```

### Debugging

```bash
# Enable verbose logging
export APIFY_LOG_LEVEL=DEBUG

# Check datasets
apify dataset list

# Download dataset for inspection
apify dataset download DATASET_ID --output data.json
```

## Support

- **Actor Documentation**: See individual README files in each actor folder
- **Cost Calculator**: `node cost-estimator.js --help`
- **Apify Docs**: https://docs.apify.com/
- **GitHub Issues**: Report bugs or feature requests

## License

MIT

---

**Ready for production!** Process your town meeting videos at scale with this complete pipeline.
