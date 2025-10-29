# Stagehand Actor Deployment Guide

## 🚀 Quick Deployment (5 minutes)

### Prerequisites
- Apify account (free tier is fine)
- OpenAI API key with GPT-4 access

### Method 1: Web Console (Easiest)

1. **Create Actor**:
   - Go to https://console.apify.com/actors
   - Click "Create new" → "Empty Actor"
   - Name: `stagehand-nantucket-scraper`

2. **Upload Files**:
   - Click "Source" tab
   - Upload these files:
     - `main.js`
     - `package.json`
     - `Dockerfile`
     - `.actor/actor.json`
     - `.actor/input_schema.json`

3. **Build**:
   - Click "Build" button
   - Wait 2-3 minutes for build to complete
   - Check logs for "Build finished successfully"

4. **Test Run**:
   - Click "Start" or "Run"
   - Fill in input:
     ```json
     {
       "startUrl": "https://www.nantucket-ma.gov/2091/Annual-Town-Meeting",
       "maxPages": 5,
       "maxDepth": 1,
       "extractPDFs": true,
       "openaiApiKey": "sk-your-key-here"
     }
     ```
   - Click "Start"

5. **Check Results**:
   - Monitor logs in real-time
   - Go to "Dataset" tab to see extracted data
   - Should see both `page` and `pdf` items

### Method 2: GitHub Integration (Recommended)

1. **Push Code to GitHub**:
   ```bash
   cd /Users/owenhudson/ackindex
   git add apify-actors/stagehand-nantucket-scraper/
   git commit -m "Add Stagehand Apify actor"
   git push origin main
   ```

2. **Connect Apify to GitHub**:
   - Create new actor in Apify Console
   - Click "Settings" tab
   - Under "Source", select "Git repository"
   - Connect to GitHub: `owenhudsondesign/ackindex`
   - Set branch: `main`
   - Set root directory: `apify-actors/stagehand-nantucket-scraper/`
   - Click "Save"

3. **Build from GitHub**:
   - Click "Build"
   - Actor will automatically pull latest code from GitHub
   - Any future commits to this directory will trigger rebuilds (optional)

### Method 3: Apify CLI (For Developers)

1. **Install Apify CLI**:
   ```bash
   npm install -g apify-cli
   ```

2. **Login**:
   ```bash
   apify login
   ```

3. **Initialize and Push**:
   ```bash
   cd apify-actors/stagehand-nantucket-scraper
   apify push
   ```

## 🔗 Integration with Your Backend

### Step 1: Update Backend to Use New Actor

In your admin panel or environment variables, update:
```
APIFY_ACTOR_ID=your-username/stagehand-nantucket-scraper
```

Or in `src/lib/apifyScraper.ts`, update the actor ID:
```typescript
const actorId = 'your-username/stagehand-nantucket-scraper';
```

### Step 2: Add OpenAI API Key

You'll need to pass the OpenAI API key to the actor. Update `src/lib/apifyScraper.ts`:

```typescript
export async function startScrapeJob(
  url: string,
  options: ScrapeOptions = {}
): Promise<string> {
  const apifyClient = getApifyClient();
  
  const input = {
    startUrl: url,
    maxPages: options.maxPages || 10,
    maxDepth: options.maxDepth || 2,
    extractPDFs: options.extractPDFs !== false,
    openaiApiKey: process.env.OPENAI_API_KEY, // Add this
  };

  const run = await apifyClient.actor('your-username/stagehand-nantucket-scraper').call(input);
  return run.id;
}
```

### Step 3: Add OpenAI Key to Environment

In `.env.local`:
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Step 4: Update Result Handling (Optional)

The output format is already compatible, but you can add explicit handling for `type: 'pdf'`:

```typescript
// In src/lib/apifyScraper.ts, in getJobResults function:
for (const item of items as any[]) {
  if (item.type === 'page') {
    // Existing page handling...
  } else if (item.type === 'pdf' && item.full_text) {
    // New PDF handling
    const content: ScrapedContent = {
      url: item.url || '',
      title: item.title || extractFilenameFromUrl(item.url || ''),
      text: cleanText(item.full_text || ''),
      pdfs: [{
        url: item.url || '',
        filename: extractFilenameFromUrl(item.url || ''),
      }],
      tables: [],
      metadata: {
        crawledAt: item.scraped_at || new Date().toISOString(),
        num_pages: item.num_pages || 0,
        parser: item.parser || 'pdf-parse',
        source_page: item.source_page || '',
      },
    };
    
    if (content.text.length > 100) {
      results.push(content);
    }
  }
}
```

## ✅ Testing the Integration

### 1. Test Actor Directly in Apify

