# Migrate from Supabase Storage to Bunny.net

## Cost Savings: Bunny.net vs Supabase Storage

### For 7,000 Hours (17.5 TB)

| Service | Storage Cost | Bandwidth Cost | Total Monthly |
|---------|--------------|----------------|---------------|
| **Bunny.net** ✅ | **$87.50** | **$5** (500 GB) | **$92.50/mo** |
| Supabase Storage | $367.50 | $4,500 (500 GB × $0.09) | $4,867.50/mo |
| **SAVINGS** | **$280/mo** | **$4,495/mo** | **$4,775/mo** (98% cheaper!) |

**Annual savings: $57,300/year** 🎯

---

## Setup: Create Bunny.net Account

### Step 1: Create Storage Zone

1. Go to https://bunny.net
2. Sign up for account
3. Navigate to **Storage** → **Add Storage Zone**
4. Settings:
   - **Name**: `ackindex-videos` (or your preferred name)
   - **Region**: Choose closest to your users
     - **US East (New York)** - Best for East Coast
     - **US West (Los Angeles)** - Best for West Coast
     - **Europe (Germany)** - Best for EU
   - **Replication**: Enable for redundancy (adds 20% cost but worth it)
5. Click **Add Storage Zone**
6. **Save the Access Key** - you'll need this!

### Step 2: Create Pull Zone (CDN)

1. Navigate to **CDN** → **Add Pull Zone**
2. Settings:
   - **Name**: `ackindex-cdn` (or your preferred name)
   - **Origin Type**: Select **Bunny Storage Zone**
   - **Storage Zone**: Select `ackindex-videos` (created above)
   - **CDN Locations**: Select **All** for global delivery
3. Click **Add Pull Zone**
4. **Save the Pull Zone URL** (e.g., `ackindex-cdn.b-cdn.net`)

### Step 3: Configure Environment Variables

Add to `.env.local`:

```bash
# Bunny.net Configuration
BUNNY_STORAGE_ZONE=ackindex-videos
BUNNY_ACCESS_KEY=your-access-key-here-from-step1
BUNNY_PULL_ZONE_URL=https://ackindex-cdn.b-cdn.net
BUNNY_STORAGE_REGION=ny  # 'ny' for US East, 'la' for US West, 'de' for EU
```

---

## Implementation: Update Code for Bunny.net

### 1. Update Upload Route

**File**: `/src/app/api/staff/upload/complete/route.ts`

```typescript
import { bunnyStorage } from '@/lib/bunnyStorage';

// Change from Supabase Storage to Bunny.net
export async function POST(request: Request) {
  // ... existing auth and validation code ...

  // OLD: Upload to Supabase Storage
  // const { data: uploadData, error: uploadError } = await supabase.storage
  //   .from('meeting-videos')
  //   .upload(storagePath, file);

  // NEW: Upload to Bunny.net
  const bunnyPath = bunnyStorage.generateMeetingPath(
    organizationId,
    videoId,
    originalFilename
  );

  const uploadResult = await bunnyStorage.uploadVideo(
    fileBuffer,
    bunnyPath,
    {
      contentType: 'video/mp4',
      onProgress: (percent) => {
        console.log(`Upload progress: ${percent}%`);
      }
    }
  );

  if (!uploadResult.success) {
    return NextResponse.json({
      error: 'Failed to upload video to storage',
      details: uploadResult.error
    }, { status: 500 });
  }

  // Save Bunny URLs to database
  await supabase
    .from('meeting_videos')
    .update({
      storage_provider: 'bunny',
      storage_path: bunnyPath,
      storage_url: uploadResult.storageUrl,  // Management URL
      public_url: uploadResult.cdnUrl,       // Playback URL
      file_size_bytes: uploadResult.fileSize,
    })
    .eq('id', videoId);

  // ... rest of the code ...
}
```

### 2. Update Worker for Video Download

**File**: `/src/lib/workers.ts`

Update `processMeetingVideoJob` function:

```typescript
async function processMeetingVideoJob(data: ScrapingJobData, job: Job) {
  const { videoId, documentId, storageUrl, storagePath } = data;

  // ... existing setup code ...

  // OLD: Download from Supabase Storage
  // const { data: videoBlob } = await supabaseAdmin.storage
  //   .from('meeting-videos')
  //   .download(storagePath);

  // NEW: Download from Bunny.net (or any URL)
  log.info('Downloading video from Bunny.net');
  const videoResponse = await fetch(storageUrl);

  if (!videoResponse.ok) {
    throw new Error(`Failed to download video from Bunny: ${videoResponse.status}`);
  }

  const buffer = Buffer.from(await videoResponse.arrayBuffer());

  // Save to temp file for AssemblyAI
  const tempDir = os.tmpdir();
  const tempVideoPath = path.join(tempDir, `meeting_video_${videoId}.mp4`);
  fs.writeFileSync(tempVideoPath, buffer);

  log.info({ tempVideoPath, size: buffer.length }, 'Video downloaded to temp file');
  await job.updateProgress(20);

  // Continue with existing AssemblyAI transcription code...
  // (No changes needed for the rest of the function)
}
```

