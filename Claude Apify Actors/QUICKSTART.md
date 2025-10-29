# Quick Start Guide - Nantucket PDF Scraper

## 🚀 Fastest Way to Get Started

### 1. Test Locally First (5 minutes)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the example test
python example_test.py
```

This will show you how the PDF extraction works without needing to deploy anything.

### 2. Test with Your Actual URLs (10 minutes)

Edit `example_test.py` and update the test URLs:

```python
test_cases = [
    {
        'url': 'https://ackindex.com/your-actual-page',
        'description': 'Your page description'
    }
]
```

Then uncomment the actual test at the bottom of `example_test.py` and run it again.

### 3. Deploy to Apify (15 minutes)

**Option A: Use Apify Console (Web UI)**

1. Go to https://console.apify.com/actors
2. Click "Create new" → "Empty Actor"
3. Name it "nantucket-pdf-scraper"
4. In the "Source" tab:
   - Set language to "Python"
   - Copy contents of `apify_actor_main.py` to the main file
   - Upload `requirements.txt`
5. In the "Input" tab:
   - Copy contents of `input_schema.json`
6. Click "Build"
7. Once built, click "Start" and configure:
   ```json
   {
     "startUrls": [{"url": "https://ackindex.com"}],
     "downloadPdfs": true,
     "maxCrawlDepth": 2,
     "maxRequests": 100
   }
   ```

**Option B: Use Apify CLI (Command Line)**

```bash
# Install Apify CLI
npm install -g apify-cli

# Login to Apify
apify login

# Initialize Actor
apify init

# Copy files to the Actor directory
# Then push to Apify
apify push
```

### 4. Integrate with Existing Crawler (5 minutes)

If you already have an Apify crawler, just add this to your request handler:

```python
from pdf_extractor import PDFExtractor

# In your existing handler:
extractor = PDFExtractor(base_url)
pdf_data = extractor.process_page(html_content, page_url)

for pdf in pdf_data:
    await Actor.push_data(pdf)
```

## 📊 What You'll Get

After running, you'll have a dataset with:
- All PDF links found on the pages
- **Structured table data** with headers, rows, and columns preserved
- Extracted text from each PDF
- PDF metadata (title, author, dates)
- Page-by-page content

**Tables are automatically detected and parsed** - budget documents, meeting minutes with voting records, and other structured data will be fully accessible as JSON arrays.

## 🔧 Common Configurations

### Just Extract Links (No Download)
```json
{
  "downloadPdfs": false
}
```

### Deep Crawl
```json
{
  "maxCrawlDepth": 5,
  "maxRequests": 500
}
```

### Multiple Starting Points
```json
{
  "startUrls": [
    {"url": "https://ackindex.com/meetings"},
    {"url": "https://ackindex.com/documents"},
    {"url": "https://ackindex.com/reports"}
  ]
}
```

## ❓ Need Help?

1. Check the logs in Apify Console for errors
2. Review README.md for detailed documentation
3. Test locally with `example_test.py` first
4. Adjust regex patterns in `pdf_extractor.py` if PDFs aren't being found

## 📈 Next Steps

Once you have data flowing:
1. Set up scheduled runs (daily/weekly)
2. Create a search interface for citizens
3. Add data validation and quality checks
4. Consider adding OCR for scanned PDFs
5. Implement change detection (notify when new documents appear)
