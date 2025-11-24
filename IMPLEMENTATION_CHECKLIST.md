# Bunny.net Implementation Checklist

## ✅ **Quick Start (2-3 Hours Total)**

### Step 1: Bunny.net Account Setup (15 min)

- [ ] Sign up at https://bunny.net
- [ ] Create Storage Zone named `ackindex-videos`
- [ ] Select region: `ny` (US East) or `la` (US West)
- [ ] Copy **Access Key** (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- [ ] Create Pull Zone named `ackindex-cdn`
- [ ] Link Pull Zone to Storage Zone
- [ ] Copy **Pull Zone URL** (looks like: `ackindex-cdn.b-cdn.net`)
- [ ] Enable CORS in Pull Zone settings (allow `*.ackindex.com`)

---

### Step 2: Environment Variables (2 min)

Add to `.env.local`:

```bash
# Bunny.net Configuration
BUNNY_STORAGE_ZONE=ackindex-videos
BUNNY_ACCESS_KEY=your-access-key-from-step1
BUNNY_PULL_ZONE_URL=https://ackindex-cdn.b-cdn.net
BUNNY_STORAGE_REGION=ny
```

**Verify**:
```bash
# Check all variables are set
grep BUNNY .env.local
```

---

### Step 3: Code Integration (1 hour)

#### A. Bunny Storage Library (Already Done! ✅)

- [x] `/src/lib/bunnyStorage.ts` - Created and ready to use

**Test it**:
```typescript
import { bunnyStorage } from '@/lib/bunnyStorage';

// Test upload
const result = await bunnyStorage.uploadVideo(
  Buffer.from('test'),
  'test/video.mp4'
);

console.log(result.cdnUrl);
```

---

#### B. Update Upload Route (15 min)

**File**: `/src/app/api/staff/upload/complete/route.ts`

Find this section:
```typescript
// OLD: Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('meeting-videos')
  .upload(storagePath, file);
```

Replace with:
```typescript
// NEW: Upload to Bunny.net
import { bunnyStorage } from '@/lib/bunnyStorage';

const bunnyPath = bunnyStorage.generateMeetingPath(
  organizationId,
  videoId,
  originalFilename
);

const uploadResult = await bunnyStorage.uploadVideo(
  fileBuffer,
  bunnyPath,
  {
    contentType: 'video/mp4'
  }
);

if (!uploadResult.success) {
  return NextResponse.json({
    error: 'Failed to upload video',
    details: uploadResult.error
  }, { status: 500 });
}

// Update database with Bunny URLs
await supabase
  .from('meeting_videos')
  .update({
    storage_provider: 'bunny',
    storage_path: bunnyPath,
    storage_url: uploadResult.cdnUrl,  // Use CDN URL
    public_url: uploadResult.cdnUrl,
    file_size_bytes: uploadResult.fileSize,
  })
  .eq('id', videoId);
```

**Checklist**:
- [ ] Import `bunnyStorage` at top of file
- [ ] Replace Supabase upload with Bunny upload
- [ ] Update database with Bunny URLs
- [ ] Set `storage_provider` to `'bunny'`

---

#### C. Update Worker (15 min)

**File**: `/src/lib/workers.ts`

Find the `processMeetingVideoJob` function around line 777:

```typescript
// OLD: Download from Supabase Storage
const { data: videoBlob } = await supabaseAdmin.storage
  .from('meeting-videos')
  .download(storagePath);

const buffer = Buffer.from(await videoBlob.arrayBuffer());
```

Replace with:
```typescript
// NEW: Download from Bunny.net (or any URL)
log.info('Downloading video from storage URL');

const videoResponse = await fetch(storageUrl);

if (!videoResponse.ok) {
  throw new Error(`Failed to download video: ${videoResponse.status}`);
}

const buffer = Buffer.from(await videoResponse.arrayBuffer());
```

**Checklist**:
- [ ] Replace Supabase download with `fetch(storageUrl)`
- [ ] Keep rest of function unchanged (AssemblyAI, embedding, etc.)

---

#### D. Update Database Schema (5 min)

**File**: Create `/supabase/migrations/20251124_bunny_storage.sql`

```sql
-- Add storage provider tracking
ALTER TABLE meeting_videos
  ALTER COLUMN storage_provider SET DEFAULT 'bunny';

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_meeting_videos_storage_provider
  ON meeting_videos(storage_provider);
```

**Apply migration**:
```bash
# Via Supabase dashboard
# Copy SQL above, paste into SQL Editor, run

# Or via CLI (if installed)
supabase db push
```

**Checklist**:
- [ ] Create migration file
- [ ] Apply to database
- [ ] Verify column exists: `SELECT storage_provider FROM meeting_videos LIMIT 1;`

---

### Step 4: Testing (30 min)

#### A. Test Upload

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Upload a small test video**:
   - Go to `/staff/upload` (or your upload page)
   - Upload a small video file (< 100 MB)
   - Watch console for logs

3. **Verify in Bunny dashboard**:
   - Go to https://panel.bunny.net
   - Navigate to Storage → Your Zone
   - Confirm video file appears in `organizations/...` folder

4. **Verify CDN URL works**:
   - Copy the `public_url` from database
   - Paste into browser
   - Video should play

**Checklist**:
- [ ] Video uploads successfully
- [ ] No errors in console
- [ ] File appears in Bunny dashboard
- [ ] CDN URL plays video in browser

---

#### B. Test Worker Processing

1. **Start worker**:
   ```bash
   npm run worker
   ```

2. **Trigger processing**:
   - Upload should auto-trigger processing
   - Or manually trigger via API: `/api/staff/video/process`

3. **Monitor progress**:
   ```bash
   # Watch worker logs
   tail -f logs/worker.log

   # Check database
   SELECT processing_status, transcription_status
   FROM meeting_videos
   WHERE id = 'your-video-id';
   ```

4. **Verify completion**:
   - Video status = `'completed'`
   - Transcript exists in database
   - Chunks created with embeddings

**Checklist**:
- [ ] Worker downloads video from Bunny CDN
- [ ] AssemblyAI transcription starts
- [ ] Transcription completes
- [ ] Chunks created with timestamps
- [ ] Embeddings generated

---

#### C. Test Playback

1. **Open meeting page**:
   - Navigate to meeting detail page
   - Video player should load

2. **Verify playback**:
   - Video plays without errors
   - Seeking works (jump to any timestamp)
   - Quality is good

3. **Test transcript sync** (if implemented):
   - Click transcript line → video jumps
   - Video plays → transcript highlights current position

**Checklist**:
- [ ] Video loads in player
- [ ] Playback works smoothly
- [ ] Seeking works
- [ ] No CORS errors in console
- [ ] Mobile playback works (test on phone)

---

### Step 5: Deploy to Production (15 min)

1. **Add env variables to Vercel**:
   ```bash
   # Via Vercel dashboard
   Settings → Environment Variables → Add:

   BUNNY_STORAGE_ZONE=ackindex-videos
   BUNNY_ACCESS_KEY=your-access-key
   BUNNY_PULL_ZONE_URL=https://ackindex-cdn.b-cdn.net
   BUNNY_STORAGE_REGION=ny
   ```

2. **Deploy**:
   ```bash
   git add .
   git commit -m "feat: integrate Bunny.net for video storage"
   git push origin main

   # Auto-deploys via Vercel GitHub integration
   ```

3. **Verify deployment**:
   - Check Vercel deployment logs
   - Verify no build errors
   - Test upload on production

4. **Monitor first uploads**:
   - Watch Bunny dashboard for uploads
   - Check application logs for errors
   - Verify bandwidth usage is as expected

**Checklist**:
- [ ] Env variables added to Vercel
- [ ] Code deployed successfully
- [ ] Production upload works
- [ ] Production playback works
- [ ] Worker processes videos correctly

---

## 🎉 **You're Done!**

### **What You've Achieved**:

✅ **87% cheaper storage** ($92.50/month vs $262.50 for R2)
✅ **Better performance** (Bunny CDN is fast globally)
✅ **Simpler architecture** (one provider vs multiple)
✅ **Future-proof** (scales to 100+ TB easily)

---

## 📊 **Post-Implementation Monitoring**

### Week 1: Watch These Metrics

**Bunny Dashboard** (https://panel.bunny.net):
- [ ] Storage usage growing as expected
- [ ] Bandwidth usage reasonable (should be low initially)
- [ ] No errors in request logs
- [ ] Cache hit ratio >80%

**Your Application**:
- [ ] Upload success rate >99%
- [ ] Worker processing all videos
- [ ] No CORS errors
- [ ] Video playback smooth

**Costs**:
- [ ] Storage: ~$0.005/GB as expected
- [ ] Bandwidth: ~$0.01/GB as expected
- [ ] Total: Much cheaper than before! 🎉

---

### Month 1: Optimize

**Review and adjust**:

1. **Cache Settings**:
   - Bunny Pull Zone → Cache → Set `max-age=31536000` (videos never change)
   - This maximizes cache hits, minimizes bandwidth costs

2. **Compression**:
   - Bunny Pull Zone → Optimization → Enable "Optimize Images" (for thumbnails)
   - Keep video compression off (already compressed)

3. **Security** (if needed):
   - Enable token authentication for private videos
   - Set up URL signing for time-limited access

4. **Analytics**:
   - Check which videos get most views
   - Consider moving popular videos to Bunny Stream (for adaptive bitrate)

---

## 🚨 **Troubleshooting Common Issues**

### Issue: Video won't upload

**Check**:
1. Access key is correct in `.env.local`
2. Storage zone name matches
3. File size < 50 GB (Bunny limit for single upload)

**Fix**:
```bash
# Test Bunny credentials
curl -X PUT https://storage.bunnycdn.com/YOUR-ZONE/test.txt \
  -H "AccessKey: YOUR-KEY" \
  -d "test"

# Should return 201 Created
```

---

### Issue: Video won't play

**Check**:
1. CORS enabled in Pull Zone settings
2. CDN URL is correct format: `https://your-zone.b-cdn.net/path/to/video.mp4`
3. Video file actually uploaded (check Bunny dashboard)

**Fix**:
- Pull Zone → Settings → CORS → Allow `*` or your domain
- Wait 5 minutes for CDN propagation

---

### Issue: Worker can't download video

**Check**:
1. `storageUrl` in database is correct
2. Video is public (or worker has auth token)
3. Network allows outbound HTTPS

**Fix**:
```bash
# Test download from worker environment
curl -I https://your-cdn.b-cdn.net/path/to/video.mp4

# Should return 200 OK
```

---

## 📚 **Additional Resources**

**Created Files**:
- `/src/lib/bunnyStorage.ts` - API wrapper
- `BUNNY_MIGRATION.md` - Detailed migration guide
- `FINAL_COSTS_WITH_BUNNY.md` - Complete cost analysis

**Bunny.net Docs**:
- Storage API: https://docs.bunny.net/docs/storage-api
- Pull Zones: https://docs.bunny.net/docs/cdn-storage
- Video Optimization: https://docs.bunny.net/docs/video-optimization

**Support**:
- Bunny Support: support@bunny.net
- Dashboard: https://panel.bunny.net

---

## ✅ **Final Checklist**

Before considering implementation complete:

### Code
- [ ] `bunnyStorage.ts` imported and working
- [ ] Upload route uses Bunny
- [ ] Worker downloads from Bunny
- [ ] Database updated with Bunny URLs
- [ ] All tests passing

### Infrastructure
- [ ] Bunny account created
- [ ] Storage zone active
- [ ] Pull zone configured
- [ ] CORS enabled
- [ ] Environment variables set

### Testing
- [ ] Test upload works
- [ ] Test download works
- [ ] Test playback works
- [ ] Test on mobile
- [ ] Test worker processing

### Production
- [ ] Deployed to production
- [ ] Env variables in Vercel
- [ ] First production upload successful
- [ ] Monitoring in place
- [ ] Documentation updated

---

## 🎯 **Success Criteria**

You've successfully implemented Bunny.net when:

✅ Videos upload to Bunny Storage
✅ CDN URLs play in browser
✅ Worker downloads and processes videos
✅ Costs are **$92.50/month** for 17.5 TB
✅ Playback is smooth globally
✅ No errors for 7 days straight

**Congrats! You just saved $4,775/month compared to Supabase Storage!** 🎉

---

**Next**: Start processing your 7,000 hour backlog! See `PROCESS_BACKLOG_NOW.md`
