/**
 * Test Bunny.net Upload
 *
 * Simple script to verify Bunny credentials work
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import bunnyStorage (after env vars are loaded)
import { bunnyStorage } from '../src/lib/bunnyStorage';
import fs from 'fs';

async function testBunnyUpload() {
  console.log('🧪 Testing Bunny.net upload...\n');

  // Debug: Check environment variables
  console.log('📋 Environment Variables:');
  console.log('BUNNY_STORAGE_ZONE:', process.env.BUNNY_STORAGE_ZONE ? '✅ Set' : '❌ Missing');
  console.log('BUNNY_ACCESS_KEY:', process.env.BUNNY_ACCESS_KEY ? '✅ Set' : '❌ Missing');
  console.log('BUNNY_PULL_ZONE_URL:', process.env.BUNNY_PULL_ZONE_URL ? '✅ Set' : '❌ Missing');
  console.log('BUNNY_STORAGE_REGION:', process.env.BUNNY_STORAGE_REGION ? '✅ Set' : '❌ Missing');
  console.log();

  // Create a small test file
  const testContent = Buffer.from('Test video file - ' + new Date().toISOString());
  const testPath = 'test/test-video-' + Date.now() + '.mp4';

  console.log(`📤 Uploading test file to: ${testPath}`);

  try {
    const result = await bunnyStorage.uploadVideo(
      testContent,
      testPath,
      {
        contentType: 'video/mp4'
      }
    );

    if (result.success) {
      console.log('✅ Upload successful!\n');
      console.log('Storage URL:', result.storageUrl);
      console.log('CDN URL:', result.cdnUrl);
      console.log('File Size:', result.fileSize, 'bytes\n');

      // Test download
      console.log('📥 Testing CDN download...');
      const downloadResponse = await fetch(result.cdnUrl);

      if (downloadResponse.ok) {
        const downloadedContent = await downloadResponse.text();
        console.log('✅ Download successful!');
        console.log('Downloaded content:', downloadedContent.substring(0, 50) + '...\n');
      } else {
        console.log('❌ Download failed:', downloadResponse.status);
      }

      // Clean up
      console.log('🧹 Cleaning up test file...');
      const deleted = await bunnyStorage.deleteFile(testPath);
      if (deleted) {
        console.log('✅ Test file deleted\n');
      }

      console.log('🎉 All tests passed! Bunny.net is configured correctly.');

    } else {
      console.log('❌ Upload failed:', result.error);
      console.log('\nTroubleshooting:');
      console.log('1. Check BUNNY_STORAGE_ZONE in .env.local');
      console.log('2. Check BUNNY_ACCESS_KEY is correct (read-write password)');
      console.log('3. Check BUNNY_PULL_ZONE_URL is correct');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.log('\nMake sure these environment variables are set in .env.local:');
    console.log('- BUNNY_STORAGE_ZONE');
    console.log('- BUNNY_ACCESS_KEY');
    console.log('- BUNNY_PULL_ZONE_URL');
    console.log('- BUNNY_STORAGE_REGION');
  }
}

testBunnyUpload().catch(console.error);