Run the actor manually first to verify it works:
- Input: Start with a simple URL
- Check logs for extraction progress
- Verify dataset has both pages and PDFs

### 2. Test from Your Admin Panel

1. Go to https://www.ackindex.com/admin
2. Enter URL: `https://www.nantucket-ma.gov/2091/Annual-Town-Meeting`
3. Click "Scrape URL"
4. Monitor:
   - Apify logs (in Apify Console)
   - Vercel logs (in Vercel Dashboard)
   - Admin panel (for new chunks)

### 3. Verify End-to-End

1. **Scraping works**: Actor completes successfully
2. **Data retrieved**: Backend gets results from Apify
3. **Chunks created**: Supabase shows new chunks
4. **Embeddings generated**: Embeddings are created
5. **Chatbot works**: Can answer questions about the content

## 💰 Cost Considerations

### OpenAI API Costs
- **GPT-4o**: ~$0.02-0.05 per page extraction
- **For 10 pages**: ~$0.20-0.50
- **For 100 pages**: ~$2-5

### Apify Costs
- Free tier: Includes compute time
- Paid plans: Start at $49/month with more compute

### Total Estimated Costs
- **Testing (5-10 pages)**: ~$0.50
- **Small site (50 pages)**: ~$2-3
- **Medium site (200 pages)**: ~$10-15

**Cost Control Tips**:
1. Set `maxPages` to limit scraping
2. Use `maxDepth: 1` for less crawling
3. Start with small tests before full scrapes
4. Consider Python actor for PDF-heavy sites (no OpenAI costs)

## 🔄 Switching Between Actors

You can use both actors for different purposes:

### Use Stagehand Actor For:
- ✅ Complex, dynamic websites
- ✅ JavaScript-heavy content
- ✅ When you need intelligent extraction
- ✅ Sites that change structure frequently

### Use Python Actor For:
- ✅ PDF-heavy document collections
- ✅ Table extraction from PDFs
- ✅ Cost-sensitive projects
- ✅ Stable website structures

### Configure in Backend:
```typescript
// In src/lib/apifyScraper.ts
const ACTOR_ID = process.env.USE_STAGEHAND_ACTOR 
  ? 'your-username/stagehand-nantucket-scraper'
  : 'your-username/ackindex-pdf-actor';
```

Then toggle in `.env.local`:
```bash
USE_STAGEHAND_ACTOR=true  # or false for Python actor
```

## 🐛 Troubleshooting

### Build Fails
- Check `package.json` for correct dependencies
- Verify `Dockerfile` uses correct base image
- Review build logs in Apify Console

### Actor Crashes
- Check if OpenAI API key is valid
- Verify the start URL is accessible
- Review actor logs for specific errors

### No Content Extracted
- Ensure OpenAI API key has GPT-4 access
- Try simpler URLs first
- Check if website blocks automated access

### High Costs
- Reduce `maxPages` parameter
- Set `maxDepth: 1` 
- Consider using Python actor instead

### Backend Not Receiving Data
- Verify actor ID is correct in backend
- Check Apify API token is valid
- Ensure actor completed successfully

## 📊 Expected Results

### Successful Run:
```
🚀 Starting Stagehand Nantucket scraper...
📍 Start URL: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
📄 [1/5] Processing: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
✅ Page loaded successfully
📝 Extracted: Annual Town Meeting
📄 Content length: 8500 characters
📎 Found 8 PDF links
✅ Saved page data to dataset
📥 Downloading PDF: Planning Board Warrant Article Summary
✅ Parsed PDF: 12 pages, 15000 characters
✅ Saved PDF data to dataset
...
✨ Scraping completed!
📊 Total pages processed: 5
```

### Dataset Output:
```json
[
  {
    "type": "page",
    "url": "https://www.nantucket-ma.gov/2091/Annual-Town-Meeting",
    "title": "Annual Town Meeting",
    "text": "Complete extracted content...",
    "text_length": 8500,
    "pdf_count": 8
  },
  {
    "type": "pdf",
    "url": "https://www.nantucket-ma.gov/DocumentCenter/View/42624/...",
    "title": "Planning Board Warrant Article Summary",
    "full_text": "Complete PDF text...",
    "num_pages": 12,
    "text_length": 15000
  }
]
```

## 🎯 Next Steps

After successful deployment:

1. ✅ Test with small URL first
2. ✅ Verify data format matches expectations
3. ✅ Integrate with your backend
4. ✅ Test end-to-end flow
5. ✅ Scale up to larger scrapes
6. ✅ Monitor costs and performance
7. ✅ Adjust parameters as needed

## 📞 Need Help?

- Check Apify actor logs first
- Review Vercel backend logs
- Verify OpenAI API usage
- Ensure actor completed successfully
- Check this guide's troubleshooting section