### 3. Update Database Schema

**File**: `/supabase/migrations/20251124_bunny_storage.sql`

```sql
-- Add Bunny-specific fields to meeting_videos
ALTER TABLE meeting_videos
  ALTER COLUMN storage_provider SET DEFAULT 'bunny';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_meeting_videos_storage_provider
  ON meeting_videos(storage_provider);

-- Optionally: Migrate existing Supabase videos to Bunny
-- (Run this as a separate script if you have existing videos)
```

### 4. Update Video Player Component

**File**: `/src/components/VideoPlayer.tsx`

```typescript
export function VideoPlayer({ videoUrl, transcript, initialTimestamp }: VideoPlayerProps) {
  // Bunny CDN URLs work out of the box with HTML5 video
  // No changes needed! Just pass the CDN URL

  return (
    <video
      ref={videoRef}
      src={videoUrl}  // This now points to Bunny CDN
      controls
      className="w-full"
      preload="metadata"
    />
  );
}
```

**That's it!** Bunny CDN is S3-compatible and works seamlessly with HTML5 video.

---

## Migration: Move Existing Videos from Supabase to Bunny

If you already have videos in Supabase Storage, here's how to migrate:

### Option 1: Migrate Gradually (Recommended)

**Keep existing videos in Supabase, new videos go to Bunny**

```typescript
// In workers.ts, handle both storage providers
async function processMeetingVideoJob(data: ScrapingJobData, job: Job) {
  const { storageProvider, storageUrl, storagePath } = data;

  let buffer: Buffer;

  if (storageProvider === 'supabase') {
    // OLD: Download from Supabase
    const { data: videoBlob } = await supabaseAdmin.storage
      .from('meeting-videos')
      .download(storagePath);
    buffer = Buffer.from(await videoBlob.arrayBuffer());

  } else if (storageProvider === 'bunny') {
    // NEW: Download from Bunny
    const response = await fetch(storageUrl);
    buffer = Buffer.from(await response.arrayBuffer());

  } else {
    throw new Error(`Unknown storage provider: ${storageProvider}`);
  }

  // Continue with transcription...
}
```

### Option 2: Bulk Migration Script

**Migrate all existing videos to Bunny**

```typescript
// scripts/migrate-to-bunny.ts
import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { bunnyStorage } from '../src/lib/bunnyStorage';

async function migrateVideos() {
  console.log('🚀 Starting migration to Bunny.net...');

  // Get all videos from Supabase Storage
  const { data: videos } = await supabaseAdmin
    .from('meeting_videos')
    .select('*')
    .eq('storage_provider', 'supabase')
    .limit(1000);

  console.log(`Found ${videos?.length || 0} videos to migrate`);

  for (const video of videos || []) {
    try {
      console.log(`Migrating video: ${video.id}`);

      // Download from Supabase
      const { data: videoBlob } = await supabaseAdmin.storage
        .from('meeting-videos')
        .download(video.storage_path);

      if (!videoBlob) {
        console.error(`Failed to download video: ${video.id}`);
        continue;
      }

      const buffer = Buffer.from(await videoBlob.arrayBuffer());

      // Upload to Bunny
      const bunnyPath = bunnyStorage.generateMeetingPath(
        video.organization_id,
        video.id,
        video.original_filename
      );

      const uploadResult = await bunnyStorage.uploadVideo(buffer, bunnyPath);

      if (!uploadResult.success) {
        console.error(`Failed to upload to Bunny: ${video.id}`, uploadResult.error);
        continue;
      }

      // Update database
      await supabaseAdmin
        .from('meeting_videos')
        .update({
          storage_provider: 'bunny',
          storage_path: bunnyPath,
          storage_url: uploadResult.storageUrl,
          public_url: uploadResult.cdnUrl,
        })
        .eq('id', video.id);

      // Optional: Delete from Supabase to save space
      // await supabaseAdmin.storage
      //   .from('meeting-videos')
      //   .remove([video.storage_path]);

      console.log(`✅ Migrated: ${video.id}`);

      // Rate limit: Wait 1 second between uploads
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error migrating video ${video.id}:`, error);
    }
  }

  console.log('🎉 Migration complete!');
}

