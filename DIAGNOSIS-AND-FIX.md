# Complete Diagnosis and Fix for Apify Scraping Issue

## 🔴 Problem Statement
The chatbot is not answering questions because no content is being stored in the database. The admin panel shows 0 new chunks after scraping attempts.

## 🔍 Root Cause
After extensive debugging, the root cause is: **The deployed Apify actor does not have the latest code that extracts HTML content and processes PDFs correctly.**

### Evidence:
1. **Apify logs show**: Pages are being crawled but text extraction returns 0 characters
2. **Vercel logs show**: `[Apify] Skipped page with insufficient content (0 chars)`
3. **Dataset items missing fields**: The items in the dataset don't have the `text` field or have empty `text`
4. **PDF processing not happening**: No "Downloading PDF" or "PDF parsed" messages in Apify logs

### Why This Happened:
- Local code has been updated multiple times with HTML extraction logic
- Changes were committed to Git but not deployed to Apify
- Apify actor is running old code from previous builds
- The build ID might be pinned to an old version

## ✅ The Fix (Step-by-Step)

### Step 1: Verify Local Code is Ready
The local file `/Users/owenhudson/ackindex/Claude Apify Actors/main.py` contains:
- ✅ HTML text extraction using BeautifulSoup (lines 317-369)
- ✅ PDF download and parsing (lines 79-110)
- ✅ PDF parsing with pdfplumber and PyPDF2 fallback (lines 112-241)
- ✅ DocumentCenter/View URL detection as PDF links (lines 31-33)
- ✅ Proper error handling and logging

**Status**: Local code is correct and complete.

### Step 2: Deploy to Apify

#### Option A: Web IDE Upload (Recommended - Takes 5 minutes)

1. **Open your Apify actor**:
   - Go to: https://console.apify.com/actors
   - Find: `legible_radish/ackindex-pdf-actor`
   - Click on it to open

2. **Go to Source tab**:
   - Click "Source" in the left sidebar

3. **Copy local code**:
   - Open `/Users/owenhudson/ackindex/Claude Apify Actors/main.py` on your computer
   - Select ALL content (Cmd+A)
   - Copy (Cmd+C)

4. **Paste into Apify**:
   - In the Apify console, select ALL existing code in the editor
   - Paste your copied code, replacing everything
   - Make sure the file is named `main.py` (should be by default)

5. **Verify other files**:
   - Check that `requirements.txt` exists and has:
     ```
     apify ~= 2.0
     beautifulsoup4 ~= 4.12
     aiohttp ~= 3.9
     playwright ~= 1.40
     pdfplumber ~= 0.11
     PyPDF2 ~= 3.0
     ```
   - Check that `.actor/actor.json` exists (if not, create it):
     ```json
     {
       "actorSpecification": 1,
       "name": "ackindex-pdf-actor",
       "title": "Nantucket PDF Scraper",
       "description": "Crawls Nantucket government websites, extracts PDFs, and parses content with table support",
       "version": "1.0",
       "dockerfile": "./Dockerfile"
     }
     ```

6. **Save changes**:
   - Click "Save" button in the top right

7. **Build the actor**:
   - Click "Build" button (should be next to Save)
   - Wait for build to complete (2-3 minutes)
   - Watch the build logs for any errors
   - Should see: "Build finished successfully"

8. **Set as default build**:
   - Click "Builds" tab in the left sidebar
   - Find the build you just created (should be at the top)
   - Click the three dots menu (⋮) on the right
   - Select "Set as default"
   - Confirm

9. **Update your app config**:
   - In your admin panel at www.ackindex.com/admin
   - Find the Apify configuration section
   - Remove any specific build ID or set it to "latest"
   - Save changes

#### Option B: GitHub Integration (More Reliable - Takes 15 minutes)

1. **Push latest code to GitHub**:
   ```bash
   cd /Users/owenhudson/ackindex
   git add "Claude Apify Actors/"
   git commit -m "Latest Apify actor with complete HTML and PDF extraction"
   git push origin main
   ```

