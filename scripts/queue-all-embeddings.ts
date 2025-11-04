import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

async function queueAllEmbeddings() {
  console.log('Queuing embedding generation for all chunks without embeddings...\n');

  // Create Redis connection
  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
  });

  // Create embedding queue
  const embeddingQueue = new Queue('embedding', {
    connection: redisConnection,
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all chunks without embeddings
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('id, content')
      .is('embedding', null)
      .limit(1000); // Process 1000 at a time

    if (error) {
      console.error('Error fetching chunks:', error);
      process.exit(1);
    }

    if (!chunks || chunks.length === 0) {
      console.log('✅ All chunks already have embeddings!');
      process.exit(0);
    }

    console.log(`Found ${chunks.length} chunks without embeddings\n`);

    // Batch into groups of 50 for efficient processing
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }

    console.log(`Creating ${batches.length} embedding job(s)...\n`);

    let jobCount = 0;
    for (const batch of batches) {
      const job = await embeddingQueue.add(
        'generate-embeddings',
        {
          chunks: batch.map(chunk => ({
            id: chunk.id,
            content: chunk.content,
          })),
        },
        {
          priority: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      );

      jobCount++;
      console.log(`  ✓ Queued job ${jobCount}/${batches.length} (${batch.length} chunks)`);
    }

    console.log('\n✅ Successfully queued all embedding jobs!');
    console.log(`\nTotal chunks queued: ${chunks.length}`);
    console.log(`Total jobs created: ${batches.length}`);
    console.log(`\nMonitor progress in Bull Board or Railway logs.`);
    console.log(`Run this script again if there are more than 1000 chunks remaining.`);

    await embeddingQueue.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await embeddingQueue.close();
    await redisConnection.quit();
    process.exit(1);
  }
}

queueAllEmbeddings();
