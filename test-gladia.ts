#!/usr/bin/env tsx
/**
 * Test script to verify Gladia API integration
 * Usage: npx tsx test-gladia.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGladiaConnection() {
  const apiKey = process.env.GLADIA_API_KEY;

  console.log('🔍 Testing Gladia API Connection...\n');

  if (!apiKey) {
    console.error('❌ GLADIA_API_KEY not found in .env.local');
    console.error('Please add: GLADIA_API_KEY=your-key-here');
    process.exit(1);
  }

  console.log('✅ GLADIA_API_KEY found:', apiKey.substring(0, 10) + '...');

  // Test with a very short audio URL (public domain)
  const testAudioUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

  console.log('\n📝 Initiating test transcription...');
  console.log('Test URL:', testAudioUrl);

  try {
    const response = await fetch('https://api.gladia.io/v2/pre-recorded', {
      method: 'POST',
      headers: {
        'x-gladia-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: testAudioUrl,
        language_config: {
          languages: ['en'],
          code_switching: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gladia API Error:', response.status, errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log('\n✅ Transcription job started successfully!');
    console.log('Job ID:', result.id);
    console.log('Result URL:', result.result_url);

    console.log('\n⏳ Waiting for transcription to complete (this may take a few minutes)...');

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(
        `https://api.gladia.io/v2/pre-recorded/${result.id}`,
        {
          headers: {
            'x-gladia-key': apiKey,
          },
        }
      );

      const status = await statusResponse.json();
      console.log(`Status check ${attempts + 1}:`, status.status);

      if (status.status === 'done') {
        console.log('\n✅ Transcription completed!');
        console.log('Transcript preview:', status.result?.transcription?.full_transcript?.substring(0, 200) + '...');
        console.log('\n🎉 Gladia integration is working correctly!');
        process.exit(0);
      }

      if (status.status === 'error') {
        console.error('❌ Transcription failed:', status.error);
        process.exit(1);
      }

      attempts++;
    }

    console.error('❌ Timeout: Transcription took too long');
    process.exit(1);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGladiaConnection();
