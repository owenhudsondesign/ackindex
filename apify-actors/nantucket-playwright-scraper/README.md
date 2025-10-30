# Nantucket Government PDF Scraper (Playwright)

A fixed, production-ready Apify actor that uses Playwright for browser rendering to scrape government websites and extract PDFs.

## 🎯 What This Does

- **Browser Rendering**: Uses Playwright to execute JavaScript and render modern SPAs
- **PDF Extraction**: Finds and downloads PDF documents from government sites
- **Content Extraction**: Extracts clean text content from pages
- **AI Enhancement**: Optional OpenAI integration for intelligent content cleaning
- **Table Parsing**: Extracts tables from PDFs using pdfplumber

## 🚀 Quick Start

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Run test script
python test_extraction.py
```

### Deploy to Apify

1. Push to Apify:
   ```bash
   apify push
   ```

2. Or upload via Apify Console

### Example Input

```json
{
  "startUrls": [
    { "url": "https://www.nantucket-ma.gov/2091/Annual-Town-Meeting" }
  ],
  "maxRequests": 10,
  "maxCrawlDepth": 2,
  "downloadPdfs": true,
  "openaiApiKey": "sk-..."
}
```

## 📊 Output

Each page produces data like:

```json
{
  "type": "page",
  "url": "https://www.nantucket-ma.gov/...",
  "title": "Annual Town Meeting",
  "text": "Meeting content...",
  "text_length": 8500,
  "pdf_count": 12,
  "scraped_at": "2025-10-29T12:00:00"
}
```

Each PDF produces:

```json
{
  "type": "pdf",
  "url": "https://www.nantucket-ma.gov/...pdf",
  "text": "PDF content...",
  "full_text": "...",
  "num_pages": 12,
  "tables": [...],
  "status": "success"
}
```

## 🔧 Configuration

- **startUrls**: Array of URLs to start crawling
- **maxRequests**: Maximum pages to crawl (default: 10)
- **maxCrawlDepth**: How deep to follow links (default: 2)
- **downloadPdfs**: Whether to download and parse PDFs (default: true)
- **openaiApiKey**: Optional OpenAI key for AI content extraction

## 📚 Documentation

See the `/docs` folder for:
- `README_START_HERE.md` - Complete setup guide
- `EXECUTIVE_SUMMARY.md` - Quick overview
- `BUG_ANALYSIS.md` - Technical details of the fix
- `SIDE_BY_SIDE_COMPARISON.md` - Code comparison

## ✅ Success Indicators

Look for these in the logs:

```
🌐 Launching Playwright browser...
✅ Page loaded with Playwright
📄 HTML length: 125,432 bytes
🔗 Found 12 PDF(s)
✅ Saved page data
```

## 💰 Costs

~$0.10-0.25 per 50 pages (Apify compute units)

Optional OpenAI: ~$0.01-0.02 per page

## 🐛 Troubleshooting

**Browser won't launch?**
- Check Dockerfile has `playwright install chromium`
- Ensure using `apify/actor-python-playwright:3.11` base image

**Still getting empty HTML?**
- Verify logs show "Launching Playwright browser"
- Check `await page.goto()` is using `wait_until='networkidle'`

**PDFs not found?**
- Manually visit the page to confirm PDFs exist
- Check PDF link patterns in `extract_pdf_links()`

## 📞 Support

For issues, check the documentation in `/docs` or review the logs for error messages.