2. **Connect Apify to GitHub**:
   - Go to https://console.apify.com/actors
   - Open `legible_radish/ackindex-pdf-actor`
   - Click "Settings" tab
   - Under "Source type", select "Git repository"
   - Click "Connect to GitHub"
   - Select repository: `owenhudsondesign/ackindex`
   - Set branch to `main`
   - Set root directory to `Claude Apify Actors/`
   - Click "Save"

3. **Build from GitHub**:
   - Click "Build" button
   - Wait for build to complete
   - Set as default build (same as above)

### Step 3: Test the Fix

1. **Test with a good URL**:
   Use this URL which has actual PDF content:
   ```
   https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
   ```

2. **Start the scrape**:
   - Go to www.ackindex.com/admin
   - Paste the URL above
   - Make sure "Extract PDFs" is checked
   - Max depth: 1, Max pages: 5
   - Click "Scrape URL"

3. **Monitor Apify logs**:
   - Go to https://console.apify.com/actors/runs
   - Click on the latest run
   - Watch the logs in real-time
   - **Look for these success indicators**:
     ```
     Page loaded: Annual Town Meeting (HTML length: 50000 bytes)
     Raw body text length before cleaning: 25000 characters
     Found main content using selector: main
     Extracted text length after cleaning: 8000 characters
     Found 8 PDF(s) on https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
     Downloading PDF: https://www.nantucket-ma.gov/.../42624.pdf
     ```

4. **Check Vercel logs**:
   - Go to https://vercel.com/dashboard
   - Find your project
   - Click "Logs" tab
   - **Look for**:
     ```
     [Apify] Dataset has X items
     [Apify] Processing item: {"url":"...","type":"page","title":"...","text":"...
     [Apify] Added page with 8000 characters
     [Apify] Added PDF with 3 tables
     [Scrape API] Chunking content: 8000 characters
     [DB] Stored 12 chunks for document XXX
     ```

5. **Verify in admin panel**:
   - Refresh www.ackindex.com/admin
   - Check "Vector Embeddings" card
   - Should show:
     - Total chunks: [increased]
     - Chunks without embeddings: [increased]

6. **Generate embeddings**:
   - Click "Generate Embeddings" button
   - Wait for completion
   - Should show: "Chunks with embeddings: [increased]"

7. **Test chatbot**:
   - Go to www.ackindex.com
   - Ask: "What is the annual town meeting about?"
   - Should get a relevant answer with sources

### Step 4: If Still Not Working

If text extraction is still returning 0 characters after deploying:

1. **Check what content the actor is receiving**:
   - Add this to `main.py` around line 295 (after `html = await page.content()`):
   ```python
   Actor.log.info(f'HTML preview (first 1000 chars): {html[:1000]}')
   ```

2. **Check BeautifulSoup parsing**:
   - Add this around line 320 (before text extraction):
   ```python
   Actor.log.info(f'Body exists: {soup.body is not None}')
   Actor.log.info(f'Number of paragraphs: {len(soup.find_all("p"))}')
   Actor.log.info(f'Number of divs: {len(soup.find_all("div"))}')
   ```

3. **Try a different URL**:
   - Some pages (like MailChimp) are very hard to scrape
   - Try a simpler page:
     ```
     https://www.nantucket-ma.gov/1183/Planning-Board
     ```

## 📊 Expected Results After Fix

### Apify Actor Logs (Success):
```
Nantucket PDF Crawler starting...
Starting crawl with URL: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
Navigating to: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
Page loaded: Annual Town Meeting (HTML length: 45230 bytes)
Raw body text length before cleaning: 18450 characters
Found main content using selector: main
Using content from: main content area
Extracted text length after cleaning: 7820 characters
Text preview: Annual Town Meeting Information for residents of Nantucket...
Found 8 PDF(s) on https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
Downloading PDF: https://www.nantucket-ma.gov/DocumentCenter/View/42624/Planning-Board-Warrant-Article-Summary-2025
Downloading PDF: https://www.nantucket-ma.gov/DocumentCenter/View/42625/Finance-Committee-Report-2025
...
Crawling finished! Processed 6 pages.
```

