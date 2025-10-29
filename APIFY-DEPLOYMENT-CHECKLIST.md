# Apify Actor Deployment Checklist

## Problem Identified
The Apify actor is not extracting text content from HTML pages. The backend logs show items with `type: 'page'` but no `text` field, resulting in 0 characters of content.

## Root Cause
The deployed Apify actor is not the latest version with HTML content extraction. The actor needs to be properly synced from the local code to Apify.

## Solution Steps

### Step 1: Verify Local Code is Correct
The local `Claude Apify Actors/main.py` should have HTML text extraction logic around lines 317-369. This extracts text from web pages using BeautifulSoup.

✅ **Status**: Local code is correct and includes text extraction.

### Step 2: Deploy to Apify (Choose One Method)

#### Method A: GitHub Integration (RECOMMENDED)
This is the most reliable way to ensure code stays in sync.

1. **Push latest code to GitHub**:
   ```bash
   cd "/Users/owenhudson/ackindex"
   git add "Claude Apify Actors/"
   git commit -m "Latest Apify actor with HTML text extraction"
   git push origin main
   ```

2. **Connect Apify Actor to GitHub**:
   - Go to Apify Console: https://console.apify.com/actors
   - Find your actor: `legible_radish/ackindex-pdf-actor`
   - Click "Settings" tab
   - Under "Source", select "Git repository"
   - Connect to GitHub repo: `owenhudsondesign/ackindex`
   - Set branch to `main`
   - Set directory path to `Claude Apify Actors/`
   - Click "Save"

3. **Build the actor**:
   - Click "Build" button
   - Wait for build to complete
   - Check build logs for any errors

4. **Set as default build**:
   - Go to "Builds" tab
   - Find the latest successful build
   - Click the three dots (⋮) menu
   - Select "Set as default"

#### Method B: Web IDE Upload
If you can't use GitHub integration:

1. **Copy the main.py content**:
   - Open `/Users/owenhudson/ackindex/Claude Apify Actors/main.py`
   - Copy the entire contents

2. **Update in Apify Console**:
   - Go to https://console.apify.com/actors
   - Find your actor: `legible_radish/ackindex-pdf-actor`
   - Click "Source" tab
   - Paste the entire `main.py` content, replacing everything
   - Click "Save"

3. **Build the actor**:
   - Click "Build" button
   - Wait for build to complete

### Step 3: Update Build Configuration in Your App

**Option 1: Use "latest" build (recommended)**
Edit the Apify Options in your admin panel to use "latest":
- Build: `latest`

**Option 2: Clear the build ID**
Remove any specific build ID from the Apify Options in your admin panel.

### Step 4: Test the Deployment

1. **Run a test scrape**:
   - Go to your admin panel: https://www.ackindex.com/admin
   - Enter URL: `https://www.nantucket-ma.gov/2091/Annual-Town-Meeting`
   - Click "Scrape URL"

2. **Check Apify logs**:
   - Go to Apify Console: https://console.apify.com/actors/runs
   - Find the latest run
   - Check logs for:
     ```
     Raw body text length before cleaning: XXX characters
     Found main content using selector: XXX
     Extracted text length after cleaning: XXX characters
     Text preview: ...
     ```

3. **Check backend logs**:
   - Go to Vercel dashboard: https://vercel.com
   - Check logs for:
     ```
     [Apify] Added page with XXX characters
     ```
   - Should see non-zero character counts

4. **Verify in database**:
   - Check the admin panel
   - Vector embeddings card should show new chunks created
   - Try asking the chatbot a question

### Step 5: Verify Chunking is Working

After a successful scrape with content:
1. Go to admin panel
2. Check "Vector Embeddings" card
3. Should show:
   - Total chunks: increased
   - Chunks with embeddings: increased (after generation)

If chunks are NOT being created despite successful scraping:
- Check Vercel logs for chunking errors
- Verify the `storeChunks` function is being called
- Check Supabase logs

## Common Issues

### Issue 1: "Build not found" error
**Solution**: Remove the build ID from Apify Options or set to "latest"

### Issue 2: Actor still using old code
**Solution**: 
1. Make sure the build completed successfully
2. Set the new build as default
3. Clear the build ID from your app's Apify Options

### Issue 3: Text extraction returns 0 characters
**Possible causes**:
- Page is JavaScript-heavy (MailChimp pages are notorious for this)
- Page uses shadow DOM or other complex rendering
- Playwright timeout too short

**Solution**: The actor now uses:
- `wait_until='domcontentloaded'` (faster, more reliable)
- 30 second timeout
- Additional 2 second wait for dynamic content

### Issue 4: Chunks not being created
**Check**:
- Is the text actually being scraped? (Check Apify logs)
- Is the backend receiving the text? (Check Vercel logs for `[Apify] Added page with XXX characters`)
- Is chunking happening? (Check Vercel logs for chunking messages)
- Are chunks being stored? (Check Supabase `document_chunks` table)

## Expected Behavior

### Successful Apify Actor Run
Apify logs should show:
```
Page loaded: Your complete guide to Town Meeting and Election! (HTML length: 50000 bytes)
Raw body text length before cleaning: 25000 characters
Found main content using selector: main
Extracted text length after cleaning: 8500 characters
Text preview: Welcome to the Annual Town Meeting guide...
Found 5 PDF(s) on https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
```

### Successful Backend Processing
Vercel logs should show:
```
[Apify] Dataset has 6 items
[Apify] Processing item: {"url":"...","type":"page","title":"...","text":"...
[Apify] Added page with 8500 characters
[Scrape API] Processing 1 pages
[Scrape API] Chunking content: 8500 characters
[DB] Stored 12 chunks for document XXX
[Scrape API] Successfully processed document XXX with 12 chunks
```

### Successful Chatbot Query
Chat logs should show:
```
[Retrieval] RPC returned 5 results
[Chat API] Top result similarity: 0.85
[Chat API] Context length: 3500
LLM response length: 250
```

## Next Steps After Deployment

1. ✅ Verify actor is using latest code
2. ✅ Run test scrape
3. ✅ Check logs for text extraction
4. ✅ Verify chunks are created
5. ✅ Generate embeddings
6. ✅ Test chatbot queries

## Support

If issues persist:
1. Check Apify actor logs: https://console.apify.com/actors/runs
2. Check Vercel logs: https://vercel.com/dashboard
3. Check Supabase logs: https://supabase.com/dashboard/project/_/logs
4. Provide the full logs from all three sources for debugging