migrateVideos().catch(console.error);
```

**Run migration**:
```bash
npx tsx scripts/migrate-to-bunny.ts
```

---

## Cost Optimization: Storage Classes

Bunny.net offers different storage tiers:

### Standard Storage (Default)
- **Cost**: $0.005/GB/month
- **Retrieval**: Instant
- **Use for**: Recent videos (last 6-12 months)

### HDD Storage (Coming Soon)
- **Cost**: ~$0.002/GB/month (60% cheaper)
- **Retrieval**: Slightly slower
- **Use for**: Archive (videos older than 1 year)

### Implementation: Tiered Storage

```typescript
// Automatically move old videos to cheaper storage
async function archiveOldVideos() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data: oldVideos } = await supabaseAdmin
    .from('meeting_videos')
    .select('*')
    .lt('meeting_date', oneYearAgo.toISOString())
    .eq('storage_provider', 'bunny')
    .eq('storage_tier', 'standard');  // Not yet archived

  for (const video of oldVideos || []) {
    // Move to HDD tier (when available) or keep on standard
    // Update database
    await supabaseAdmin
      .from('meeting_videos')
      .update({ storage_tier: 'archive' })
      .eq('id', video.id);
  }
}
```

---

## Monitoring & Analytics

### Bunny.net Dashboard Metrics

Track these metrics in your Bunny dashboard:

1. **Storage Usage**
   - Current: X GB
   - Monthly trend
   - Per-organization breakdown (if using folders)

2. **Bandwidth Usage**
   - Total GB transferred
   - Peak hours
   - Geographic distribution

3. **Request Count**
   - Total video plays
   - Most popular videos
   - Cache hit ratio (should be >90%)

### Cost Alerts

Set up alerts in Bunny dashboard:

- Alert when storage > 15 TB (approaching your budget)
- Alert when bandwidth > 1 TB/month (unusual activity)
- Daily cost email summary

---

## Testing Checklist

Before going live with Bunny.net:

### Upload Flow
- [ ] Upload small video (< 100 MB)
- [ ] Upload large video (> 5 GB)
- [ ] Verify video appears in Bunny dashboard
- [ ] Verify CDN URL is accessible

### Playback
- [ ] Video plays in browser
- [ ] Video plays on mobile
- [ ] Seeking works correctly
- [ ] Subtitles/captions work (if added)

### Transcription Pipeline
- [ ] Worker downloads video from Bunny URL
- [ ] AssemblyAI receives video correctly
- [ ] Transcription completes successfully
- [ ] Chunks are created with correct timestamps

### Multi-Device Testing
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] Desktop Firefox
- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] iPad

---

## Troubleshooting

### Issue: Video won't play

**Cause**: CORS not configured

**Solution**: Configure CORS in Bunny Pull Zone settings:
1. Go to **Pull Zone** → **Settings**
2. Add to **Allowed Origins**: `https://ackindex.com, https://*.ackindex.com`
3. Enable **Access-Control-Allow-Origin: ***

### Issue: Upload fails with 401

**Cause**: Invalid Access Key

**Solution**: Verify `BUNNY_ACCESS_KEY` in .env.local matches the key in Bunny dashboard (Storage Zone → Settings → Access Key)

### Issue: Slow video loading

**Cause**: CDN not fully propagated

**Solution**:
1. Wait 5-10 minutes for CDN propagation
2. Check Pull Zone status in dashboard
3. Clear cache: Pull Zone → Purge Cache

### Issue: Video download fails in worker

**Cause**: Firewall or network issue

**Solution**:
1. Check server can reach Bunny CDN: `curl https://your-pull-zone.b-cdn.net/test.mp4`
2. Verify no firewall blocking outbound HTTPS
3. Use storage URL instead of CDN URL for worker downloads

---

## Performance Optimization

### 1. Enable Video Optimization

In Bunny Pull Zone settings:

- **Enable Video Optimizer**: Automatically transcode to optimal formats
- **Enable Thumbnail Generation**: Generate preview thumbnails
- **Enable Token Authentication** (optional): For private videos

### 2. Set Cache Rules

Optimize caching for better performance:

```
Cache-Control: public, max-age=31536000, immutable
```

Videos never change after upload, so aggressive caching is safe.

### 3. Use Bunny Stream (Optional)

For even better video delivery:

- **Bunny Stream**: $0.005/min viewed (~$0.30/hour)
- Adaptive bitrate streaming (HLS/DASH)
- Automatic quality adjustment
- Better mobile experience

**When to use**:
- High traffic (>10K views/month per video)
- Need adaptive bitrate
- Want DRM protection

**When to stick with storage + CDN**:
- Low to medium traffic
- Simpler architecture
- Lower costs

---

## Next Steps

1. **Setup Bunny.net account** (15 minutes)
2. **Add environment variables** (2 minutes)
3. **Test upload with 1 video** (10 minutes)
4. **Verify playback works** (5 minutes)
5. **Update all upload routes** (30 minutes)
6. **Update worker download logic** (15 minutes)
7. **Deploy to production** (10 minutes)
8. **Monitor first 24 hours** (ongoing)
9. **Migrate existing videos** (optional, can do over time)

**Total implementation time: ~2 hours**

**Cost savings: $4,775/month** 🎉

---

## Support

**Bunny.net Support**:
- Dashboard: https://panel.bunny.net
- Docs: https://docs.bunny.net
- Support: support@bunny.net

**Your Implementation**:
- Check `/src/lib/bunnyStorage.ts` for API wrapper
- Check logs for upload/download errors
- Monitor Supabase `meeting_videos` table for `storage_provider` column
