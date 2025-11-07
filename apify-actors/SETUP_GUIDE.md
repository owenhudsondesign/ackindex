# Complete Setup Guide - YouTube Meeting Pipeline

## Step 1: YouTube Data API Key (Google Cloud)

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **"Select a project"** dropdown at the top
4. Click **"New Project"**
5. Enter project name: `ackindex-youtube` or similar
6. Click **"Create"**
7. Wait for project to be created (~30 seconds)
8. Select your new project from the dropdown

### 1.2 Enable YouTube Data API v3

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for `YouTube Data API v3`
3. Click on **"YouTube Data API v3"**
4. Click **"Enable"**
5. Wait for API to be enabled (~10 seconds)

### 1.3 Create API Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. Your API key will be created and displayed (looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
5. Click the **"Copy"** icon to copy it
6. **IMPORTANT**: Click **"RESTRICT KEY"** (security best practice)

### 1.4 Restrict API Key (Security)

1. In the **"API restrictions"** section:
   - Select **"Restrict key"**
   - Check **"YouTube Data API v3"** only

2. In the **"Application restrictions"** section (optional but recommended):
   - Select **"IP addresses"**
   - Click **"ADD AN ITEM"**
   - Add your server's IP address
   - Or skip this if you want to use it locally too

3. Click **"Save"**

### 1.5 Check Quota

1. Go to **"APIs & Services"** → **"Dashboard"**
2. Click on **"YouTube Data API v3"**
3. Click on **"Quotas"** tab
4. You should see:
   - **Queries per day**: 10,000 units (FREE)
   - This is enough for ~3,000 videos per day

### 1.6 Add to Environment Variables

Add to your `.env` file:

```bash
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Step 2: Deepgram API Key (Transcription)

### 2.1 Sign Up for Deepgram

1. Go to [deepgram.com](https://deepgram.com/)
2. Click **"Sign Up"** or **"Get Started Free"**
3. Create account with email
4. Verify email address

### 2.2 Get $200 Free Credit

1. After signing up, you get **$200 free credit** automatically
2. No credit card required for signup
3. Credit lasts for 1 year

### 2.3 Create API Key

1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Click on **"API Keys"** in the left sidebar
3. Click **"Create a New API Key"**
4. Name it: `ackindex-transcription`
5. Select scopes: **All** (or just "Usage:Read" and "Usage:Write")
6. Click **"Create Key"**
7. Copy the API key (looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
8. **IMPORTANT**: Save it somewhere safe - you can't see it again!

### 2.4 Check Credit Balance

1. In the console, look for "Credits" in the top right
2. Should show: **$200.00** available
3. This is enough for ~7,700 hours of transcription!

### 2.5 Add to Environment Variables

```bash
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 3: OpenAI API Key (AI Enrichment)

### 3.1 Sign Up for OpenAI

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Click **"Sign Up"**
3. Create account or sign in with Google/Microsoft
4. Verify email

### 3.2 Add Payment Method

