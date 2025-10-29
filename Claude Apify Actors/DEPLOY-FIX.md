# Apify Actor Deployment Fix

## Problem Identified

Your Apify actor has been **failing with this error**:
```
python: can't open file '/usr/src/app/apify_actor_main.py': [Errno 2] No such file or directory
```

**Root Cause:** The actor was missing the `.actor/actor.json` configuration file, causing Apify to look for the default filename `apify_actor_main.py` instead of using your Dockerfile's `main.py`.

## Solution

I've created the `.actor/actor.json` configuration file that tells Apify to use your Dockerfile properly.

## How to Deploy the Fix

### Option 1: Deploy via Apify CLI (Recommended)

1. **Install Apify CLI** (if not already installed):
   ```bash
   npm install -g apify-cli
   ```

2. **Login to Apify**:
   ```bash
   apify login
   ```

3. **Navigate to your actor directory**:
   ```bash
   cd "/Users/owenhudson/ackindex/Claude Apify Actors"
   ```

4. **Deploy the actor**:
   ```bash
   apify push
   ```

### Option 2: Deploy via Apify Console (Manual)

1. **Go to Apify Console**: https://console.apify.com/actors

2. **Find your actor**: `legible_radish/ackindex-pdf-actor`

3. **Click "Source" tab**

4. **Create `.actor` directory** (if not exists)

5. **Upload `.actor/actor.json`** with this content:
   ```json
   {
     "actorSpecification": 1,
     "name": "ackindex-pdf-actor",
     "title": "Nantucket PDF Scraper",
     "description": "Crawls Nantucket government websites, extracts PDFs, and parses content with table support",
     "version": "1.0",
     "dockerfile": "./Dockerfile",
     "readme": "./README.md",
     "input": "./input_schema.json"
   }
   ```

6. **Click "Build"** to rebuild the actor

### Option 3: Quick Fix - Rename main.py

If you can't deploy right now, you can quickly fix it by:

1. Go to Apify Console → Your Actor → Source
2. Rename `main.py` to `apify_actor_main.py`
3. Click "Build"

This is a temporary workaround. The proper fix is Option 1 or 2.

## Verify the Fix

After deploying, test the actor:

1. **Go to your actor page**: https://console.apify.com/actors/legible_radish~ackindex-pdf-actor

2. **Click "Try it"**

3. **Enter test input**:
   ```json
   {
     "startUrls": [
       { "url": "https://mailchi.mp/nantucket-ma.gov/2025atm" }
     ],
     "maxRequests": 5,
     "downloadPdfs": true
   }
   ```

4. **Click "Start"**

5. **Check the logs** - you should see:
   ```
   Nantucket PDF Crawler starting...
   Processing (1/5): https://mailchi.mp/nantucket-ma.gov/2025atm
   Found X PDF(s) on ...
   ```

## Expected Results After Fix

Once deployed correctly, your actor will:
- ✅ Start successfully (no more "file not found" errors)
- ✅ Crawl the Nantucket website
- ✅ Extract PDF links
- ✅ Download and parse PDFs
- ✅ Extract text and tables
- ✅ Return structured data

## Files Changed

- **Created**: `.actor/actor.json` - Apify actor configuration
- **No changes needed**: `main.py`, `Dockerfile`, or any other files

## Next Steps After Deployment

1. **Test the actor** with a simple URL
2. **Re-scrape** the Nantucket Town Meeting page from your admin panel
3. **Verify** that content is properly extracted and stored
4. **Check** that the chatbot can now answer questions with detailed information

## Troubleshooting

If the actor still fails after deployment:

1. **Check build logs** in Apify Console
2. **Verify** all files are uploaded correctly
3. **Ensure** `requirements.txt` includes all dependencies:
   - apify
   - playwright
   - beautifulsoup4
   - PyPDF2
   - pdfplumber
   - aiohttp

4. **Check** that Playwright browsers are installed in the Dockerfile

## Support

If you encounter issues:
- Check actor logs in Apify Console
- Review the build output
- Test with a simple URL first (like example.com)
- Gradually increase complexity

The actor code is solid - it just needs the proper configuration file to work!

