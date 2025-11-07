# YouTube Meetings Orchestrator

**One-click pipeline**: Discovers YouTube videos → Downloads audio → Transcribes → AI enrichment → Ready for ackindex

## Overview

This actor orchestrates all three actors in sequence:

1. **Actor 1**: Video Discovery & Audio Download
2. **Actor 2**: Transcription Processing
3. **Actor 3**: AI Enrichment

Instead of running each actor manually and passing dataset IDs between them, this orchestrator handles everything automatically.

## Features

- **Fully Automated**: One command runs the entire pipeline
- **Progress Tracking**: Real-time logs for each stage
- **Cost Reporting**: Detailed cost breakdown at the end
- **Error Handling**: Continues processing even if some videos fail
- **Dataset Management**: Automatically passes data between actors
- **Summary Export**: Generates comprehensive summary with all dataset IDs

## Input Schema

```json
{
  "youtubeUrls": ["https://www.youtube.com/@NantucketTownGovernment"],
  "channelIds": [],
  "youtubeApiKey": "YOUR_YOUTUBE_API_KEY",
  "maxVideos": 10,
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_DEEPGRAM_API_KEY",
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4o-mini",
  "enableEmbeddings": true,
  "actorIds": {
    "downloader": "your-username/youtube-audio-downloader",
    "transcriber": "your-username/transcription-processor",
    "enricher": "your-username/meeting-ai-enrichment"
  }
}
```

### Parameters

- **youtubeUrls** (array, required): YouTube URLs to process
- **channelIds** (array): Additional channel IDs
- **youtubeApiKey** (string): YouTube Data API v3 key
- **maxVideos** (integer): Max videos to process (default: 10)
- **transcriptionService** (string): `"deepgram"`, `"assemblyai"`, or `"openai-whisper"`
- **transcriptionApiKey** (string, required): API key for transcription service
- **openaiApiKey** (string, required): OpenAI API key
- **openaiModel** (string): `"gpt-4o-mini"` (default), `"gpt-4o"`, or `"gpt-4-turbo"`
- **enableEmbeddings** (boolean): Generate embeddings (default: true)
- **actorIds** (object): Custom actor IDs if you've published your own versions

## Usage Example

### Basic Usage

```bash
apify call your-username/youtube-meetings-orchestrator --input '{
  "youtubeUrls": ["https://www.youtube.com/@NantucketTownGovernment"],
  "maxVideos": 5,
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_DEEPGRAM_KEY",
  "openaiApiKey": "sk-...",
  "youtubeApiKey": "YOUR_YOUTUBE_KEY"
}'
```

### Scheduled Weekly Run

```json
{
  "youtubeUrls": ["https://www.youtube.com/@NantucketTownGovernment"],
  "maxVideos": 20,
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_DEEPGRAM_KEY",
  "openaiApiKey": "sk-...",
  "youtubeApiKey": "YOUR_YOUTUBE_KEY",
  "openaiModel": "gpt-4o-mini",
  "enableEmbeddings": true
}
```

## Output

The orchestrator produces a summary dataset with:

```json
{
  "pipeline": "youtube-meetings-complete",
  "status": "success",
  "runtime": {
    "total": "45.2",
    "stage1": "10.5",
    "stage2": "25.3",
    "stage3": "9.4"
  },
  "videos": {
    "discovered": 15,
    "downloaded": 10,
    "transcribed": 10,
    "enriched": 10
  },
  "costs": {
    "storage": 1.25,
    "transcription": 2.60,
    "ai": 1.20,
    "total": 5.05,
    "perVideo": 0.505
  },
  "datasets": {
    "stage1": "abc123...",
    "stage2": "def456...",
    "stage3": "ghi789..."
  },
  "runs": {
    "stage1": "run123...",
    "stage2": "run456...",
    "stage3": "run789..."
  },
  "completedAt": "2025-01-15T12:30:00.000Z"
}
```

## Console Output Example

```
🎬 Starting YouTube Meetings Orchestrator...
📊 Pipeline: Download → Transcribe (deepgram) → Enrich (gpt-4o-mini)
🎯 Max videos: 10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 STAGE 1: Video Discovery & Audio Download
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 Starting Actor: your-username/youtube-audio-downloader

✅ Stage 1 complete in 10.5 minutes
📦 Dataset: abc123...
✅ 10 videos downloaded successfully
💾 Storage: 2.5 GB (~$0.63/month)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎙️ STAGE 2: Transcription
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎙️ Starting Actor: your-username/transcription-processor
   Service: deepgram

✅ Stage 2 complete in 25.3 minutes
📦 Dataset: def456...
✅ 10 videos transcribed successfully
💰 Transcription cost: $2.60

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 STAGE 3: AI Enrichment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Starting Actor: your-username/meeting-ai-enrichment
   Model: gpt-4o-mini
   Embeddings: Enabled

✅ Stage 3 complete in 9.4 minutes
📦 Dataset: ghi789...
✅ 10 meetings enriched successfully
💰 AI enrichment cost: $1.20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 PIPELINE COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SUMMARY:
   Total runtime: 45.2 minutes
   Videos discovered: 15
   Videos downloaded: 10
   Videos transcribed: 10
   Meetings enriched: 10

💰 COST BREAKDOWN:
   Storage: $0.63/month
   Transcription: $2.60
   AI enrichment: $1.20
   ─────────────────────────
   TOTAL: $4.43
   Per video: $0.443

🚀 Ready to import into ackindex!
```

