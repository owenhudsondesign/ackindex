# YouTube Audio Downloader (Actor 1)

Discovers and downloads audio from YouTube government meeting videos for transcription processing.

## Features

- **Multiple Input Types**: Supports direct video URLs, channel URLs, channel IDs, and playlist URLs
- **Smart Filtering**: Filters videos by keywords (e.g., "meeting", "council") and duration
- **Audio Extraction**: Downloads audio-only streams optimized for transcription (lowest quality to save bandwidth)
- **Metadata Collection**: Extracts video title, description, duration, channel info, view counts
- **Key-Value Storage**: Stores audio files in Apify KVS for efficient access by downstream actors
- **YouTube API Integration**: Uses YouTube Data API v3 to discover videos from channels/playlists

## Input Schema

```json
{
  "youtubeUrls": ["https://www.youtube.com/watch?v=abc123"],
  "channelIds": ["UCxxxxxxxxxxxxxxx"],
  "downloadAudio": true,
  "maxVideos": 50,
  "filterKeywords": ["meeting", "council", "board", "hearing"],
  "minDuration": 300,
  "maxDuration": 18000,
  "youtubeApiKey": "YOUR_YOUTUBE_API_KEY"
}
```

### Parameters

- **youtubeUrls** (array): YouTube video, channel, or playlist URLs
- **channelIds** (array): YouTube channel IDs to monitor
- **downloadAudio** (boolean): Whether to download audio (default: true)
- **maxVideos** (integer): Max videos to process per run (default: 50)
- **filterKeywords** (array): Filter by title/description keywords
- **minDuration** (integer): Minimum video duration in seconds (default: 300)
- **maxDuration** (integer): Maximum video duration in seconds (default: 18000)
- **youtubeApiKey** (string): YouTube Data API v3 key (required for channels/playlists)

## Output Dataset

Each video produces a record like:

```json
{
  "videoId": "abc123",
  "url": "https://youtube.com/watch?v=abc123",
  "title": "Town Council Meeting - January 2025",
  "description": "Regular meeting of the Town Council...",
  "channel": "Nantucket Town Government",
  "channelId": "UCxxxxxxxx",
  "channelUrl": "https://youtube.com/@NantucketTown",
  "duration": 3600,
  "durationFormatted": "60m 0s",
  "uploadDate": "2025-01-15",
  "publishDate": "2025-01-15",
  "viewCount": 1250,
  "audioFileKey": "audio_abc123.webm",
  "audioFileSize": 52428800,
  "audioFileSizeMB": "50.00",
  "status": "downloaded",
  "processedAt": "2025-01-15T10:30:00.000Z"
}
```

### Status Values

- `downloaded`: Audio successfully downloaded to KVS
- `metadata_only`: Metadata collected but audio not downloaded
- `download_failed`: Audio download failed (metadata still available)
- `error`: Processing failed

## Usage Examples

### Example 1: Nantucket Town Government (Livestreams Tab) ⭐

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 100,
  "downloadAudio": true,
  "youtubeApiKey": "YOUR_API_KEY"
}
```

**This is the recommended approach!** The `/streams` URL automatically fetches all livestreams from the channel's Live tab.

### Example 2: Download from a single video

```json
{
  "youtubeUrls": ["https://www.youtube.com/watch?v=abc123"],
  "downloadAudio": true
}
```

### Example 3: Monitor a government channel (includes livestreams)

```json
{
  "youtubeUrls": ["https://www.youtube.com/@NantucketTownGovernment"],
  "maxVideos": 100,
  "filterKeywords": ["meeting", "council", "hearing"],
  "includeLivestreams": true,
  "youtubeApiKey": "YOUR_API_KEY"
}
```

**Note**: Setting `includeLivestreams: true` will search for archived livestream reuploads in addition to regular uploads. This uses more YouTube API quota but finds more videos.

### Example 4: Process a specific livestream playlist

```json
{
  "youtubeUrls": ["https://www.youtube.com/playlist?list=PLxxxxx_LIVESTREAMS"],
  "downloadAudio": true,
  "maxVideos": 50,
  "youtubeApiKey": "YOUR_API_KEY"
}
```

**Recommended for livestreams**: If your town government has a specific playlist for livestream reuploads, link directly to that playlist URL. This is the most reliable way to get all livestreams.

## Working with Livestreams

YouTube treats livestreams differently than regular uploads. You have **three options**:

### Option 1: Direct Playlist URL (Recommended ⭐)

If the channel has a specific playlist for livestream reuploads:

```json
{
  "youtubeUrls": ["https://www.youtube.com/playlist?list=PLxxxxx"],
  "maxVideos": 100
}
```

**Pros**: Most reliable, gets all livestreams
**Cons**: Requires knowing the playlist URL

### Option 2: Enable Livestream Search

Use the `includeLivestreams` parameter:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@ChannelName"],
  "includeLivestreams": true,
  "maxVideos": 100
}
```

