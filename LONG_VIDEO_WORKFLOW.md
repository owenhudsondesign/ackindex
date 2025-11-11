# Long Video Processing Workflow

## Overview

Videos over 120 minutes require manual processing due to API limitations. This document outlines the simple workflow for handling long government meetings.

## Why Manual Processing?

- **Gladia limit:** 120 minutes for YouTube URLs
- **YouTube blocks:** Automated downloaders get detected
- **Livestream VODs:** Usually don't have auto-captions
- **AssemblyAI solution:** Supports up to 10 hours, no chunking needed

## The Workflow (15-20 minutes per long video)

### Step 1: Notification (Automatic)

When a long video is detected, you'll receive an email alert:

```
Subject: Manual Processing Needed: Select Board Meeting - Jan 15
Duration: 185 minutes
Video URL: https://youtube.com/watch?v=abc123
Document ID: uuid-here

Action required: Download and process via manual script
```

The document is automatically created with status `pending_manual`.

### Step 2: Download Audio (5 minutes)

Use any YouTube-to-MP3 service (no installation needed):

**Option A: Online Converter (Recommended)**
- Visit: https://ytmp3.nu or https://y2mate.com
- Paste YouTube URL
- Download MP3 file
- Save to your computer

**Option B: Desktop App**
- 4K Video Downloader: https://www.4kdownload.com/
- MediaHuman: https://www.mediahuman.com/
- Extract audio only (MP3 format)

**Tips:**
- Choose MP3 format (most compatible)
- Quality doesn't need to be max (128kbps is fine for speech)
- File will be ~50-150 MB for 2-3 hour meeting

### Step 3: Process with Script (10-15 minutes automated)

Run the manual processing script:

```bash
cd /path/to/ackindex

tsx scripts/process-long-video.ts <video-id> /path/to/downloaded-audio.mp3
```

**Example:**
```bash
tsx scripts/process-long-video.ts abc123xyz ~/Downloads/select-board-jan15.mp3
```

**What the script does:**
1. Looks up document in database
2. Fetches video metadata from YouTube
3. Uploads audio to AssemblyAI
4. Waits for transcription (~20-30% of audio duration)
5. Enriches with AI (summaries, decisions, topics)
6. Stores chunks in database
7. Marks document as complete
8. Generates embeddings (automatic via worker)

**Expected output:**
```
================================================================================
MANUAL LONG VIDEO PROCESSING
================================================================================
Video ID: abc123xyz
Audio file: select-board-jan15.mp3
File size: 87.43 MB
================================================================================

📋 Looking up document in database...
✅ Found document: uuid-here
   Title: Select Board Meeting - January 15, 2025
   Status: pending_manual

📹 Fetching video metadata from YouTube API...
✅ Video metadata retrieved
   Title: Select Board Meeting - January 15, 2025
   Channel: Town of Nantucket

📝 Updating document status to processing...

🎙️  Starting AssemblyAI transcription...
   This may take a while for long videos (typically 15-30% of audio duration)

📤 Uploading audio file...
✅ Upload complete

⏳ Starting transcription (this may take a while for long files)...
✅ [ASSEMBLYAI] Transcription completed
   Transcript length: 45231 characters
   Duration: 185 minutes
   Segments: 342

💾 Storing transcript and generating embeddings...

🤖 Enriching transcript with AI...
✅ Enrichment complete

📊 Created 125 total chunks:
   Summary chunks: 8
   Transcript chunks: 117

💾 Storing 125 chunks in database...
✅ Chunks stored

✅ Marking document as completed (48750 tokens)...

================================================================================
✅ PROCESSING COMPLETE!
================================================================================
Document ID: uuid-here
Video: Select Board Meeting - January 15, 2025
Duration: 185 minutes
Status: Ready for search
================================================================================

💰 Cost breakdown:
   AssemblyAI: $2.01 (3.08 hrs @ $0.65/hr)
   Revenue: $138.75 (185 min @ $0.75/min)
   Profit: $136.74 (98.5% margin)
```

### Step 4: Cleanup (Optional)

Delete the downloaded MP3 file to free up space:
```bash
rm ~/Downloads/select-board-jan15.mp3
```

