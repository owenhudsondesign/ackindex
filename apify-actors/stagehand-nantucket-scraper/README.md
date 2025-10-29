# Stagehand Nantucket Government Scraper

An AI-powered Apify actor that uses [Stagehand](https://github.com/browserbase/stagehand) to intelligently scrape Nantucket government websites, extracting content from web pages and PDFs.

## 🌟 Why Stagehand?

Traditional web scrapers require you to write specific CSS selectors or XPath queries, which break when websites change. **Stagehand uses AI (GPT-4) to understand web pages like a human would**, making it much more robust and requiring zero selector maintenance.

### Key Advantages:

1. **No Selectors Needed**: Just tell it what you want in plain English
2. **Handles Dynamic Content**: Works with JavaScript-heavy sites
3. **Self-Healing**: Adapts when website structure changes
4. **Intelligent**: Understands context and semantic meaning
5. **PDF Support**: Downloads and extracts text from PDFs

## 🚀 Quick Start

### 1. Deploy to Apify

**Option A: Via Apify Console**
1. Go to https://console.apify.com/actors
2. Click "Create new" → "From template" → "Empty Actor"
3. Name it: `stagehand-nantucket-scraper`
4. Connect to your GitHub repo or upload files manually
5. Build and run

**Option B: Via Apify CLI**
```bash
cd apify-actors/stagehand-nantucket-scraper
apify login
apify push
```

### 2. Configure Input

```json
{
  "startUrl": "https://www.nantucket-ma.gov/2091/Annual-Town-Meeting",
  "maxPages": 10,
  "maxDepth": 2,
  "extractPDFs": true,
  "openaiApiKey": "sk-..." // Your OpenAI API key
}
```

### 3. Run and Get Results

The actor will output structured data:

```json
{
  "type": "page",
  "url": "https://www.nantucket-ma.gov/2091/Annual-Town-Meeting",
  "title": "Annual Town Meeting",
  "text": "Full extracted content...",
  "text_length": 8500,
  "pdf_count": 8,
  "scraped_at": "2025-10-29T12:00:00.000Z"
}
```

## 📊 Output Format

### Page Data
```javascript
{
  type: 'page',
  url: string,
  title: string,
  text: string,              // Cleaned, extracted content
  text_length: number,
  pdf_count: number,         // Number of PDFs found on this page
  scraped_at: string,
  depth: number
}
```

### PDF Data
```javascript
{
  type: 'pdf',
  url: string,
  source_page: string,       // Page where PDF was found
  title: string,
  status: 'success',
  full_text: string,         // Extracted PDF text
  text_length: number,
  num_pages: number,
  metadata: object,          // PDF metadata
  parser: 'pdf-parse',
  scraped_at: string
}
```

## 🔧 How It Works

1. **AI-Powered Navigation**: Stagehand navigates to each page and waits for content to load
2. **Intelligent Extraction**: Uses GPT-4 to understand the page and extract:
   - Main title
   - Meaningful content (skipping ads, navigation, etc.)
   - PDF links with their descriptions
   - Related page links
3. **PDF Processing**: Downloads PDFs and extracts all text
4. **Smart Crawling**: Follows relevant links up to the specified depth
5. **Data Storage**: Saves everything to Apify dataset

## 🎯 Integration with Your Backend

The output format is **compatible with your existing backend** (`src/lib/apifyScraper.ts`). The backend already handles:

- ✅ `type: 'page'` items with `text` field
- ✅ `type: 'pdf'` items with `full_text` field
- ✅ Chunking and embedding generation
- ✅ Storage in Supabase

### Update Your Backend (Optional)

You may want to update `src/lib/apifyScraper.ts` to also check for `type: 'pdf'`:

```typescript
// In getJobResults function, add this condition:
else if (item.type === 'pdf' && item.full_text) {
  // Handle PDF items from Stagehand
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
```

## 🔐 Environment Variables

**Required:**
- `openaiApiKey`: Your OpenAI API key (for Stagehand's AI features)

**Note**: Stagehand uses OpenAI's API, so you'll need an API key. The cost is minimal (typically $0.01-0.05 per page).

## 💡 Usage Tips

### 1. Start Small
Begin with `maxPages: 5` and `maxDepth: 1` to test:
```json
{
  "startUrl": "https://www.nantucket-ma.gov/2091/Annual-Town-Meeting",
  "maxPages": 5,
  "maxDepth": 1,
  "extractPDFs": true,
  "openaiApiKey": "sk-..."
}
```

### 2. Use Specific Starting Pages
Choose pages that have lots of PDF links:
- ✅ `https://www.nantucket-ma.gov/2091/Annual-Town-Meeting`
- ✅ `https://www.nantucket-ma.gov/1183/Planning-Board`
- ✅ `https://www.nantucket-ma.gov/DocumentCenter`

### 3. Monitor Costs
- OpenAI API usage: ~$0.02-0.05 per page
- For 10 pages: ~$0.20-0.50 total
- Set `maxPages` appropriately to control costs

### 4. Check Apify Logs
The actor provides detailed logs:
```
🚀 Starting Stagehand Nantucket scraper...
📄 [1/10] Processing: https://www.nantucket-ma.gov/2091/Annual-Town-Meeting
✅ Page loaded successfully
📝 Extracted: Annual Town Meeting
📄 Content length: 8500 characters
📎 Found 8 PDF links
✅ Saved page data to dataset
📥 Downloading PDF: Planning Board Warrant Article Summary
✅ Parsed PDF: 12 pages, 15000 characters
✅ Saved PDF data to dataset
```

## 🆚 Comparison with Python Actor

| Feature | Python Actor | Stagehand Actor |
|---------|-------------|-----------------|
| **AI-Powered** | ❌ No | ✅ Yes |
| **Selectors** | ❌ Manual CSS | ✅ None needed |
| **Dynamic Content** | ⚠️ Limited | ✅ Excellent |
| **Maintenance** | ⚠️ High | ✅ Low |
| **PDF Extraction** | ✅ Tables supported | ✅ Text only |
| **Setup** | ⚠️ Complex | ✅ Simple |
| **Cost** | 💰 Lower | 💰 Higher (OpenAI) |
| **Reliability** | ⚠️ Medium | ✅ High |

### When to Use Each:

**Use Python Actor when:**
- You need detailed table extraction from PDFs
- You want to minimize costs
- The website structure is stable

**Use Stagehand Actor when:**
- Website is JavaScript-heavy or dynamic
- You want zero maintenance
- Website structure changes frequently
- You need intelligent content extraction

## 🐛 Troubleshooting

### "OpenAI API key is required"
Make sure you provide `openaiApiKey` in the input.

### No Content Extracted
- Check Apify logs for detailed error messages
- Verify the start URL is accessible
- Try increasing the page wait timeout

### PDFs Not Downloading
- Ensure `extractPDFs: true` in input
- Check if PDF links are absolute URLs
- Verify PDF URLs are accessible

### High Costs
- Reduce `maxPages` to limit pages processed
- Set `maxDepth: 1` to avoid deep crawling
- Consider using Python actor for PDF-heavy scraping

## 📚 Learn More

- [Stagehand Documentation](https://github.com/browserbase/stagehand)
- [Apify Documentation](https://docs.apify.com)
- [Apify CLI Guide](https://docs.apify.com/cli)

## 🤝 Support

For issues or questions:
1. Check Apify actor logs
2. Review this README
3. Check the main project documentation

## 📄 License

MIT