This searches for:
- Regular uploads (from uploads playlist)
- Archived livestreams (completed events)
- All videos by date (search API)

**Pros**: Automatic, finds most videos
**Cons**: Uses more YouTube API quota (~9-15 units per video vs 3 units)

### Option 3: Direct Video URLs

If you know specific video URLs:

```json
{
  "youtubeUrls": [
    "https://www.youtube.com/watch?v=abc123",
    "https://www.youtube.com/watch?v=def456"
  ]
}
```

**Pros**: No API key needed, precise control
**Cons**: Manual, not scalable

### API Quota Impact

| Method | Quota Cost per Video | Daily Limit (10k quota) |
|--------|---------------------|-------------------------|
| Direct video URLs | 0 units | Unlimited |
| Playlist | ~3 units | ~3,300 videos |
| Channel (regular) | ~3 units | ~3,300 videos |
| Channel + livestreams | ~9-15 units | ~700-1,100 videos |

**Recommendation**: If you're processing <50 videos, use `includeLivestreams: true`. For large batches or regular runs, find the livestream playlist URL.

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. (Optional) Restrict key to YouTube Data API v3 and your IP

**Free Quota**: 10,000 units/day (1 video = ~3 units, sufficient for ~3,000 videos/day)

## Local Testing

```bash
# Install dependencies
cd apify-actors/youtube-audio-downloader
npm install

# Set input
cat > .actor/INPUT.json << EOF
{
  "youtubeUrls": ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
  "downloadAudio": true,
  "maxVideos": 1
}
EOF

# Run locally
npm start
```

## Deployment to Apify

```bash
# Build and push to Apify
apify login
apify push

# Run on Apify platform
apify call your-username/youtube-audio-downloader --input '{"youtubeUrls": ["..."]}'
```

## Cost Estimates

### YouTube API Costs
- **Free tier**: 10,000 units/day
- **Cost per video**: ~3 units
- **Daily capacity**: ~3,000 videos/day (free)

### Storage Costs (Apify)
- **Audio file size**: ~50 MB per hour of video (low quality audio)
- **KVS pricing**: Included in Apify plan (first 10 GB free, then $0.25/GB/month)

### Compute Costs (Apify)
- **Processing time**: ~30 seconds per video (with download)
- **Compute units**: ~0.01 CU per video
- **Cost**: $0.25 per 1M CU → ~$0.0000025 per video

**Example**: Processing 100 town meeting videos (1 hour each)
- YouTube API: Free
- Storage: 5 GB × $0.25 = $1.25/month
- Compute: 100 × $0.0000025 = $0.00025
- **Total**: ~$1.25/month

## Integration with Actor 2

This actor outputs a dataset that Actor 2 (Transcription Processor) can read:

```javascript
// In Actor 2
const datasetId = 'YOUR_DATASET_ID'; // From Actor 1's run
const dataset = await Actor.openDataset(datasetId);
const { items } = await dataset.getData();

for (const video of items) {
  if (video.status === 'downloaded') {
    // Download audio from KVS
    const audioBuffer = await Actor.getValue(video.audioFileKey);
    // Send to transcription...
  }
}
```

## Error Handling

- **YouTube throttling**: Automatic rate limiting (1s delay between videos)
- **Invalid URLs**: Skipped with warning in logs
- **API quota exceeded**: Graceful degradation (can't fetch channels/playlists)
- **Download failures**: Recorded in dataset with status `download_failed`

## Limitations

- Maximum 500 videos per run (can be increased in input)
- Audio quality optimized for transcription (not music playback)
- Requires YouTube API key for channel/playlist discovery
- Subject to YouTube's rate limits and terms of service

## Next Steps

After running this actor:
1. Note the dataset ID from the run output
2. Pass it to **Actor 2 (Transcription Processor)** for audio-to-text conversion
3. Check KVS for downloaded audio files

## Support

For issues or questions:
- Check Apify logs for detailed error messages
- Verify YouTube API key is valid and has quota remaining
- Test with a single video first before processing large batches