### Backend Logs (Success):
```
[Scrape API] Starting URL scrape: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
[Apify] Starting scrape job...
[Apify] Job started: czPa8jN3KkXm2nR9Q
[Apify] Job status: RUNNING
[Apify] Fetching results for job: czPa8jN3KkXm2nR9Q
[Apify] Using dataset ID: Xe9kLm4pQwR2nM8bT
[Apify] Dataset has 14 items
[Apify] Processing item: {"url":"https://www.nantucket-ma.gov/2091/Annual-Town-Meeting","type":"page","title":"Annual Town Meeting"...
[Apify] Added page with 7820 characters
[Apify] Processing item: {"url":"https://www.nantucket-ma.gov/DocumentCenter/View/42624/...","status":"success","full_text":"PLANNING BOARD..."...
[Apify] Added PDF with 3 tables
...
[Scrape API] Retrieved 14 pages from scrape
[Scrape API] Processing 14 pages
[Scrape API] Chunking content: 7820 characters
[DB] Stored 11 chunks for document abc123
[Scrape API] Chunking content: 15240 characters (PDF)
[DB] Stored 22 chunks for document def456
...
[Scrape API] Successfully processed document abc123 with 98 chunks total
```

### Admin Panel (Success):
```
Documents:
- Annual Town Meeting (14 chunks, embeddings: ready)

Vector Embeddings:
- Total chunks: 98
- Chunks with embeddings: 98
- Chunks without embeddings: 0
- Embedding percentage: 100%
```

### Chatbot (Success):
```
User: "Tell me about the annual town meeting"

Bot: "The Annual Town Meeting is an important event for Nantucket residents where they vote on various town matters including budget amendments, zoning changes, and other municipal decisions. According to the Planning Board Warrant Article Summary, the meeting will cover topics such as [specific topics from the scraped content]."

Sources:
- Annual Town Meeting (https://www.nantucket-ma.gov/2091/Annual-Town-Meeting)
- Planning Board Warrant Article Summary 2025 (https://www.nantucket-ma.gov/DocumentCenter/View/42624/...)
```

## 🎯 Success Criteria

You'll know the fix worked when:
1. ✅ Apify logs show text extraction with >1000 characters
2. ✅ Apify logs show PDF downloads and parsing
3. ✅ Vercel logs show chunks being stored
4. ✅ Admin panel shows increased chunk count
5. ✅ Embeddings generate successfully
6. ✅ Chatbot answers questions with sources

## 🚨 Common Pitfalls

1. **Forgetting to set the new build as default**: The actor will keep using the old build
2. **Not removing the build ID from app config**: Your app might be pinned to an old build
3. **Testing with bad URLs**: MailChimp pages and some dynamic sites won't work well
4. **Not generating embeddings**: New chunks need embeddings before they work in chat

## 📞 What to Tell Me

After completing Step 2 (deployment) and Step 3 (testing), please share:

1. **Screenshot of Apify build logs** (showing successful build)
2. **Screenshot of Apify run logs** (showing text extraction working)
3. **Screenshot of Vercel logs** (showing chunks being stored)
4. **Screenshot of admin panel** (showing new chunks)

This will help me confirm everything is working or identify any remaining issues.

## 🔄 Next Steps After Fix

Once the scraping is working:

1. **Scrape more pages** with good PDF content
2. **Generate embeddings** for all new chunks
3. **Test various queries** to ensure quality
4. **Fine-tune retrieval** if needed (similarity thresholds, chunk sizes, etc.)
5. **Add more content sources** to build comprehensive knowledge base

## 💡 Pro Tips

- **Start with direct PDF URLs** for fastest results
- **Use pages known to have PDFs** (government document centers)
- **Keep maxPages low** (5-10) to avoid timeouts and high costs
- **Generate embeddings in batches** to stay within rate limits
- **Test chatbot frequently** to catch issues early

