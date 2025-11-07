import { Actor } from 'apify';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Helper: Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper: Parse YouTube URL
function parseYouTubeUrl(url) {
  try {
    const urlObj = new URL(url);

    // Direct video URL
    const videoId = extractVideoId(url);
    if (videoId) {
      return { type: 'video', id: videoId };
    }

    // Playlist URL
    const playlistMatch = url.match(/[?&]list=([^&]+)/);
    if (playlistMatch) {
      return { type: 'playlist', id: playlistMatch[1] };
    }

    // Channel URL (@handle or /channel/ or /c/)
    const channelMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (channelMatch) {
      return { type: 'channel', id: channelMatch[1], isHandle: true };
    }

    const channelIdMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
    if (channelIdMatch) {
      return { type: 'channel', id: channelIdMatch[1], isHandle: false };
    }

    // Streams/Live tab pattern
    const streamsMatch = url.match(/youtube\.com\/@([^\/\?]+)\/streams/);
    if (streamsMatch) {
      return { type: 'streams', id: streamsMatch[1] };
    }

  } catch (error) {
    console.log(`Error parsing URL: ${error.message}`);
  }

  return null;
}

// Helper: Fetch channel videos using YouTube API
async function fetchChannelVideos(channelId, apiKey, maxResults = 50, includeLivestreams = true) {
  if (!apiKey) {
    console.log('⚠️ No YouTube API key provided, skipping channel discovery');
    return [];
  }

  const allVideos = new Map();

  try {
    // Method 1: Get uploads playlist
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );

    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      if (channelData.items && channelData.items.length > 0) {
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        const playlistResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`
        );

        if (playlistResponse.ok) {
          const playlistData = await playlistResponse.json();
          playlistData.items?.forEach(item => {
            allVideos.set(item.snippet.resourceId.videoId, item.snippet.resourceId.videoId);
          });
        }
      }
    }

    // Method 2: Search for livestreams if enabled
    if (includeLivestreams) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=completed&type=video&order=date&maxResults=${maxResults}&key=${apiKey}`
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        searchData.items?.forEach(item => {
          if (item.id.videoId) {
            allVideos.set(item.id.videoId, item.id.videoId);
          }
        });
      }
    }

  } catch (error) {
    console.log(`⚠️ Error fetching channel videos: ${error.message}`);
  }

  return Array.from(allVideos.values()).slice(0, maxResults);
}

