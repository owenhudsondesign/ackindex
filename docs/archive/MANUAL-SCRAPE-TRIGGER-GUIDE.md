# Manual Scrape Trigger Guide

## Overview

The admin panel now includes a **Scheduled Scrapes Manager** that allows you to manually trigger scraping for your batch-uploaded URLs without waiting for the scheduled cron job.

## Features

### 1. **View Scheduled Scrapes**
- See all scheduled URLs in a table view
- View status, priority, frequency, and next scheduled scrape time
- Track which URLs have been scraped and which are pending

### 2. **Manual Trigger Options**

#### Option A: Scrape Selected URLs
1. Navigate to the Admin Panel
2. Check the boxes next to the URLs you want to scrape
3. Click **"Scrape Selected Now"**
4. The system will immediately trigger scraping for those URLs

#### Option B: Scrape All Pending
1. Navigate to the Admin Panel
2. Click **"Scrape All Pending"** in the top-right
3. Confirm the action
4. All URLs that haven't been scraped yet will be processed immediately

### 3. **Real-time Status**
- See which URLs are "Ready now" for scraping
- Monitor error counts for failed scrapes
- Refresh the list to see updated status

## How It Works

When you trigger a manual scrape:

1. The selected URLs' `next_scrape_at` timestamp is updated to NOW
2. The system calls your existing cron endpoint internally
3. The cron job processes up to 5 URLs at a time (as configured)
4. Each URL is:
   - Scraped using Apify
   - Chunked into searchable pieces
   - Embedded for semantic search
   - Stored in your database

## What You'll See

After triggering a scrape:
- Success toast notification
- Table refreshes automatically after 1 second
- URLs will show updated "Last Scraped" date
- Status changes from pending to completed

## Technical Details

### API Endpoints Created

**`GET /api/admin/trigger-scrape`**
- Fetches list of scheduled scrapes
- Query params: `limit` (default 50), `status` (default 'active')

**`POST /api/admin/trigger-scrape`**
- Triggers manual scraping
- Body: `{ scrapeIds: string[] }` or `{ triggerAll: true }`
- Calls the cron endpoint with service role permissions

### Components Added

- **`ScheduledScrapesManager.tsx`** - Main UI component
- Added to Admin Panel between Batch Upload and Upload Forms sections

### Security

- Uses existing admin authentication
- Service role permissions for database access
- Requires CRON_SECRET to trigger cron endpoint

## Environment Variables Required

Make sure these are set in your Vercel/deployment environment:

- `CRON_SECRET` - Secret for authenticating cron requests
- `SUPABASE_SERVICE_ROLE_KEY` - For bypassing RLS
- `NEXT_PUBLIC_SITE_URL` or `VERCEL_URL` - For calling cron endpoint

## Next Steps

1. Upload URLs using the **Batch URL Upload** tool
2. They'll appear in the **Scheduled Scrapes Manager** table
3. Select them and click **"Scrape Selected Now"** to process immediately
4. Or wait for the automatic 2am daily scrape

## Troubleshooting

**"Cron job not properly configured"**
- Check that `CRON_SECRET` is set in environment variables

**"Failed to fetch scrapes"**
- Verify you're logged in as an admin
- Check browser console for detailed errors

**Scraping takes a long time**
- Apify jobs can take 1-5 minutes per URL
- The endpoint has a 5-minute max execution time
- For large batches, it's best to let the automatic cron handle them

**URLs showing "failed" status**
- Check error message in the table
- After 3 consecutive failures, status changes to "failed"
- You can manually trigger again to retry

