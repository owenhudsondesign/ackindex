import { Actor } from 'apify';
import ytdl from '@distube/ytdl-core';
import { Readable } from 'stream';

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

// Helper: Check if video matches filter criteria
function matchesFilters(videoInfo, keywords, minDuration, maxDuration) {
  const title = videoInfo.videoDetails.title.toLowerCase();
  const description = (videoInfo.videoDetails.description || '').toLowerCase();
  const duration = parseInt(videoInfo.videoDetails.lengthSeconds);

  // Check duration
  if (duration < minDuration || duration > maxDuration) {
    return false;
  }

  // Check keywords (if provided)
  if (keywords && keywords.length > 0) {
    const hasKeyword = keywords.some(keyword =>
      title.includes(keyword.toLowerCase()) ||
      description.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) return false;
  }

  return true;
}

// Helper: Fetch videos from YouTube channel using API
async function fetchChannelVideos(channelId, apiKey, maxResults = 50, includeLivestreams = true) {
  if (!apiKey) {
    console.log('⚠️ YouTube API key not provided, skipping channel fetch');
    return [];
  }

  try {
    const allVideos = [];

    // Method 1: Get regular uploads from uploads playlist
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );

    if (!channelResponse.ok) {
      throw new Error(`Failed to fetch channel info: ${channelResponse.status}`);
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      console.log(`⚠️ Channel not found: ${channelId}`);
      return [];
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch videos from uploads playlist
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`
    );

    if (!playlistResponse.ok) {
      throw new Error(`Failed to fetch playlist items: ${playlistResponse.status}`);
    }

    const playlistData = await playlistResponse.json();

    allVideos.push(...playlistData.items.map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
      type: 'upload'
    })));

    // Method 2: Search for livestreams (completed/archived)
    if (includeLivestreams) {
      console.log(`   🔴 Searching for livestreams and premieres...`);

      // Search for completed livestreams
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&type=video&eventType=completed&key=${apiKey}`
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const livestreams = searchData.items.map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          channelTitle: item.snippet.channelTitle,
          type: 'livestream'
        }));

        console.log(`   ✅ Found ${livestreams.length} archived livestreams`);
        allVideos.push(...livestreams);
      }

      // Also search without eventType to catch all videos
      const allSearchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&type=video&order=date&key=${apiKey}`
      );

      if (allSearchResponse.ok) {
        const allSearchData = await allSearchResponse.json();
        const searchVideos = allSearchData.items.map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          channelTitle: item.snippet.channelTitle,
          type: 'search'
        }));

        allVideos.push(...searchVideos);
      }
    }

    // Deduplicate by videoId
    const uniqueVideos = Array.from(
      new Map(allVideos.map(v => [v.videoId, v])).values()
    );

    console.log(`   📊 Total unique videos found: ${uniqueVideos.length}`);
    return uniqueVideos;

  } catch (error) {
    console.log(`⚠️ Error fetching channel videos: ${error.message}`);
    return [];
  }
}

// Helper: Fetch videos from YouTube playlist using API
async function fetchPlaylistVideos(playlistId, apiKey, maxResults = 50) {
  if (!apiKey) {
    console.log('⚠️ YouTube API key not provided, skipping playlist fetch');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle
    }));
  } catch (error) {
    console.log(`⚠️ Error fetching playlist videos: ${error.message}`);
    return [];
  }
}

// Helper: Parse YouTube URL to determine type (video, channel, playlist, streams)
function parseYouTubeUrl(url) {
  // Video URL patterns
  if (url.includes('watch?v=') || url.includes('youtu.be/') || url.includes('/embed/')) {
    const videoId = extractVideoId(url);
    return videoId ? { type: 'video', id: videoId } : null;
  }

  // Streams/Live tab pattern (e.g., youtube.com/@channel/streams)
  const streamsMatch = url.match(/youtube\.com\/@([^\/\?]+)\/streams/);
  if (streamsMatch) {
    return { type: 'streams', id: streamsMatch[1] };
  }

  // Channel URL patterns
  const channelMatch = url.match(/youtube\.com\/(channel\/|@|c\/)([^\/\?]+)/);
  if (channelMatch) {
    return { type: 'channel', id: channelMatch[2] };
  }

  // Playlist URL pattern
  const playlistMatch = url.match(/[?&]list=([^&]+)/);
  if (playlistMatch) {
    return { type: 'playlist', id: playlistMatch[1] };
  }

  return null;
}

// Helper: Convert channel handle (@username) to channel ID
async function resolveChannelHandle(handle, apiKey) {
  if (!apiKey) return null;

  try {
    // Try search API to find channel by handle
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    }
  } catch (error) {
    console.log(`⚠️ Error resolving channel handle: ${error.message}`);
  }

  return null;
}

// Main actor logic
await Actor.main(async () => {
  const input = await Actor.getInput() || {};

  const {
    youtubeUrls = [],
    channelIds = [],
    downloadAudio = true,
    maxVideos = 50,
    filterKeywords = ['meeting', 'council', 'board', 'hearing', 'session', 'committee'],
    minDuration = 300, // 5 minutes
    maxDuration = 18000, // 5 hours
    youtubeApiKey,
    includeLivestreams = true
  } = input;

  console.log('🎬 Starting YouTube Audio Downloader...');
  console.log(`📊 Settings: maxVideos=${maxVideos}, downloadAudio=${downloadAudio}`);
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
    } else if (parsed.type === 'streams') {
      console.log(`🔴 Fetching livestreams from channel: ${parsed.id}`);
      // This is the /streams tab - fetch livestreams specifically
      let channelId = parsed.id;
      if (channelId.startsWith('@')) {
        channelId = await resolveChannelHandle(channelId, youtubeApiKey);
        if (!channelId) {
          console.log(`⚠️ Could not resolve channel handle: ${parsed.id}`);
          continue;
        }
      }

      // Force livestream search for /streams URLs
      const videos = await fetchChannelVideos(channelId, youtubeApiKey, maxVideos, true);
      videos.forEach(v => videoIdsToProcess.add(v.videoId));
      console.log(`✅ Added ${videos.length} livestreams from channel`);
    } else if (parsed.type === 'channel') {
      console.log(`📺 Fetching videos from channel: ${parsed.id}`);
      // Check if it's a handle (@username)
      let channelId = parsed.id;
      if (channelId.startsWith('@')) {
        channelId = await resolveChannelHandle(channelId, youtubeApiKey);
        if (!channelId) {
          console.log(`⚠️ Could not resolve channel handle: ${parsed.id}`);
          continue;
        }
      }

      const videos = await fetchChannelVideos(channelId, youtubeApiKey, maxVideos, includeLivestreams);
      videos.forEach(v => videoIdsToProcess.add(v.videoId));
      console.log(`✅ Added ${videos.length} videos from channel`);
    } else if (parsed.type === 'playlist') {
      console.log(`📋 Fetching videos from playlist: ${parsed.id}`);
      const videos = await fetchPlaylistVideos(parsed.id, youtubeApiKey, maxVideos);
      videos.forEach(v => videoIdsToProcess.add(v.videoId));
      console.log(`✅ Added ${videos.length} videos from playlist`);
    }
  }

  // Process channel IDs
  for (const channelId of channelIds) {
    console.log(`📺 Fetching videos from channel ID: ${channelId}`);
    const videos = await fetchChannelVideos(channelId, youtubeApiKey, maxVideos, includeLivestreams);
    videos.forEach(v => videoIdsToProcess.add(v.videoId));
    console.log(`✅ Added ${videos.length} videos from channel`);
  }

  console.log(`\n📦 Total videos to process: ${videoIdsToProcess.size}`);

  // Process each video
  let processed = 0;
  let downloaded = 0;
  let filtered = 0;

  const videoIds = Array.from(videoIdsToProcess).slice(0, maxVideos);

  for (const videoId of videoIds) {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`\n📹 Processing (${processed + 1}/${videoIds.length}): ${videoId}`);

      // Get video info
      const info = await ytdl.getInfo(videoUrl);

      // Apply filters
      if (!matchesFilters(info, filterKeywords, minDuration, maxDuration)) {
        console.log(`⏭️ Filtered out: ${info.videoDetails.title}`);
        filtered++;
        continue;
      }

      const videoDetails = info.videoDetails;
      const duration = parseInt(videoDetails.lengthSeconds);

      console.log(`✅ Match: ${videoDetails.title}`);
      console.log(`   Channel: ${videoDetails.author.name}`);
      console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
      console.log(`   Published: ${videoDetails.publishDate}`);

      let audioFileKey = null;
      let audioFileSize = 0;
      let status = 'metadata_only';

      // Download audio if enabled
      if (downloadAudio) {
        try {
          console.log('🎵 Downloading audio...');

          // Get audio format (lowest quality audio to save bandwidth)
          const audioFormat = ytdl.chooseFormat(info.formats, {
            quality: 'lowestaudio',
            filter: 'audioonly'
          });

          if (!audioFormat) {
            throw new Error('No audio format available');
          }

          console.log(`   Format: ${audioFormat.mimeType}, ${audioFormat.audioBitrate}kbps`);

          // Download audio stream
          const audioStream = ytdl(videoUrl, { format: audioFormat });

          // Collect audio data into buffer
          const chunks = [];
          for await (const chunk of audioStream) {
            chunks.push(chunk);
          }
          const audioBuffer = Buffer.concat(chunks);
          audioFileSize = audioBuffer.length;

          console.log(`   Downloaded: ${(audioFileSize / 1024 / 1024).toFixed(2)} MB`);

          // Save to Key-Value Store
          audioFileKey = `audio_${videoId}.${audioFormat.container}`;
          await Actor.setValue(audioFileKey, audioBuffer, { contentType: audioFormat.mimeType });

          console.log(`   Saved to KVS: ${audioFileKey}`);
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
        title: videoDetails.title,
        description: videoDetails.description,
        channel: videoDetails.author.name,
        channelId: videoDetails.author.id,
        channelUrl: videoDetails.author.channel_url,
        duration: duration,
        durationFormatted: `${Math.floor(duration / 60)}m ${duration % 60}s`,
        uploadDate: videoDetails.uploadDate,
        publishDate: videoDetails.publishDate,
        viewCount: parseInt(videoDetails.viewCount),
        audioFileKey,
        audioFileSize,
        audioFileSizeMB: audioFileSize ? (audioFileSize / 1024 / 1024).toFixed(2) : 0,
        status,
        processedAt: new Date().toISOString()
      });

      processed++;

      // Rate limiting to avoid YouTube throttling
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`⚠️ Error processing video ${videoId}: ${error.message}`);

      // Save error record
      await Actor.pushData({
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        status: 'error',
        error: error.message,
        processedAt: new Date().toISOString()
      });
    }
  }

  console.log('\n🎉 Processing complete!');
  console.log(`📊 Summary:`);
  console.log(`   Total videos discovered: ${videoIdsToProcess.size}`);
  console.log(`   Videos processed: ${processed}`);
  console.log(`   Audio files downloaded: ${downloaded}`);
  console.log(`   Videos filtered out: ${filtered}`);
});