// Helper: Get video metadata using yt-dlp
async function getVideoInfo(videoId) {
  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --extractor-args "youtube:player_client=android" "https://www.youtube.com/watch?v=${videoId}"`
    );
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

// Helper: Download audio using yt-dlp
async function downloadAudio(videoId, outputPath) {
  try {
    // Download audio-only, best quality with anti-bot measures
    await execAsync(
      `yt-dlp -f "bestaudio[ext=m4a]/bestaudio/best" --extract-audio --audio-format m4a --output "${outputPath}" --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --extractor-args "youtube:player_client=android" "https://www.youtube.com/watch?v=${videoId}"`
    );

    // Check if file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('Audio file was not created');
    }

    return outputPath;
  } catch (error) {
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

// Helper: Check if video matches filter criteria
function matchesFilters(videoInfo, keywords, minDuration, maxDuration) {
  const title = (videoInfo.title || '').toLowerCase();
  const description = (videoInfo.description || '').toLowerCase();
  const duration = videoInfo.duration || 0;

  // Check duration
  if (duration < minDuration || duration > maxDuration) {
    return false;
  }

  // Check keywords (if provided)
  if (keywords && keywords.length > 0) {
    const titleMatch = keywords.some(keyword =>
      title.includes(keyword.toLowerCase())
    );
    const descMatch = keywords.some(keyword =>
      description.includes(keyword.toLowerCase())
    );

    return titleMatch || descMatch;
  }

  return true;
}

// Main actor logic
await Actor.main(async () => {
  const input = await Actor.getInput() || {};

  const {
    youtubeUrls = [],
    channelIds = [],
    downloadAudio: shouldDownloadAudio = true,
    maxVideos = 50,
    filterKeywords = ['meeting', 'council', 'board', 'hearing', 'session', 'committee'],
    minDuration = 300, // 5 minutes
    maxDuration = 18000, // 5 hours
    youtubeApiKey,
    includeLivestreams = true
  } = input;

  console.log('🎬 Starting YouTube Audio Downloader...');
  console.log(`📊 Settings: maxVideos=${maxVideos}, downloadAudio=${shouldDownloadAudio}`);
  console.log(`🔍 Filter keywords: ${filterKeywords.join(', ')}`);
  console.log(`⏱️ Duration range: ${minDuration}s - ${maxDuration}s`);

  // Collect all video IDs to process
  const videoIdsToProcess = new Set();

  // Process direct video URLs
  for (const url of youtubeUrls) {
    const parsed = parseYouTubeUrl(url);

    if (!parsed) {
      console.log(`⚠️ Invalid YouTube URL: ${url}`);
      continue;
    }

    if (parsed.type === 'video') {
      videoIdsToProcess.add(parsed.id);
      console.log(`✅ Added video: ${parsed.id}`);
    } else if (parsed.type === 'channel' || parsed.type === 'streams') {
      // Fetch videos from channel
      let channelId = parsed.id;

      // If it's a handle, we need to search for the channel
      if (parsed.isHandle || parsed.type === 'streams') {
        console.log(`🔍 Resolving channel handle: @${parsed.id}`);
        // Use search to find channel
        if (youtubeApiKey) {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.id)}&maxResults=1&key=${youtubeApiKey}`;
          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              channelId = data.items[0].snippet.channelId;
              console.log(`✅ Resolved to channel ID: ${channelId}`);
            }
          }
        }
      }

      const videos = await fetchChannelVideos(channelId, youtubeApiKey, maxVideos, includeLivestreams);
      videos.forEach(vid => videoIdsToProcess.add(vid));
      console.log(`✅ Added ${videos.length} videos from channel`);
    } else if (parsed.type === 'playlist') {
      console.log(`⚠️ Playlist URL not yet supported: ${url}`);
    }
  }

  // Add channel IDs
  for (const channelId of channelIds) {
    const videos = await fetchChannelVideos(channelId, youtubeApiKey, maxVideos, includeLivestreams);
    videos.forEach(vid => videoIdsToProcess.add(vid));
    console.log(`✅ Added ${videos.length} videos from channel ID: ${channelId}`);
  }

  console.log(`\n📦 Total videos to process: ${videoIdsToProcess.size}\n`);

  let processed = 0;
  let downloaded = 0;
  let filtered = 0;

  const tmpDir = '/tmp/audio';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  for (const videoId of Array.from(videoIdsToProcess).slice(0, maxVideos)) {
    processed++;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      console.log(`📹 Processing (${processed}/${Math.min(videoIdsToProcess.size, maxVideos)}): ${videoId}`);

      // Get video info
      const info = await getVideoInfo(videoId);

      // Check filters
      if (!matchesFilters(info, filterKeywords, minDuration, maxDuration)) {
        console.log(`⏭️ Filtered out: ${info.title}`);
        filtered++;
        continue;
      }

      const duration = info.duration || 0;

      console.log(`✅ Match: ${info.title}`);
      console.log(`   Channel: ${info.uploader || info.channel}`);
      console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
      console.log(`   Published: ${info.upload_date || 'unknown'}`);

      let audioFileKey = null;
      let audioFileSize = 0;
      let status = 'metadata_only';

      // Download audio if enabled
      if (shouldDownloadAudio) {
        try {
          console.log('🎵 Downloading audio...');

          const audioPath = path.join(tmpDir, `${videoId}.m4a`);
          await downloadAudio(videoId, audioPath);

          const stats = fs.statSync(audioPath);
          audioFileSize = stats.size;

          console.log(`   Downloaded: ${(audioFileSize / 1024 / 1024).toFixed(2)} MB`);

          // Save to Key-Value Store
          audioFileKey = `audio_${videoId}.m4a`;
          const audioBuffer = fs.readFileSync(audioPath);
          await Actor.setValue(audioFileKey, audioBuffer, { contentType: 'audio/mp4' });

          console.log(`   Saved to KVS: ${audioFileKey}`);

          // Clean up temp file
          fs.unlinkSync(audioPath);

          status = 'downloaded';
          downloaded++;
        } catch (downloadError) {
          console.log(`⚠️ Audio download failed: ${downloadError.message}`);
          status = 'download_failed';
        }
      }

      // Save to dataset
      await Actor.pushData({
        videoId,
        url: videoUrl,
        title: info.title,
        description: info.description,
        channel: info.uploader || info.channel,
        channelId: info.channel_id,
        channelUrl: info.uploader_url || info.channel_url,
        duration: duration,
        durationFormatted: `${Math.floor(duration / 60)}m ${duration % 60}s`,
        uploadDate: info.upload_date,
        publishDate: info.release_date || info.upload_date,
        viewCount: info.view_count || 0,
        audioFileKey,
        audioFileSize,
        audioFileSizeMB: audioFileSize ? (audioFileSize / 1024 / 1024).toFixed(2) : 0,
        status,
        processedAt: new Date().toISOString()
      });

      console.log('');
    } catch (error) {
      console.log(`⚠️ Error processing video ${videoId}: ${error.message}`);
      console.log('');
    }
  }

  console.log('🎉 Processing complete!');
  console.log('📊 Summary:');
  console.log(`   Total videos discovered: ${videoIdsToProcess.size}`);
  console.log(`   Videos processed: ${processed}`);
  console.log(`   Audio files downloaded: ${downloaded}`);
  console.log(`   Videos filtered out: ${filtered}`);
});
