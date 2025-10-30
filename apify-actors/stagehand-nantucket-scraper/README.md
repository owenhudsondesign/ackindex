# Stagehand AI-Powered Scraper

AI-powered web scraper using Stagehand for intelligent content extraction from dynamic websites.

## Features

- 🤖 **AI-Powered**: Uses OpenAI to understand page content like a human
- ⚡ **Dynamic Sites**: Handles JavaScript-heavy portals (CivicClerk, Legistar, etc.)
- 📄 **PDF Extraction**: Downloads and extracts text from PDF documents
- 🔗 **Smart Crawling**: Follows relevant links automatically
- 🎯 **Zero Maintenance**: No CSS selectors to break

## Input

```json
{
  "startUrl": "https://nantucketma.portal.civicclerk.com/",
  "maxPages": 20,
  "maxDepth": 2,
  "extractPDFs": true,
  "openaiApiKey": "sk-your-openai-api-key"
}
```

### Parameters

- **startUrl** (required): The URL to start scraping from
- **maxPages** (default: 20): Maximum number of pages to scrape
- **maxDepth** (default: 2): Maximum depth to follow links
- **extractPDFs** (default: true): Whether to extract text from PDFs
- **openaiApiKey** (required): Your OpenAI API key (needs GPT-4 access)

## Output

### Page Data
```json
{
  "type": "page",
  "url": "https://example.com/page",
  "title": "Page Title",
  "text": "Extracted content...",
  "text_length": 5000,
  "pdf_count": 3,
  "scraped_at": "2025-10-30T12:00:00Z"
}
```

### PDF Data
```json
{
  "type": "pdf",
  "url": "https://example.com/document.pdf",
  "source_page": "https://example.com/page",
  "title": "document.pdf",
  "full_text": "PDF content...",
  "num_pages": 10,
  "text_length": 15000,
  "status": "success",
  "parser": "pdf-parse",
  "scraped_at": "2025-10-30T12:00:00Z"
}
```

## Deployment

### Option 1: Apify Console (Easiest)

1. Go to [Apify Console](https://console.apify.com/actors)
2. Click **"Create new"** → **"From scratch"**
3. Name it: `stagehand-nantucket-scraper`
4. Upload all files from this directory
5. Click **"Build"**
6. Once built, click **"Run"** and test with your input

### Option 2: GitHub Integration

1. Push this code to your GitHub repository:
   ```bash
   git add apify-actors/stagehand-nantucket-scraper/
   git commit -m "Add Stagehand AI scraper actor"
   git push origin main
   ```

2. In Apify Console:
   - Go to **Actors** → **Create new** → **From GitHub**
   - Connect your repository
   - Set **Source path**: `apify-actors/stagehand-nantucket-scraper`
   - Click **Build**

### Option 3: Apify CLI

```bash
cd apify-actors/stagehand-nantucket-scraper
apify push
```

## Testing

After deployment, test with this input:

```json
{
  "startUrl": "https://nantucketma.portal.civicclerk.com/",
  "maxPages": 5,
  "maxDepth": 1,
  "extractPDFs": true,
  "openaiApiKey": "sk-your-api-key-here"
}
```

Expected results:
- ✅ 5 pages scraped
- ✅ Text content extracted from each page
- ✅ PDFs found and downloaded
- ✅ Clean, readable text output

## Costs

- **Apify compute**: ~$0.10-0.25 per run (20 pages)
- **OpenAI API**: ~$0.02-0.05 per page
- **Total**: ~$0.50-1.50 per typical run

## Troubleshooting

### "OpenAI API key is required"
Make sure you provide your OpenAI API key in the input.

### No content extracted
- Verify the URL is accessible
- Check Apify logs for errors
- Ensure OpenAI key has GPT-4 access

### High costs
- Reduce `maxPages` (start with 5)
- Set `maxDepth: 1`
- Consider using Python actor for PDF-heavy sites

## Integration with AckIndex

This actor is automatically used by AckIndex for:
- CivicClerk portals (`civicclerk.com`)
- Legistar portals (`legistar.com`)
- CivicPlus sites (`civicplus.com`)
- Granicus platforms (`granicusideas.com`)

All other sites use the Python actor (`ackindex-3`) for optimal PDF processing.

## Support

For issues or questions, check the Apify logs or review the main.js source code.