## Cost Estimates

### Scenario: 10 town meeting videos (1 hour each)

| Component | Cost |
|-----------|------|
| YouTube API | Free |
| Audio storage (5GB) | $1.25/month |
| Transcription (Deepgram) | $2.60 |
| GPT-4o-mini analysis | $1.20 |
| Embeddings | $0.002 |
| **Total** | **$3.80** |
| **Per video** | **$0.38** |

### Monthly Cost (Weekly runs, 4 meetings/week)

- 4 meetings/week × 4 weeks = 16 meetings/month
- Processing: 16 × $0.38 = **$6.08/month**
- Storage: ~$1.25/month (one-time)
- **Total: ~$7.33/month**

## Scheduling

Set up a weekly scheduled run on Apify:

1. Go to Apify Console
2. Create a new Schedule
3. Set to run weekly (e.g., Monday 9am)
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

## Actor IDs Setup

Before running the orchestrator, you need to:

1. **Publish all three actors** to Apify
2. **Update actorIds** in the input with your published actor IDs

```bash
# Publish each actor
cd apify-actors/youtube-audio-downloader
apify push

cd ../transcription-processor
apify push

cd ../meeting-ai-enrichment
apify push

cd ../youtube-meetings-orchestrator
apify push
```

Then update the `actorIds` in your input:

```json
{
  "actorIds": {
    "downloader": "your-username/youtube-audio-downloader",
    "transcriber": "your-username/transcription-processor",
    "enricher": "your-username/meeting-ai-enrichment"
  }
}
```

## Downloading Results

After the orchestrator completes:

```bash
# Download the final enriched dataset
apify dataset download ghi789... --output meetings.json

# Or use the Apify console:
# https://console.apify.com/storage/datasets/ghi789...
```

## Integration with ackindex

Import the enriched meetings into your database:

```javascript
import fs from 'fs';
import { db } from './database.js';

// Load the dataset
const meetings = JSON.parse(fs.readFileSync('meetings.json'));

// Insert into database
for (const meeting of meetings) {
  await db.query(`
    INSERT INTO meetings (
      video_id, url, date, type, title,
      summary, transcript, embedding,
      topics, attendees, decisions,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (video_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      transcript = EXCLUDED.transcript,
      embedding = EXCLUDED.embedding,
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

console.log(`✅ Imported ${meetings.length} meetings into ackindex`);
```

## Error Handling

- **Stage 1 fails**: Pipeline stops, no costs incurred
- **Stage 2 partially fails**: Continues with successful transcriptions
- **Stage 3 partially fails**: Continues with successful enrichments
- **All stages fail**: Summary shows which stage failed

## Monitoring

Track pipeline progress:

1. **Apify Console**: Real-time logs for each actor run
2. **Email Notifications**: Set up in Apify settings
3. **Webhooks**: Trigger external systems on completion
4. **Cost Alerts**: Monitor spending in Apify billing

## Best Practices

1. **Start small**: Test with `maxVideos: 1` first
2. **Use gpt-4o-mini**: 100x cheaper than gpt-4o
3. **Enable embeddings**: Essential for semantic search
4. **Schedule weekly**: Catch new meetings automatically
5. **Monitor costs**: Check summary after each run
6. **Backup datasets**: Download and archive enriched data

## Troubleshooting

### "Actor not found"
- Publish all three actors first using `apify push`
- Update `actorIds` in input with your published actor names

### "API quota exceeded"
- Check YouTube API quota (10k units/day free)
- Check Deepgram credits ($200 free)
- Check OpenAI billing

### Pipeline takes too long
- Reduce `maxVideos` for faster testing
- Transcription is the slowest stage (~2-3 minutes per hour of audio)
- Consider running overnight for large batches

### High costs
- Use `gpt-4o-mini` (not gpt-4o)
- Use Deepgram (not AssemblyAI)
- Process videos in smaller batches
- Disable embeddings if not needed (not recommended)

## Support

For issues:
- Check Apify logs for each stage
- Verify all API keys are valid
- Test each actor individually first
- Review cost estimates before large runs

---

**Ready for production!** Run this orchestrator weekly to keep your ackindex database up-to-date with the latest town meetings.
