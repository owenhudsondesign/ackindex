# Finding YouTube Livestream Playlists

Government meeting livestreams are often hidden from the main channel page. Here's how to find them.

## Quick Steps

### 1. Check for Playlists

Go to the channel's **Playlists** tab:
```
https://www.youtube.com/@ChannelName/playlists
```

Look for playlists named:
- "Livestreams"
- "Past Livestreams"
- "Town Meetings"
- "Council Meetings"
- "Archived Meetings"

### 2. Get the Playlist URL

Click on the playlist, then copy the URL from your browser:
```
https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxx
```

That's the URL you need!

### 3. Use It in the Actor

```json
{
  "youtubeUrls": ["https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxx"],
  "maxVideos": 100,
  "downloadAudio": true
}
```

## If There's No Playlist

If the channel doesn't organize livestreams into a playlist, you have two options:

### Option A: Enable Livestream Search (Automatic)

Set `includeLivestreams: true` to automatically search for livestreams:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@ChannelName"],
  "includeLivestreams": true,
  "maxVideos": 100,
  "youtubeApiKey": "YOUR_YOUTUBE_API_KEY"
}
```

**Pros**:
- Automatic
- Finds most livestreams
- No manual work

**Cons**:
- Uses 3-5x more YouTube API quota
- May miss some edge cases

### Option B: Manual Video List

Create a list of direct video URLs:

```json
{
  "youtubeUrls": [
    "https://www.youtube.com/watch?v=abc123",
    "https://www.youtube.com/watch?v=def456",
    "https://www.youtube.com/watch?v=ghi789"
  ],
  "maxVideos": 100
}
```

**Pros**:
- 100% reliable
- No API quota used
- Precise control

**Cons**:
- Manual work required
- Not scalable

## Finding Hidden Livestreams Manually

### Method 1: Channel Search

1. Go to the channel page
2. Click the search icon (🔍)
3. Search for "meeting" or "live"
4. Filter by: **Videos** → **Live**

### Method 2: YouTube Search

Search YouTube directly:
```
"channel name" meeting live
```

Then filter results by:
- Channel: [Your channel]
- Type: Live
- Sort by: Upload date

### Method 3: Use the YouTube API Explorer

1. Go to: https://developers.google.com/youtube/v3/docs/search/list
2. Set parameters:
   - `part`: snippet
   - `channelId`: Your channel ID
   - `type`: video
   - `eventType`: completed
   - `maxResults`: 50

3. Click "Execute"
4. Browse results to find livestreams

## Real Example: Nantucket Town Government

### Option 1: Use the /streams URL (Recommended ⭐)

Nantucket has a dedicated Live/Streams tab:

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket/streams"],
  "maxVideos": 100,
  "downloadAudio": true,
  "youtubeApiKey": "YOUR_KEY"
}
```

This automatically fetches all livestreams from: https://www.youtube.com/@townofnantucket/streams

### Option 2: Check for Playlists (Alternative)

Check the Playlists page:
```
https://www.youtube.com/@townofnantucket/playlists
```

If you find a livestream playlist:
```json
{
  "youtubeUrls": ["https://www.youtube.com/playlist?list=PLxxxxx"],
  "maxVideos": 100
}
```

### Option 3: Auto-search (Fallback)

```json
{
  "youtubeUrls": ["https://www.youtube.com/@townofnantucket"],
  "includeLivestreams": true,
  "maxVideos": 100,
  "youtubeApiKey": "YOUR_KEY"
}
```

## Troubleshooting

### "Not finding all livestreams"

**Cause**: YouTube's search API has limitations

**Solution**:
1. Try direct playlist URL if available
2. Increase `maxVideos` parameter
3. Run multiple times with different date ranges (future feature)

### "API quota exceeded"

**Cause**: Livestream search uses 3-5x more quota

**Solution**:
1. Find and use direct playlist URL
2. Reduce `maxVideos`
3. Request quota increase from Google
4. Use multiple API keys (rotate daily)

### "Videos are private/unlisted"

**Cause**: Some meetings may be unlisted or private

**Solution**:
- You can't access private videos via API
- For unlisted videos, you need the direct video URL
- Contact the channel owner to make videos public

## Best Practices

✅ **DO**: Find the playlist URL if it exists (most reliable)
✅ **DO**: Use `includeLivestreams: true` for smaller batches (<50 videos)
✅ **DO**: Start with a test run (`maxVideos: 5`) to verify it works
✅ **DO**: Monitor API quota usage in Google Cloud Console

❌ **DON'T**: Use livestream search for large batches (>100 videos) without checking quota
❌ **DON'T**: Assume all livestreams are publicly accessible
❌ **DON'T**: Run without `filterKeywords` if the channel has non-meeting content

## Summary: Decision Tree

```
Do you have a livestream playlist URL?
├─ YES → Use direct playlist URL (Option 1) ⭐
└─ NO → Do you need to process >50 videos?
    ├─ YES → Find playlist URL or use manual list (Option 3)
    └─ NO → Use includeLivestreams: true (Option 2)
```

## Support

If you're having trouble finding livestreams:
1. Check the channel's Playlists tab first
2. Try `includeLivestreams: true` with `maxVideos: 5` as a test
3. Check the actor logs to see what videos were found
4. If still issues, try manual video list as fallback
