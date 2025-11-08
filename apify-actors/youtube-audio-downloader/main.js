import { Actor } from 'apify';
import { Innertube } from 'youtubei.js';

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

// Helper: Get video metadata using YouTube API
async function getVideoInfo(videoId, apiKey) {
  if (!apiKey) {
    throw new Error('YouTube API key is required');
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];

    // Parse ISO 8601 duration (PT1H30M15S)
    const duration = parseDuration(video.contentDetails.duration);

    return {
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channel: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      publishedAt: video.snippet.publishedAt,
      duration: duration,
      viewCount: parseInt(video.statistics.viewCount) || 0,
      thumbnails: video.snippet.thumbnails
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

// Helper: Parse ISO 8601 duration to seconds
function parseDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

// Helper: Fetch transcript using youtubei.js
async function fetchTranscript(videoId, youtube) {
  try {
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    if (!transcriptData || !transcriptData.content) {
      throw new Error('No transcript available');
    }

    // Convert to format compatible with our pipeline
    const transcript = transcriptData.content.body.initial_segments.map(segment => ({
      text: segment.snippet.text,
      offset: segment.start_ms / 1000, // Convert ms to seconds
      duration: segment.end_ms / 1000 - segment.start_ms / 1000
    }));

    return transcript;
  } catch (error) {
    throw new Error(`Failed to fetch transcript: ${error.message}`);
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
    maxVideos = 50,
    filterKeywords = ['meeting', 'council', 'board', 'hearing', 'session', 'committee'],
    minDuration = 300, // 5 minutes
    maxDuration = 18000, // 5 hours
    youtubeApiKey,
    includeLivestreams = true
  } = input;

  if (!youtubeApiKey) {
    throw new Error('YouTube API key is required');
  }

  console.log('🎬 Starting YouTube Transcript Fetcher...');
  console.log(`📊 Settings: maxVideos=${maxVideos}`);
  console.log(`🔍 Filter keywords: ${filterKeywords.join(', ')}`);
  console.log(`⏱️ Duration range: ${minDuration}s - ${maxDuration}s`);

  // Initialize YouTube client
  console.log('📺 Initializing YouTube client...');
  const youtube = await Innertube.create();

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
  let transcriptsFetched = 0;
  let filtered = 0;
  let failed = 0;

  for (const videoId of Array.from(videoIdsToProcess).slice(0, maxVideos)) {
    processed++;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      console.log(`📹 Processing (${processed}/${Math.min(videoIdsToProcess.size, maxVideos)}): ${videoId}`);

      // Get video info from YouTube API
      const info = await getVideoInfo(videoId, youtubeApiKey);

      // Check filters
      if (!matchesFilters(info, filterKeywords, minDuration, maxDuration)) {
        console.log(`⏭️ Filtered out: ${info.title}`);
        filtered++;
        continue;
      }

      const duration = info.duration || 0;

      console.log(`✅ Match: ${info.title}`);
      console.log(`   Channel: ${info.channel}`);
      console.log(`   Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
      console.log(`   Published: ${info.publishedAt}`);

      let status = 'metadata_only';
      let transcript = null;
      let transcriptText = '';
      let transcriptWordCount = 0;

      // Fetch transcript
      try {
        console.log('📝 Fetching transcript...');

        transcript = await fetchTranscript(videoId, youtube);

        if (transcript && transcript.length > 0) {
          // Combine all transcript segments into full text
          transcriptText = transcript.map(t => t.text).join(' ');
          transcriptWordCount = transcriptText.split(/\s+/).length;

          console.log(`   Transcript: ${transcript.length} segments, ${transcriptWordCount} words`);
          status = 'transcript_fetched';
          transcriptsFetched++;
        } else {
          console.log(`   ⚠️ Transcript is empty`);
          status = 'no_transcript';
        }
      } catch (transcriptError) {
        console.log(`⚠️ Transcript fetch failed: ${transcriptError.message}`);
        status = 'transcript_unavailable';
      }

      // Save to dataset
      await Actor.pushData({
        videoId,
        url: videoUrl,
        title: info.title,
        description: info.description,
        channel: info.channel,
        channelId: info.channelId,
        publishedAt: info.publishedAt,
        duration: duration,
        durationFormatted: `${Math.floor(duration / 60)}m ${duration % 60}s`,
        viewCount: info.viewCount,
        transcript: transcript,  // Array of {text, offset, duration}
        transcriptText: transcriptText,  // Full text
        transcriptWordCount: transcriptWordCount,
        status,
        processedAt: new Date().toISOString()
      });

      console.log('');
    } catch (error) {
      console.log(`⚠️ Error processing video ${videoId}: ${error.message}`);
      failed++;
      console.log('');
    }
  }

  console.log('🎉 Processing complete!');
  console.log('📊 Summary:');
  console.log(`   Total videos discovered: ${videoIdsToProcess.size}`);
  console.log(`   Videos processed: ${processed}`);
  console.log(`   Transcripts fetched: ${transcriptsFetched}`);
  console.log(`   Videos filtered out: ${filtered}`);
  console.log(`   Failed: ${failed}`);
});
