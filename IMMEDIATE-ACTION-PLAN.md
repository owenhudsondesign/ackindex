# Immediate Action Plan - Fixing Apify Scraper

## Current Status
The Apify scraper is running but extracting 0 characters of text from pages. Based on the logs, here's what's happening:

### What's Working ✅
- Apify actor is starting and running
- Pages are being crawled (Playwright is working)
- PDF links are being detected (`pdf_count` is being set)
- Data is being pushed to the dataset
- Backend is retrieving the data from Apify

### What's NOT Working ❌
- Text extraction is returning empty strings (0 characters)
- No chunks are being created in the database
- Chatbot can't answer questions because there's no content

## Root Cause Analysis

### Problem 1: Text Extraction Failing
The Apify actor is pushing items with `type: 'page'` but the `text` field is empty. This happens because:
1. The page being scraped is a MailChimp email template (heavy JavaScript)
2. BeautifulSoup can't extract text from dynamically rendered content
3. Playwright loads the page, but the content is in the shadow DOM or iframes

### Problem 2: PDF Processing Not Happening
The logs show pages being found, but no PDF content is being extracted. This could mean:
1. The PDFs aren't being downloaded/parsed
2. The PDF parsing is failing silently
3. The backend isn't matching the PDF data structure correctly

## Immediate Fix Strategy

### Step 1: Deploy Latest Actor Code (CRITICAL)
The most important thing is to ensure the latest Apify actor code is deployed.

**Option A: Via Web IDE (Fastest - 5 minutes)**
1. Go to https://console.apify.com/actors
2. Find your actor: `legible_radish/ackindex-pdf-actor`
3. Click "Source" tab
4. Copy the ENTIRE contents of `/Users/owenhudson/ackindex/Claude Apify Actors/main.py`
5. Paste it, replacing ALL existing code
6. Click "Save"
7. Click "Build"
8. Wait for build to complete
9. Go to "Builds" tab
10. Find the latest build, click "..." menu, select "Set as default"

**Option B: Via GitHub (More reliable - 10 minutes)**
1. Connect the actor to your GitHub repo (see APIFY-DEPLOYMENT-CHECKLIST.md)
2. Set the directory to `Claude Apify Actors/`
3. Build from GitHub
4. Set as default build

### Step 2: Test on a Better URL
The current URL (`https://mailchi.mp/nantucket-ma.gov/2025atm`) is a problematic MailChimp page. Try a better URL first:

**Try this URL instead:**
```
https://www.nantucket-ma.gov/DocumentCenter/View/42624/Planning-Board-Warrant-Article-Summary-2025
```

This is a direct PDF link that should work much better.

### Step 3: Verify PDF Processing
After deploying the latest code and testing with a PDF URL:

1. Check Apify logs for:
```
Downloading PDF: https://...
Page loaded: ... (HTML length: XXX bytes)
Raw body text length before cleaning: XXX characters
```

2. Check Vercel logs for:
```
[Apify] Added PDF with X tables
[Scrape API] Successfully processed document XXX with X chunks
```

3. Check admin panel:
- Vector Embeddings should show new chunks

### Step 4: If Still Not Working - Debug Output

If the text extraction is still returning 0 characters, we need to see what the actor is actually receiving. 

Add more detailed logging to the Apify actor. In `main.py`, around line 320, update the logs to show more:

```python
# Log raw body length before cleaning
raw_body_text = soup.body.get_text() if soup.body else soup.get_text()
Actor.log.info(f'Raw body text length before cleaning: {len(raw_body_text)} characters')
Actor.log.info(f'HTML document has <body>: {soup.body is not None}')
Actor.log.info(f'Number of <p> tags: {len(soup.find_all("p"))}')
Actor.log.info(f'Number of <div> tags: {len(soup.find_all("div"))}')
```

This will help identify if:
- The HTML is loading properly
- The content structure is as expected
- BeautifulSoup is finding elements

## Alternative Approach: Focus on PDFs Only

Since HTML text extraction is proving difficult, you could:

1. **Modify the scraper to prioritize PDFs**
   - Set `download_pdfs: true` in the Apify options
   - Reduce `maxPages` to 5 (already done)
   - Focus on pages that link to PDFs

2. **Use direct PDF URLs**
   - Find pages that have many PDF links
   - Example: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
   - The actor will extract PDF links and download/parse them

3. **Skip HTML page content for now**
   - PDFs have structured content that parses well
   - Government docs are usually in PDF format
   - This gets you a working knowledge base faster

## Expected Behavior After Fix

### Successful Scrape with PDFs:
```
Apify Logs:
  Page loaded: Planning Board Warrant (HTML length: 15000 bytes)
  Found 8 PDF(s) on https://...
  Downloading PDF: https://www.nantucket-ma.gov/.../42624.pdf
  PDF parsed: 12 pages, 3 tables, 5000 characters

Vercel Logs:
  [Apify] Dataset has 9 items
  [Apify] Added PDF with 3 tables
  [Scrape API] Processing 9 pages
  [Scrape API] Chunking content: 5000 characters
  [DB] Stored 8 chunks for document XXX

Admin Panel:
  Total chunks: 45 → 53
  Chunks with embeddings: 45 → 53 (after generation)
```

## Quick Wins

To get something working RIGHT NOW:

1. **Use direct PDF URLs**:
   ```
   https://www.nantucket-ma.gov/DocumentCenter/View/42624/Planning-Board-Warrant-Article-Summary-2025
   ```

2. **Manually upload a PDF** using the PDF upload feature in the admin panel

3. **Generate embeddings** after uploading content

4. **Test the chatbot** with a simple question about the uploaded content

This will verify the entire pipeline (chunking → embedding → retrieval → chat) works, even if the web scraping needs more tuning.

## Priority Order

1. **[HIGH]** Deploy latest Apify actor code
2. **[HIGH]** Test with direct PDF URL
3. **[HIGH]** Verify chunks are created
4. **[MEDIUM]** Generate embeddings for new chunks
5. **[MEDIUM]** Test chatbot queries
6. **[LOW]** Fine-tune HTML text extraction
7. **[LOW]** Handle edge cases (MailChimp pages, etc.)

## What to Tell Me Next

After you complete Step 1 (deploying latest actor code) and Step 2 (testing with a PDF URL), please provide:

1. **Apify Actor URL** of the latest run
2. **Screenshot** of the Apify run logs
3. **Vercel logs** from the scraping attempt
4. **Admin panel screenshot** showing the vector embeddings card

This will help me identify exactly what's working and what needs more attention.