1. Go to [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
2. Click **"Add payment method"**
3. Enter credit card details
4. Set a spending limit (recommended: **$50/month** to start)

### 3.3 Create API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **"+ Create new secret key"**
3. Name it: `ackindex-enrichment`
4. Click **"Create secret key"**
5. Copy the key (looks like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
6. **IMPORTANT**: Save it - you can't see it again!

### 3.4 Check Usage

1. Go to [platform.openai.com/usage](https://platform.openai.com/usage)
2. Monitor costs here after running jobs
3. Set up usage alerts if desired

### 3.5 Add to Environment Variables

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 4: Apify Setup

### 4.1 Sign Up for Apify

1. Go to [apify.com](https://apify.com/)
2. Click **"Start for Free"**
3. Sign up with email or GitHub
4. Verify email

### 4.2 Get Free Tier

Apify free tier includes:
- **$5 free credit per month**
- **10 GB storage** (plenty for audio files)
- **Compute units** for running actors

This is enough for testing and small runs!

### 4.3 Get Apify Token

1. Go to [console.apify.com/account/integrations](https://console.apify.com/account/integrations)
2. Scroll to **"Personal API tokens"**
3. Your default token is already created
4. Click **"Show"** next to the token
5. Copy it (looks like: `apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### 4.4 Add to Environment Variables

```bash
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.5 Install Apify CLI

```bash
npm install -g apify-cli
```

### 4.6 Login to Apify CLI

```bash
apify login
```

Paste your Apify token when prompted.

---

## Step 5: Publish Actors to Apify

### 5.1 Navigate to Actors Directory

```bash
cd /Users/owenhudson/ackindex/apify-actors
```

### 5.2 Publish Actor 1 (Video Downloader)

```bash
cd youtube-audio-downloader

# Install dependencies
npm install

# Test locally first (optional)
cat > .actor/INPUT.json << 'EOF'
{
  "youtubeUrls": ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
  "downloadAudio": true,
  "maxVideos": 1
}
EOF

# Test run (optional - skip if you want to go straight to publishing)
npm start

# Publish to Apify
apify push

# Note the actor name from output (e.g., "your-username/youtube-audio-downloader")
cd ..
```

### 5.3 Publish Actor 2 (Transcription)

```bash
cd transcription-processor
npm install
apify push
cd ..
```

### 5.4 Publish Actor 3 (AI Enrichment)

```bash
cd meeting-ai-enrichment
npm install
apify push
cd ..
```

### 5.5 Publish Orchestrator

```bash
cd youtube-meetings-orchestrator
npm install
apify push
cd ..
```

### 5.6 Note Your Actor IDs

After publishing, note the actor IDs from the output. They look like:
- `your-username/youtube-audio-downloader`
- `your-username/transcription-processor`
- `your-username/meeting-ai-enrichment`
- `your-username/youtube-meetings-orchestrator`

You'll need these for the next step!

---

## Step 6: Test the Pipeline

### 6.1 Test with Single Video

Go to [console.apify.com](https://console.apify.com/)

1. Find your **youtube-meetings-orchestrator** actor
2. Click **"Try for Free"** or **"Run"**
3. Use this test input:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 1,
  "youtubeApiKey": "YOUR_YOUTUBE_API_KEY",
  "transcriptionService": "deepgram",
  "transcriptionApiKey": "YOUR_DEEPGRAM_API_KEY",
  "openaiApiKey": "YOUR_OPENAI_API_KEY",
  "openaiModel": "gpt-4o-mini",
  "enableEmbeddings": true,
  "actorIds": {
    "downloader": "your-username/youtube-audio-downloader",
    "transcriber": "your-username/transcription-processor",
    "enricher": "your-username/meeting-ai-enrichment"
  }
}
```

4. Click **"Start"**
5. Watch the logs (will take ~5-10 minutes for 1 video)

### 6.2 Verify Success

Check the logs for:
- ✅ `Stage 1 complete` - Video downloaded
- ✅ `Stage 2 complete` - Transcribed
- ✅ `Stage 3 complete` - AI enriched
- ✅ `PIPELINE COMPLETE!` - Success message with costs

### 6.3 Download Test Results

1. Click on the **Stage 3** dataset link in the logs
2. Click **"Export"** → **"JSON"**
3. Download and inspect the enriched meeting data

---

## Step 7: Integrate with ackindex

### 7.1 Update Environment Variables

Add all API keys to your ackindex `.env`:

```bash
# YouTube
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Transcription
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Enrichment (you might already have this)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Apify
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Actor IDs
YOUTUBE_ORCHESTRATOR_ACTOR_ID=your-username/youtube-meetings-orchestrator
```

### 7.2 Install Apify Client SDK

```bash
cd /Users/owenhudson/ackindex
npm install apify-client
```

### 7.3 Create Integration Helper

Create `/Users/owenhudson/ackindex/src/lib/youtubeProcessor.ts`:

```typescript
import { ApifyClient } from 'apify-client';
import logger from '@/lib/logger';

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN
});

export async function processYouTubeUrl(url: string, maxVideos: number = 20) {
  logger.info({ url, maxVideos }, 'Starting YouTube video processing');

  try {
    // Call orchestrator
    const run = await client
      .actor(process.env.YOUTUBE_ORCHESTRATOR_ACTOR_ID!)
      .call({
        youtubeUrls: [url],
        maxVideos,
        youtubeApiKey: process.env.YOUTUBE_API_KEY,
        transcriptionService: 'deepgram',
        transcriptionApiKey: process.env.DEEPGRAM_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        openaiModel: 'gpt-4o-mini',
        enableEmbeddings: true
      });

    logger.info({ runId: run.id }, 'Orchestrator started');

    // Wait for completion
    const finishedRun = await client.run(run.id).waitForFinish();

    logger.info({
      runId: run.id,
      status: finishedRun.status
    }, 'Orchestrator completed');

    // Get enriched results from Stage 3
    const datasets = finishedRun.defaultDatasetId;

    // The orchestrator output dataset contains the summary
    // We need to get the Stage 3 (enricher) dataset ID from the output
    const summaryDataset = client.dataset(finishedRun.defaultDatasetId);
    const { items: summary } = await summaryDataset.listItems();

    const stage3DatasetId = summary[0]?.datasets?.stage3;

    if (!stage3DatasetId) {
      throw new Error('Stage 3 dataset ID not found in orchestrator output');
    }

    // Fetch enriched meetings
    const enrichedDataset = client.dataset(stage3DatasetId);
    const { items: meetings } = await enrichedDataset.listItems();

    logger.info({
      meetingCount: meetings.length,
      datasetId: stage3DatasetId
    }, 'Retrieved enriched meetings');

    return {
      runId: run.id,
      datasetId: stage3DatasetId,
      meetings,
      summary: summary[0]
    };

  } catch (error) {
    logger.error({ error, url }, 'YouTube processing failed');
    throw error;
  }
}

export async function storeMeetingInDatabase(meeting: any) {
  // TODO: Store meeting in your PostgreSQL database
  // This will depend on your existing database schema

  const meetingData = {
    video_id: meeting.videoId,
    url: meeting.url,
    title: meeting.metadata.title,
    date: meeting.meeting.date,
    meeting_type: meeting.meeting.type,
    channel: meeting.metadata.channel,

    // Summary
    executive_summary: meeting.summary.executive,
    searchable_summary: meeting.summary.searchable,
    key_points: meeting.summary.keyPoints,
    decisions: meeting.summary.decisions,
    action_items: meeting.summary.actionItems,

    // Transcript
    full_transcript: meeting.transcript.full,
    transcript_segments: meeting.transcript.segments,
    word_count: meeting.transcript.wordCount,
    speakers_count: meeting.transcript.speakers,
    duration_seconds: meeting.transcript.duration,

    // Metadata
    topics: meeting.topics,
    attendees: meeting.meeting.attendees,
    quotes: meeting.quotes,
    video_timestamps: meeting.videoTimestamps,

    // Embeddings for semantic search
    embedding: meeting.embedding,

    // Costs
    transcription_cost: meeting.costs.transcription,
    ai_cost: meeting.costs.openai,
    total_cost: meeting.costs.total,

    processed_at: meeting.processedAt
  };

  // Insert into your database using your existing database functions
  // Example:
  // await createDocument(meetingData);

  logger.info({ videoId: meeting.videoId }, 'Meeting stored in database');

  return meetingData;
}
```

### 7.4 Update Scheduled Scraping Logic

Edit `/Users/owenhudson/ackindex/src/lib/scheduledScraping.ts`:

```typescript
// Add import at top
import { processYouTubeUrl, storeMeetingInDatabase } from '@/lib/youtubeProcessor';

// Add helper function
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Update processScheduledUrl function
async function processScheduledUrl(schedule: any) {
  // Check if URL is YouTube
  if (isYouTubeUrl(schedule.url)) {
    logger.info({ url: schedule.url }, 'Processing YouTube URL');

    try {
      // Process videos through Apify pipeline
      const result = await processYouTubeUrl(schedule.url, 20);

      // Store each meeting in database
      for (const meeting of result.meetings) {
        await storeMeetingInDatabase(meeting);
      }

      logger.info({
        url: schedule.url,
        meetingCount: result.meetings.length,
        totalCost: result.summary.costs.total
      }, 'YouTube processing complete');

      return;
    } catch (error) {
      logger.error({ error, url: schedule.url }, 'YouTube processing failed');
      throw error;
    }
  }

  // Otherwise, use existing Apify/Playwright scraping
  // ... existing code ...
}
```

---

## Step 8: Add Nantucket to Scheduled Scrapes

### 8.1 Via Database

```sql
INSERT INTO scheduled_scrapes (
  url,
  schedule,
  is_active,
  created_at
) VALUES (
  'https://www.youtube.com/@townofnantucket/streams',
  'weekly',
  true,
  NOW()
);
```

### 8.2 Or Via Admin UI

1. Go to your ackindex admin dashboard
2. Navigate to scheduled scrapes section
3. Add new scrape:
   - URL: `https://www.youtube.com/@townofnantucket/streams`
   - Schedule: `weekly`
   - Active: `true`

---

## Step 9: Test Integration

### 9.1 Manual Trigger

Trigger the scrape manually to test:

```bash
# Call your manual trigger endpoint
curl -X POST https://your-ackindex-domain.com/api/admin/trigger-scrape \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scrapeId": "YOUR_SCRAPE_ID"}'
```

### 9.2 Monitor Logs

Watch your application logs for:
- ✅ YouTube URL detected
- ✅ Apify orchestrator started
- ✅ Meetings retrieved
- ✅ Meetings stored in database

### 9.3 Verify in Database

Check that meetings were stored:

```sql
SELECT
  video_id,
  title,
  meeting_type,
  date,
  word_count,
  total_cost
FROM meetings -- or your table name
WHERE channel = 'Nantucket Town Government'
ORDER BY date DESC
LIMIT 10;
```

---

## Step 10: Set Up Weekly Automation

### 10.1 Verify Cron Job

Your existing cron job should already pick up the YouTube URL automatically!

Check `/Users/owenhudson/ackindex/src/app/api/cron/scrape/route.ts` is running weekly.

### 10.2 Test Cron Locally

```bash
# Call your cron endpoint
curl -X POST https://your-ackindex-domain.com/api/cron/scrape \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 10.3 Monitor First Automated Run

After deploying, wait for the first scheduled run and verify:
- Runs on schedule
- Processes new videos
- Skips already-processed videos
- Stores results in database

---

## Cost Tracking

### After Test Run

Check actual costs in each service:

**Deepgram**:
- Go to [console.deepgram.com](https://console.deepgram.com/)
- Check "Usage" tab
- Should show ~$0.26 per hour of audio

**OpenAI**:
- Go to [platform.openai.com/usage](https://platform.openai.com/usage)
- Check recent usage
- Should show ~$0.01-0.02 per meeting with gpt-4o-mini

**Apify**:
- Go to [console.apify.com/billing](https://console.apify.com/billing)
- Check "Usage" tab
- Should be negligible compute costs

---

## Troubleshooting

### YouTube API Quota Exceeded

**Error**: `403 quotaExceeded`

**Solution**:
- Daily quota is 10,000 units (resets at midnight Pacific)
- Reduce `maxVideos` in your input
- Or request quota increase from Google

### Deepgram Credits Running Low

**Check balance**: [console.deepgram.com](https://console.deepgram.com/)

**Solution**:
- Add payment method to continue after $200 credit
- Or switch to `assemblyai` (5 hours free, then pay-as-you-go)

### Apify Actor Not Found

**Error**: `Actor with ID "..." not found`

**Solution**:
- Make sure you ran `apify push` for all actors
- Update `YOUTUBE_ORCHESTRATOR_ACTOR_ID` in `.env` with correct actor name
- Check actor is set to "Public" in Apify console

### High Costs

**Check**:
- Using `gpt-4o-mini` not `gpt-4o`? (100x cheaper!)
- Using `deepgram` not `assemblyai`? (5x cheaper!)

**Solution**: Run cost estimator before large batches:

```bash
node apify-actors/cost-estimator.js --videos 50 --duration 60
```

---

## Summary Checklist

- [ ] YouTube API key obtained and added to `.env`
- [ ] Deepgram API key obtained and added to `.env`
- [ ] OpenAI API key obtained and added to `.env`
- [ ] Apify token obtained and added to `.env`
- [ ] Apify CLI installed and logged in
- [ ] All 4 actors published to Apify
- [ ] Test run (1 video) successful
- [ ] Integration code added to ackindex
- [ ] Nantucket URL added to scheduled scrapes
- [ ] Manual trigger test successful
- [ ] Cron job verified working
- [ ] Cost tracking set up
- [ ] Database storing meetings correctly

---

## Next Steps

Once everything is working:

1. **Initial Backfill**: Process all historical videos in batches of 50
2. **Weekly Automation**: Let cron job catch new videos automatically
3. **Monitor Costs**: Check usage dashboards weekly
4. **Optimize**: Adjust `maxVideos`, `filterKeywords` as needed

You're all set! 🎉