---

## Frequency & Time Investment

**Expected volume (at 5,000 min/month):**
- Long videos: 3-5 per month
- Your time: 15-20 min per video
- **Total: 1-2 hours/month**

**Cost per long video (3-hour meeting):**
- AssemblyAI: $1.95 (3 hrs @ $0.65/hr)
- Your time: 20 min @ $30/hr = $10
- **Total cost: $11.95**
- **Revenue: $135** (180 min @ $0.75/min)
- **Profit: $123** (91% margin)

---

## Troubleshooting

### "Document not found for video ID"

The document wasn't created automatically. This means the video wasn't processed through the normal flow first.

**Solution:**
1. Submit the video URL through the admin interface first
2. Wait for the "long video" alert
3. Then run the manual script

### "YOUTUBE_API_KEY not set"

Make sure your `.env.local` file has the YouTube API key.

### "ASSEMBLYAI_API_KEY not set"

Get an API key from https://www.assemblyai.com/ and add to `.env.local`:
```
ASSEMBLYAI_API_KEY=your-key-here
```

**AssemblyAI free tier:**
- 100 hours/month free
- Then $0.65/hour
- Perfect for your use case

### "Audio file not found"

Check the path to your downloaded MP3 file:
```bash
ls -lh ~/Downloads/*.mp3
```

### Processing takes forever

AssemblyAI typically takes 20-30% of the audio duration to transcribe. For a 3-hour video:
- Expected: 35-55 minutes
- You can close terminal and come back (it's async)

---

## For Your B2G Proposal

### Positioning to Town

**In your proposal, present it as:**

> "Our service handles videos of any length. Standard processing (under 2 hours) provides 24-hour turnaround. Extended meetings (2-4 hours) are processed with 48-hour turnaround. Same rate applies: $0.75/minute regardless of length."

**Don't mention:**
- Manual steps
- Technical limitations
- Different APIs

**The town sees:**
- Simple, predictable pricing
- No length restrictions
- Professional service

**You know:**
- 90% automated (videos <120 min)
- 10% manual (15-20 min of your time)
- Still 91%+ margins on long videos

---

## Scaling Considerations

### At 1 town (5,000 min/month):
- Long videos: 3-5/month
- Your time: 1-2 hrs/month
- **Manageable**

### At 3 towns (15,000 min/month):
- Long videos: 10-15/month
- Your time: 3-5 hrs/month
- **Still manageable**

### At 5+ towns:
- Consider hiring a VA to handle downloads
- Or automate with a premium bot service
- Or upgrade to Gladia Enterprise (if available)

---

## Setup Instructions

### 1. Get AssemblyAI API Key

1. Go to https://www.assemblyai.com/
2. Sign up for free account
3. Get API key from dashboard
4. Add to `.env.local`:
   ```
   ASSEMBLYAI_API_KEY=your-key-here
   ```

### 2. Test the Script

Download a short video and test:
```bash
# Get a short test video
# Download as MP3 from youtube-to-mp3 service

# Run script
tsx scripts/process-long-video.ts TEST_VIDEO_ID ~/Downloads/test.mp3
```

### 3. Set Up Email Alerts (Optional)

Configure your email in the worker to receive alerts for long videos.

---

## Alternative: Gladia Enterprise

If manual processing becomes burdensome (>10 long videos/month), consider Gladia Enterprise:

**Pros:**
- Handles up to 4h 15min automatically
- No manual steps
- Same API as current system

**Cons:**
- Unknown pricing (need custom quote)
- Likely requires $500-1000/month minimum
- Contract/commitment required

**When to consider:**
- Processing >15 long videos/month
- Have multiple town contracts
- Manual workflow becomes annoying

**Get a quote:** Contact sales@gladia.io with your expected volume

---

## Summary

✅ **15-20 minutes of your time per long video**
✅ **3-5 long videos/month (typical)**
✅ **91%+ profit margins**
✅ **No complex automation needed**
✅ **Professional results for town**

This manual hybrid approach gives you:
- Simple, reliable workflow
- High margins
- No technical complexity
- Scalable to multiple towns

**Cost of automation (8+ hours dev) > Cost of manual processing ($60-120/month)**
