# Setup Guide for New Analytics & Transcript Features

## Quick Start

Follow these steps to enable the new analytics dashboard and transcript features.

---

## Step 1: Apply Database Migrations

You need to run two SQL migrations in your Supabase database.

### **Option A: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of each migration file:

   **Migration 1: Enhanced Analytics**
   ```bash
   File: supabase/migrations/20251112_enhanced_analytics.sql
   ```
   - Run this migration first
   - Creates functions for peak usage times, most viewed documents, etc.

   **Migration 2: Blog Transcripts**
   ```bash
   File: supabase/migrations/20251112_blog_transcripts.sql
   ```
   - Run this migration second
   - Creates functions for transcript display and search

5. Click **RUN** for each migration
6. Verify no errors in the output

### **Option B: Supabase CLI (If you're using local development)**

```bash
# Make sure you're in the project directory
cd /Users/owenhudson/ackindex

# Apply migrations
supabase db push

# Or if using migration-specific commands:
supabase migration up
```

---

## Step 2: Verify Migrations Applied

Run this query in Supabase SQL Editor to confirm:

```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_peak_usage_times',
  'get_most_viewed_documents',
  'get_usage_by_day_of_week',
  'get_full_transcript',
  'get_transcript_chunks',
  'search_document_transcript'
);
```

You should see all 6 functions listed.

---

## Step 3: Test the Analytics Dashboard

1. **Access the admin panel:**
   - Navigate to: `https://yourapp.com/admin/login`
   - Log in with admin credentials

2. **Open Analytics Dashboard:**
   - Click the purple "Analytics Dashboard" card
   - Or navigate directly to: `https://yourapp.com/admin/analytics`

3. **Verify data loads:**
   - You should see overview stats (Total Queries, Users, etc.)
   - Check Peak Usage Times chart
   - View Most Viewed Meetings table
   - Ensure no error messages appear

4. **Test PDF Export:**
   - Click "Export Report (PDF)" button
   - Browser print dialog should open
   - Save as PDF to test

---

## Step 4: Test Transcript Features

1. **Find a blog post:**
   - Navigate to: `https://yourapp.com/blog`
   - Open any published blog post

2. **View transcript section:**
   - Scroll to "Full Meeting Transcript" section
   - Should appear below the blog content

3. **Test transcript display:**
   - Click "View Transcript" button
   - Wait for transcript to load
   - Verify text displays correctly

4. **Test search:**
   - Type a search query (e.g., "zoning")
   - Press Enter or click "Search"
   - Verify results highlight correctly

5. **Test downloads:**
   - Click "Download TXT"
   - Verify file downloads
   - Test SRT and VTT formats as well

---

## Step 5: Verify API Endpoints

Test the new API routes:

```bash
# Get full transcript (replace {documentId} with actual ID)
curl https://yourapp.com/api/transcripts/{documentId}

# Get analytics overview
curl https://yourapp.com/api/admin/analytics?type=overview

# Get peak usage times
curl https://yourapp.com/api/admin/analytics?type=peak-times&days=30

# Get most viewed documents
curl https://yourapp.com/api/admin/analytics?type=most-viewed&limit=15
```

---

## Troubleshooting

### **Migration Errors:**

**Error: "function already exists"**
- Solution: Migrations might have been partially applied
- Fix: Add `OR REPLACE` to function definitions (already included in migrations)

**Error: "relation does not exist"**
- Solution: Base tables might be missing
- Fix: Ensure `documents`, `document_chunks`, and `query_logs` tables exist

**Error: "permission denied"**
- Solution: User lacks privileges
- Fix: Run migrations as database owner or use Supabase dashboard

### **No Data Showing:**

**Analytics dashboard shows zeros:**
- This is normal if you have no query logs yet
- Solution: Use the platform to generate some queries
- Queries will be logged in the `query_logs` table

**Transcripts not appearing:**
- Check if documents have chunks: `SELECT COUNT(*) FROM document_chunks WHERE document_id = 'YOUR_ID'`
- Verify chunks have content: `SELECT content FROM document_chunks LIMIT 1`
- Ensure chunks have `chunk_type` metadata set

### **Download Not Working:**

