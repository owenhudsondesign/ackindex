# Bunny.net Implementation - Complete! ✅

## What We've Implemented

### 1. **Bunny Storage Library** ✅
- **File**: `/src/lib/bunnyStorage.ts`
- **Features**:
  - Upload videos to Bunny Storage
  - Delete files
  - List files
  - Generate CDN URLs
  - Automatic path generation

### 2. **Updated Upload Route** ✅
- **File**: `/src/app/api/staff/upload/complete/route.ts`
- **Changes**:
  - Downloads chunks from Supabase (temporary)
  - Assembles into final video
  - **Uploads to Bunny.net** instead of Supabase
  - Stores Bunny CDN URL in database
  - Sets `storage_provider: 'bunny'`

### 3. **Updated Worker** ✅
- **File**: `/src/lib/workers.ts`
- **Changes**:
  - Downloads video from Bunny CDN (via HTTP)
  - Supports both Bunny and Supabase (legacy)
  - Uploads to AssemblyAI for transcription
  - Rest of pipeline unchanged

---

## 🧪 Testing Steps

### **Step 1: Test Bunny Credentials** (2 min)

```bash
# Run test script
npx tsx scripts/test-bunny-upload.ts

# Expected output:
# ✅ Upload successful!
# ✅ Download successful!
# ✅ Test file deleted
# 🎉 All tests passed!
```

**If it fails**:
- Check `.env.local` has all 4 Bunny variables
- Verify BUNNY_ACCESS_KEY is the **read-write password** (not read-only)
- Verify BUNNY_STORAGE_ZONE name matches exactly

---

### **Step 2: Test Full Upload Flow** (5 min)

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Start worker** (in separate terminal):
   ```bash
   npm run worker
   ```

3. **Upload a small test video**:
   - Go to `/staff/upload` (your upload page)
   - Upload a small video (< 100 MB recommended)
   - Fill in meeting details
   - Click upload

4. **Monitor logs**:
   ```bash
   # In server terminal, watch for:
   Uploading to Bunny.net: organizations/default/meetings/.../original.mp4
   Bunny upload successful. CDN URL: https://...

   # In worker terminal, watch for:
   Downloading from Bunny.net
   Video downloaded to temp file
   Starting AssemblyAI transcription
   ```

5. **Verify in Bunny Dashboard**:
   - Go to https://panel.bunny.net
   - Storage → Your Zone
   - Should see file in `organizations/default/meetings/...` folder

6. **Verify playback**:
   - Copy the `public_url` from database
   - Paste into browser
   - Video should play! ✅

---

### **Step 3: Verify Database** (1 min)

```sql
-- Check latest video
SELECT
  original_filename,
  storage_provider,
  storage_url,
  processing_status
FROM meeting_videos
ORDER BY created_at DESC
LIMIT 1;

-- Should show:
-- storage_provider: 'bunny'
-- storage_url: https://your-cdn.b-cdn.net/...
```

---

## 📋 Pre-Production Checklist

Before deploying to production:

### **Environment Variables**

- [ ] `.env.local` has all Bunny variables (local dev)
- [ ] Vercel has all Bunny variables (production)
  - BUNNY_STORAGE_ZONE
  - BUNNY_ACCESS_KEY
  - BUNNY_PULL_ZONE_URL
  - BUNNY_STORAGE_REGION

### **Testing**

- [ ] Test upload script passes
- [ ] Test video upload via UI works
- [ ] Video appears in Bunny dashboard
- [ ] CDN URL plays in browser
- [ ] Worker downloads and processes video
- [ ] Transcription completes successfully
- [ ] Chunks created with embeddings

### **CORS Configuration**

- [ ] Bunny Pull Zone has CORS enabled:
  - Go to Pull Zone → Settings
  - Enable CORS
  - Add allowed origins: `https://ackindex.com, https://*.ackindex.com`
  - Or allow all: `*`

---

## 💰 Cost Impact

### **Before (Supabase Storage)**
- 17.5 TB = **$367.50/month** storage
- 500 GB bandwidth = **$45/month**
- **Total**: **$412.50/month**

### **After (Bunny.net)**
- 17.5 TB = **$87.50/month** storage
- 500 GB bandwidth = **$5/month**
- **Total**: **$92.50/month**

