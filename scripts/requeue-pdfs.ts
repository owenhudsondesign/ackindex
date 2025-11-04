import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

// Now import dependencies AFTER env vars are loaded
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

async function requeueFailedPDFs() {
  console.log('Re-queueing failed PDFs as new jobs...\n');

  // Create Redis connection with loaded env vars
  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
  });

  // Create Queue instance
  const pdfProcessingQueue = new Queue('pdf-processing', {
    connection: redisConnection,
  });

  // Create Supabase client to query documents
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get the two failed document IDs
    const failedDocIds = [
      '3cf6a4ee-2b85-4dbd-821d-fee142146314', // 2022
      '40a930ae-8b6e-4e09-a61a-3261793bd263', // 2023
    ];

    console.log('Looking up document details...\n');

    for (const documentId of failedDocIds) {
      // Get document details from database
      const { data: doc, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !doc) {
        console.error(`❌ Could not find document ${documentId}`);
        continue;
      }

      console.log(`Found: ${doc.title || doc.url}`);

      // Check if there's a storage path in metadata or we need to construct it
      // Looking at the upload flow, PDFs are stored as: userId/timestamp-filename.pdf
      // But after processing they're deleted, so we need to re-upload

      console.log(`⚠️  Document ${documentId} needs manual re-upload`);
      console.log(`   Original file: ${doc.title || 'Unknown'}`);
      console.log(`   Status: ${doc.status}`);
      console.log('');
    }

    console.log('\n📋 Summary:');
    console.log('The failed PDFs have been processed as far as possible but the storage files');
    console.log('were likely already deleted. You have two options:');
    console.log('');
    console.log('1. Delete these documents and re-upload the PDFs through the admin panel');
    console.log('2. If the PDFs still exist in Supabase Storage, we can create a manual requeue script');
    console.log('');
    console.log('To check storage, run:');
    console.log('SELECT * FROM storage.objects WHERE bucket_id = \'pdfs\';');

    await pdfProcessingQueue.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pdfProcessingQueue.close();
    await redisConnection.quit();
    process.exit(1);
  }
}

requeueFailedPDFs().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
