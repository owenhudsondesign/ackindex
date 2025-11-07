# Nantucket Town Government - Quick Start Guide

Process all Nantucket town meeting livestreams for ackindex.

## 🎯 Recommended Configuration

Use this for both **initial backfill** and **weekly scheduled runs**:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 100,
  "downloadAudio": true,
  "filterKeywords": ["meeting", "council", "board", "hearing", "session", "committee", "select"],
  "minDuration": 300,
  "maxDuration": 18000,
  "youtubeApiKey": "YOUR_YOUTUBE_API_KEY",
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_DEEPGRAM_API_KEY",
  "openaiApiKey": "YOUR_OPENAI_API_KEY",
  "openaiModel": "gpt-4o-mini",
  "enableEmbeddings": true
}
```

## 📅 Recommended Schedule

### Initial Backfill (One-time)

Process all historical meetings in batches:

**Week 1**: Process first 50 videos
```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 50,
  ...
}
```

**Week 2**: Process next 50 videos
```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 100,
  ...
}
```

Continue until all historical videos are processed.

### Weekly Scheduled Runs

After backfill, set up **weekly automatic runs**:

**Frequency**: Every Monday at 9am
**Max videos**: 20 (catches new meetings from past week)

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 20,
  "downloadAudio": true,
  "youtubeApiKey": "{{YOUTUBE_API_KEY}}",
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "{{DEEPGRAM_API_KEY}}",
  "openaiApiKey": "{{OPENAI_API_KEY}}"
}
```

Actor will automatically skip already-processed videos.

## 💰 Cost Estimates

### Initial Backfill (estimate 100 videos)

Assuming average 1-hour meetings:

| Component | Cost |
|-----------|------|
| YouTube API | Free |
| Audio storage (5GB) | $1.25/month |
| Transcription (Deepgram) | $25.80 |
| AI enrichment (GPT-4o-mini) | $12.00 |
| Embeddings | $0.02 |
| **Total** | **$39.07** one-time |

### Weekly Runs (4 meetings/week)

| Component | Cost |
|-----------|------|
| Processing | $1.51/week |
| **Monthly** | **$6.04/month** |

## 🚀 Step-by-Step Setup

### 1. Get API Keys

**YouTube Data API** (free):
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project
3. Enable "YouTube Data API v3"
4. Create API key

**Deepgram** ($200 free credit):
1. Sign up at [deepgram.com](https://deepgram.com/)
2. Get API key from console

**OpenAI**:
1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Add payment method
3. Create API key

### 2. Publish Actors to Apify

```bash
cd apify-actors

# Publish each actor
cd youtube-audio-downloader && apify push && cd ..
cd transcription-processor && apify push && cd ..
cd meeting-ai-enrichment && apify push && cd ..
cd youtube-meetings-orchestrator && apify push && cd ..
```

### 3. Test with Single Video

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 1,
  "downloadAudio": true,
  "youtubeApiKey": "YOUR_KEY",
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_KEY",
  "openaiApiKey": "YOUR_KEY"
}
```

Check logs to verify:
- ✅ Video discovered
- ✅ Audio downloaded
- ✅ Transcript generated
- ✅ AI enrichment complete

### 4. Run Initial Backfill

Process all historical videos in batches of 50:

```bash
apify call your-username/youtube-meetings-orchestrator --input '{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 50,
  ...
}'
```

Wait for completion (~2-3 hours per 50 videos).

Repeat with `maxVideos: 100`, `150`, etc. until all videos processed.

### 5. Set Up Weekly Schedule

In Apify Console:
1. Go to **Schedules** → **Create New**
2. Name: "Nantucket Weekly Meetings"
3. Frequency: **Weekly** → Monday 9:00 AM
4. Actor: `your-username/youtube-meetings-orchestrator`
5. Input:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 20,
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "{{DEEPGRAM_API_KEY}}",
  "openaiApiKey": "{{OPENAI_API_KEY}}",
  "youtubeApiKey": "{{YOUTUBE_API_KEY}}"
}
```

6. Enable notifications on failure

### 6. Import to ackindex

After each run, download the enriched dataset:

```bash
# Get dataset ID from orchestrator output
DATASET_ID="ghi789..."

# Download dataset
apify dataset download $DATASET_ID --output meetings.json

# Import to database
node scripts/import-meetings.js meetings.json
```

Or automate with a webhook/API call after each run.

## 📊 Monitoring

### Check Pipeline Health

**Apify Console**:
- Monitor scheduled run history
- Check dataset sizes
- Review error logs

**Cost Tracking**:
```bash
# Run cost estimator before large batches
node apify-actors/cost-estimator.js --videos 50 --duration 60
```

### Typical Run Times

| Videos | Download | Transcription | AI Enrichment | Total |
|--------|----------|---------------|---------------|-------|
| 1 | 1 min | 3 min | 30 sec | ~5 min |
| 10 | 10 min | 25 min | 5 min | ~40 min |
| 50 | 50 min | 2 hours | 25 min | ~3 hours |

## 🔧 Troubleshooting

### "No videos found"

**Check**:
1. Verify URL: https://www.youtube.com/@townofnantucket/streams
2. Check YouTube API quota in Google Cloud Console
3. Try `maxVideos: 1` as test

**Solution**: URL is correct and should work. Check API key permissions.

### "Transcription failed"

**Check**:
1. Deepgram API key valid
2. Deepgram credits remaining

**Solution**: Try different transcription service (assemblyai or openai-whisper)

### "High costs"

**Check**:
1. Using `gpt-4o-mini` not `gpt-4o`?
2. Using Deepgram not AssemblyAI?
3. Processing too many videos?

**Solution**: Run cost estimator first, process in smaller batches

### "Missing recent meetings"

**Check**:
1. When was last scheduled run?
2. Is schedule still enabled?
3. Check run history for failures

**Solution**: Manually trigger run, then check schedule settings

## 📈 Expected Results

After full backfill and weekly runs:

- **Total videos**: ~100-200 historical + 4 new/week
- **Storage**: ~10-20 GB audio files
- **Search**: Full-text + semantic search on all meetings
- **Features**:
  - Jump to specific moments via timestamps
  - Search by topic, speaker, decision
  - Embeddings for "find similar meetings"
  - Extracted quotes, action items, decisions

## 🎉 Success Checklist

- [ ] All API keys obtained and tested
- [ ] All 4 actors published to Apify
- [ ] Test run (1 video) successful
- [ ] Initial backfill (50 videos) complete
- [ ] Full backfill (all videos) complete
- [ ] Weekly schedule configured
- [ ] Import script tested with sample data
- [ ] Monitoring/alerts set up
- [ ] Cost tracking in place
- [ ] Integration with ackindex working

## 📞 Support

If you run into issues:
1. Check actor logs in Apify Console
2. Run cost estimator to verify expected costs
3. Test with single video first
4. Review API quotas in respective consoles

---

**Ready to process Nantucket town meetings!** 🏛️
