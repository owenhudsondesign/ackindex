/**
 * Test script for YouTube playlist support
 *
 * Usage:
 *   tsx test-playlist.ts <playlist-url> [max-videos]
 *
 * Example:
 *   tsx test-playlist.ts "https://www.youtube.com/playlist?list=PLxxxxx" 3
 */

import {
  isPlaylistUrl,
  extractPlaylistId,
  getPlaylistVideos
} from './src/lib/youtubeGladiaScraper';

async function testPlaylist() {
  const playlistUrl = process.argv[2];
  const maxVideos = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  if (!playlistUrl) {
    console.error('❌ Usage: tsx test-playlist.ts <playlist-url> [max-videos]');
    console.error('   Example: tsx test-playlist.ts "https://www.youtube.com/playlist?list=PLxxxxx" 3');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TESTING YOUTUBE PLAYLIST SUPPORT');
  console.log('='.repeat(80));

  // Test 1: Check if URL is a playlist
  console.log('\n📋 Test 1: Checking if URL is a playlist...');
  const isPlaylist = isPlaylistUrl(playlistUrl);
  console.log(`   Result: ${isPlaylist ? '✅ YES' : '❌ NO'}`);

  if (!isPlaylist) {
    console.error('❌ URL is not a valid playlist URL');
    console.log('\n💡 Playlist URLs should look like:');
    console.log('   https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxx');
    process.exit(1);
  }

  // Test 2: Extract playlist ID
  console.log('\n🔍 Test 2: Extracting playlist ID...');
  const playlistId = extractPlaylistId(playlistUrl);
  console.log(`   Playlist ID: ${playlistId}`);

  if (!playlistId) {
    console.error('❌ Could not extract playlist ID');
    process.exit(1);
  }

  // Test 3: Fetch videos from playlist
  console.log('\n📹 Test 3: Fetching videos from playlist...');
  console.log(`   Max videos: ${maxVideos || 'unlimited'}`);

  try {
    const videoIds = await getPlaylistVideos(playlistId, maxVideos);

    console.log(`\n✅ Successfully fetched ${videoIds.length} videos!`);
    console.log('\nFirst 10 video IDs:');
    videoIds.slice(0, 10).forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
      console.log(`      URL: https://www.youtube.com/watch?v=${id}`);
    });

    if (videoIds.length > 10) {
      console.log(`   ... and ${videoIds.length - 10} more videos`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(80));

    console.log('\n📝 Next steps:');
    console.log('   1. Process a single video to test:');
    console.log(`      curl -X POST http://localhost:3000/api/admin/process-video \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"url": "https://www.youtube.com/watch?v=${videoIds[0]}"}'`);
    console.log('\n   2. Process the whole playlist:');
    console.log(`      curl -X POST http://localhost:3000/api/admin/process-video \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"url": "${playlistUrl}", "maxVideos": 3, "useQueue": true}'`);

  } catch (error) {
    console.error('\n❌ Error fetching videos:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('YOUTUBE_API_KEY')) {
      console.log('\n💡 Make sure YOUTUBE_API_KEY is set in your .env.local file');
    }

    if (error instanceof Error && error.message.includes('403')) {
      console.log('\n💡 YouTube API quota may be exceeded. Check your Google Cloud Console.');
    }

    process.exit(1);
  }
}

testPlaylist().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
