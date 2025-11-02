#!/usr/bin/env tsx
/**
 * Test Redis Connection
 *
 * This script tests the connection to Upstash Redis
 *
 * Usage: npx tsx test-redis.ts
 */

import Redis from 'ioredis';

async function testRedisConnection() {
  console.log('🧪 Testing Redis Connection...\n');

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable not set');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl.includes('upstash') ? {} : undefined,
  });

  try {
    // Test connection with PING
    console.log('\n🏓 Sending PING...');
    const pong = await redis.ping();
    console.log(`✅ Response: ${pong}`);

    // Test SET command
    console.log('\n📝 Testing SET command...');
    await redis.set('test:key', 'Hello from AckIndex!');
    console.log('✅ SET successful');

    // Test GET command
    console.log('\n📖 Testing GET command...');
    const value = await redis.get('test:key');
    console.log(`✅ GET successful: ${value}`);

    // Test DELETE command
    console.log('\n🗑️  Testing DEL command...');
    await redis.del('test:key');
    console.log('✅ DEL successful');

    // Get Redis info
    console.log('\n📊 Redis Server Info:');
    const info = await redis.info('server');
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('redis_version:') ||
          line.startsWith('os:') ||
          line.startsWith('uptime_in_days:')) {
        console.log(`   ${line}`);
      }
    }

    console.log('\n✅ All tests passed! Redis connection is working properly.');
  } catch (error) {
    console.error('\n❌ Redis connection test failed:', error);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('\n👋 Connection closed');
  }
}

testRedisConnection();