**Savings**: **$320/month** = **$3,840/year** 🎉

---

## 🔧 Troubleshooting

### **Issue: Upload fails with 401**

**Cause**: Wrong access key or using read-only key

**Fix**:
```bash
# In Bunny dashboard, get the READ-WRITE password
# Update .env.local:
BUNNY_ACCESS_KEY=your-read-write-password-here
```

---

### **Issue: Video won't play (CORS error)**

**Cause**: CORS not enabled in Pull Zone

**Fix**:
1. Go to Bunny Dashboard → Pull Zone → Settings
2. Find "CORS" or "Access-Control-Allow-Origin"
3. Enable and set to `*` or your domain
4. Wait 5 minutes for propagation

---

### **Issue: Worker can't download video**

**Cause**: Using wrong URL or network issue

**Fix**:
```bash
# Test CDN URL directly
curl -I https://your-cdn.b-cdn.net/path/to/video.mp4

# Should return: 200 OK
# If 404: Video didn't upload correctly
# If timeout: Network/firewall issue
```

---

### **Issue: Chunks still in Supabase Storage**

**This is OK!** The chunks are cleaned up after assembly.

If you want to migrate existing fully-uploaded videos from Supabase to Bunny, see `/BUNNY_MIGRATION.md` for migration script.

---

## 🚀 Deployment

### **Deploy to Production**

1. **Add env vars to Vercel**:
   ```bash
   vercel env add BUNNY_STORAGE_ZONE production
   vercel env add BUNNY_ACCESS_KEY production
   vercel env add BUNNY_PULL_ZONE_URL production
   vercel env add BUNNY_STORAGE_REGION production
   ```

2. **Deploy**:
   ```bash
   git add .
   git commit -m "feat: migrate video storage to Bunny.net"
   git push origin main
   ```

3. **Verify deployment**:
   - Check Vercel deployment logs
   - Test upload on production
   - Monitor Bunny dashboard for uploads

---

## 📊 Monitoring

### **What to Watch**

**Bunny Dashboard** (https://panel.bunny.net):
- Storage usage (should grow ~2.5 GB per 2-hour video)
- Bandwidth usage (should be low - mostly uploads)
- Request count
- Any errors in logs

**Your Application**:
- Upload success rate
- Worker processing rate
- Video playback errors (check browser console)

**Costs**:
- Storage: $0.005/GB/month
- Bandwidth: $0.01/GB
- Should see ~$92/month for 17.5 TB

---

## ✅ Success Criteria

You've successfully migrated to Bunny when:

- ✅ Test script passes
- ✅ Videos upload to Bunny (visible in dashboard)
- ✅ CDN URLs work in browser
- ✅ Worker downloads and processes videos
- ✅ Costs drop by ~$320/month
- ✅ No errors for 7 days straight

---

## 📚 Next Steps

### **Immediate (This Week)**
1. Run test script: `npx tsx scripts/test-bunny-upload.ts`
2. Test with 1 real video upload
3. Verify playback works
4. Deploy to production

### **Short Term (This Month)**
1. Monitor costs in Bunny dashboard
2. Verify transcription pipeline works end-to-end
3. Test on mobile devices
4. Start processing your 7,000 hour backlog

### **Optional: Migrate Existing Videos**
If you have videos already in Supabase Storage, see `/BUNNY_MIGRATION.md` for migration script.

---

## 🎉 Congratulations!

You've successfully implemented Bunny.net video hosting!

**Benefits**:
- ✅ **78% cheaper** than Supabase Storage
- ✅ **Global CDN** for fast playback
- ✅ **Scalable** to 100+ TB easily
- ✅ **Simple** - works with HTML5 video out of the box

**Your platform is now optimized for cost-effective video hosting at scale!** 🚀

---

## 📞 Support

**If you get stuck**:
1. Check troubleshooting section above
2. Review `/BUNNY_MIGRATION.md` for detailed steps
3. Test with: `npx tsx scripts/test-bunny-upload.ts`
4. Check Bunny logs in dashboard

**Bunny Support**:
- Dashboard: https://panel.bunny.net
- Support: Click "Support" in dashboard (fast response)
- Docs: https://docs.bunny.net