**TXT/SRT/VTT downloads fail:**
- Check browser console for errors
- Verify API route is accessible
- Confirm document has timestamps in metadata

---

## Post-Setup Configuration

### **Optional: Set Up Automated Backups**

For transcript archival, consider setting up automated backups:

```bash
# Example backup script (create as backup-transcripts.sh)
#!/bin/bash

BACKUP_DIR="/path/to/backups/$(date +%Y/%m)"
mkdir -p "$BACKUP_DIR"

# Backup document_chunks table
pg_dump -h your-db-host -U postgres \
  -t document_chunks \
  -F c \
  -f "$BACKUP_DIR/document_chunks_$(date +%Y%m%d).backup" \
  your_database_name
```

Schedule with cron:
```bash
# Run weekly on Sundays at 2 AM
0 2 * * 0 /path/to/backup-transcripts.sh
```

### **Optional: Analytics Report Scheduling**

Set up automated weekly reports:

1. Create a script to fetch analytics via API
2. Format as PDF using headless browser (Puppeteer)
3. Email to stakeholders
4. Store in shared drive

Example with Puppeteer:
```javascript
// generate-report.js
const puppeteer = require('puppeteer');

async function generateReport() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://yourapp.com/admin/analytics', {
    waitUntil: 'networkidle0'
  });

  await page.pdf({
    path: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
    format: 'A4',
    printBackground: true
  });

  await browser.close();
}

generateReport();
```

---

## Verification Checklist

Use this checklist to confirm everything is working:

### **Database:**
- [ ] `get_peak_usage_times()` function exists
- [ ] `get_most_viewed_documents()` function exists
- [ ] `get_usage_by_day_of_week()` function exists
- [ ] `get_full_transcript()` function exists
- [ ] `get_transcript_chunks()` function exists
- [ ] `search_document_transcript()` function exists
- [ ] Indexes created successfully

### **Admin Pages:**
- [ ] `/admin/analytics` page loads
- [ ] Overview stats display correctly
- [ ] Peak usage chart renders
- [ ] Most viewed table populates
- [ ] Popular searches show data
- [ ] Trending topics display
- [ ] "Export PDF" button works
- [ ] Purple analytics card visible on `/admin`

### **Blog Posts:**
- [ ] Transcript section appears on blog posts
- [ ] "View Transcript" button works
- [ ] Full transcript loads and displays
- [ ] Search functionality works
- [ ] "Download TXT" works
- [ ] "Download SRT" works
- [ ] "Download VTT" works
- [ ] "Jump to video" links work (for YouTube)

### **API Endpoints:**
- [ ] `/api/transcripts/[documentId]` returns data
- [ ] `/api/admin/analytics?type=overview` works
- [ ] `/api/admin/analytics?type=peak-times` works
- [ ] `/api/admin/analytics?type=most-viewed` works
- [ ] `/api/admin/analytics?type=trending` works
- [ ] `/api/admin/analytics?type=popular` works

---

## Next Steps

After setup is complete:

1. **Review the full guide:**
   - Read `ANALYTICS_AND_TRANSCRIPTS_GUIDE.md`
   - Understand all available features
   - Learn about data export options

2. **Set up regular exports:**
   - Schedule weekly analytics reports
   - Configure transcript archival
   - Set up database backups

3. **Monitor performance:**
   - Check analytics regularly
   - Track user engagement
   - Identify popular content

4. **Iterate based on data:**
   - Create content for trending topics
   - Optimize search for popular queries
   - Schedule maintenance during low-usage hours

---

## Support Resources

- **Full Documentation:** `ANALYTICS_AND_TRANSCRIPTS_GUIDE.md`
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Functions:** https://www.postgresql.org/docs/current/sql-createfunction.html

---

**Setup Complete!** 🎉

You now have:
- ✅ Comprehensive analytics dashboard
- ✅ Full transcript display on blog posts
- ✅ Search within transcripts
- ✅ Download transcripts (TXT, SRT, VTT)
- ✅ PDF export for analytics
- ✅ Peak usage insights
- ✅ Most viewed meetings tracking
- ✅ Trending topics monitoring

---

**Questions?** Review the troubleshooting section or check the main guide document.
