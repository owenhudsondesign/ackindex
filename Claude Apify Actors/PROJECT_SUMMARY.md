# Nantucket PDF Scraper - Project Summary

## 📦 What's Included

This package contains everything you need to add PDF extraction and parsing to your Apify crawler for ackindex.com.

### ⭐ NEW: Full Table Extraction

The scraper now includes **pdfplumber** for intelligent table extraction. This is critical for government documents:

- **Budget tables**: Extract revenue/expense data as structured JSON
- **Voting records**: Get structured voting data from meeting minutes  
- **Permits & fees**: Parse application tables with structured data
- **Reports & statistics**: Extract metrics and comparisons

Tables are extracted with full structure: headers, rows, columns preserved as arrays. Ready for CSV export, database loading, or direct analysis.

**Before:** Tables extracted as jumbled text  
**After:** Tables as structured JSON with searchable columns

See **TABLE_GUIDE.md** for detailed examples and **table_processing_examples.py** for ready-to-use helper functions.

### Core Files

1. **pdf_extractor.py** (8.7 KB)
   - Standalone PDF extraction module
   - Can be used independently or integrated with Apify
   - Extracts PDF links, downloads, and parses content
   - Handles metadata extraction and text parsing

2. **apify_actor_main.py** (7.4 KB)
   - Main Apify Actor implementation
   - Integrates PDF extraction with Apify's crawling framework
   - Handles async operations and data storage
   - Ready to deploy to Apify platform

3. **requirements.txt** (148 bytes)
   - All Python dependencies needed
   - Compatible with Apify's Python environment
   - Includes: apify, crawlee, PyPDF2, beautifulsoup4, aiohttp

### Configuration Files

4. **input_schema.json** (1.5 KB)
   - Defines Actor input parameters
   - Used by Apify Console for UI generation
   - Configures: start URLs, crawl depth, max requests, PDF download settings

5. **Dockerfile** (390 bytes)
   - Container configuration for Apify deployment
   - Based on apify/actor-python:3.11
   - Includes Playwright browser installation

6. **.actor/actor.json** (1.3 KB)
   - Apify Actor metadata and configuration
   - Defines dataset views and storage
   - Actor marketplace information

### Documentation

7. **README.md** (8.3 KB)
   - Comprehensive documentation
   - Setup instructions for 3 different deployment methods
   - Configuration options and examples
   - Advanced usage (OCR, tables, filtering)
   - Troubleshooting guide

8. **QUICKSTART.md** (2.9 KB)
   - Fast-track setup guide
   - 5-15 minute deployment options
   - Common configurations
   - Next steps and tips

9. **TABLE_GUIDE.md** (NEW)
   - Before/after comparison of table extraction
   - Real-world government document examples
   - How to use extracted tables
   - Compatibility guide

10. **example_test.py** (6.2 KB)
    - Local testing script
    - Test PDF extraction without deploying
    - Sample HTML test cases
    - Output examples

11. **table_extraction_examples.py** (NEW)
    - Detailed examples of table output format
    - Sample data structures
    - Processing examples
    - Use cases by document type

12. **table_processing_examples.py** (NEW)
    - Practical helper functions for working with tables
    - Search, filter, export functions
    - Budget analysis examples
    - Voting record extraction
    - CSV export utilities

## 🎯 Three Ways to Use This

### Method 1: Deploy New Apify Actor (Recommended)
**Time: 15 minutes**

Best if you want a standalone PDF scraper that you can run independently.

1. Read: QUICKSTART.md → Section 3
2. Upload files to Apify Console
3. Configure and run

### Method 2: Integrate with Existing Crawler
**Time: 5 minutes**

Best if you already have an Apify crawler running and just want to add PDF extraction.

1. Add `pdf_extractor.py` to your existing Actor
2. Import and use in your request handler (see README.md)
3. Update requirements.txt

### Method 3: Use Standalone (No Apify)
**Time: 5 minutes**

Best for local testing or if you're not using Apify.

1. Install: `pip install -r requirements.txt`
2. Import PDFExtractor in your own scripts
3. See example_test.py for usage

## 📂 Deployment Checklist

### For Apify Deployment:
- [ ] Read QUICKSTART.md
- [ ] Test locally with example_test.py (optional but recommended)
- [ ] Upload files to Apify Console or push with Apify CLI
- [ ] Configure input with your ackindex.com URLs
- [ ] Run and verify output
- [ ] Set up scheduled runs if needed

### For Integration with Existing Crawler:
- [ ] Copy pdf_extractor.py to your Actor
- [ ] Update requirements.txt with new dependencies
- [ ] Add import and integration code (see README)
- [ ] Test on a few pages first
- [ ] Deploy

### For Standalone Use:
- [ ] Install dependencies
- [ ] Import PDFExtractor in your scripts
- [ ] Customize as needed

## 🔍 Key Features

✅ **Automatic PDF Detection**: Finds PDFs in href links, onclick handlers, and more  
✅ **Complete Text Extraction**: Pulls all text from every page of the PDF  
✅ **TABLE EXTRACTION** ⭐: Extracts tables with full structure (headers, rows, columns) using pdfplumber  
✅ **Structured Data Export**: Tables as JSON arrays ready for CSV, database, or analysis  
✅ **Metadata Capture**: Title, author, creation date, subject  
✅ **Flexible Configuration**: Control what gets downloaded and parsed  
✅ **Error Handling**: Gracefully handles download failures and parsing errors  
✅ **Async Operations**: Fast parallel processing with Apify  
✅ **Link Context**: Captures the link text for better searchability  

### 📊 Why Table Extraction Is Critical

Government documents contain key data in tables:
- **Budget documents**: Revenue, expenses, departmental allocations
- **Meeting minutes**: Voting records, attendance rosters
- **Permits**: Applicant info, fees, requirements
- **Reports**: Statistics, performance metrics, comparisons

Without proper table extraction, this data becomes unusable jumbled text. With **pdfplumber**, tables preserve their structure and become queryable, exportable, and analyzable.

**See [TABLE_GUIDE.md](TABLE_GUIDE.md) for before/after comparisons and real examples.**

## 📊 Expected Output Format

Each PDF in your dataset will include:

```json
{
  "url": "https://ackindex.com/docs/meeting-minutes.pdf",
  "filename": "meeting-minutes.pdf",
  "source_page": "https://ackindex.com/meetings",
  "link_text": "Meeting Minutes - January 2024",
  "status": "success",
  "parser": "pdfplumber",
  "num_pages": 12,
  "total_tables": 3,
  "metadata": {
    "title": "Town Meeting Minutes",
    "author": "Town Clerk",
    "creation_date": "D:20240115120000"
  },
  "pages": [
    {
      "page_number": 3,
      "text": "VOTING RECORD...",
      "tables": [
        {
          "page": 3,
          "headers": ["Item", "For", "Against", "Abstain"],
          "body": [
            ["Budget Amendment", "4", "1", "0"],
            ["Zoning Change", "3", "2", "0"]
          ]
        }
      ],
      "table_count": 1
    }
  ],
  "tables": [
    {
      "page": 3,
      "table_index": 1,
      "rows": 3,
      "cols": 4,
      "headers": ["Item", "For", "Against", "Abstain"],
      "body": [
        ["Budget Amendment", "4", "1", "0"],
        ["Zoning Change", "3", "2", "0"]
      ]
    }
  ],
  "full_text": "Complete text from all pages...",
  "text_length": 5432
}
```

**Table-specific fields:**
- `total_tables`: Count of tables in the PDF
- `pages[].tables`: Tables on each page
- `tables`: All tables consolidated
- `tables[].headers`: Column names
- `tables[].body`: Data rows

## 🚀 Quick Commands

```bash
# Test locally
python example_test.py

# Install dependencies
pip install -r requirements.txt

# Deploy to Apify (using CLI)
apify login
apify init
apify push

# Run standalone
python pdf_extractor.py
```

## 💡 Tips

1. **Start small**: Test with maxRequests: 10 first
2. **Check logs**: Apify Console shows detailed execution logs
3. **Verify PDFs**: Run example_test.py locally before deploying
4. **Customize extraction**: Edit regex patterns in pdf_extractor.py if needed
5. **Handle scanned PDFs**: Add OCR support if you encounter image-based PDFs (see README)

## 🆘 Common Issues & Solutions

**Issue**: Can't access ackindex.com
- Check if site requires authentication
- Verify you have access credentials
- Consider using Apify's proxy if needed

**Issue**: PDFs not being found
- Check HTML structure of your pages
- Adjust regex patterns in `extract_pdf_links()`
- Test with example_test.py to see what's detected

**Issue**: Parsing fails
- PDF might be scanned (needs OCR)
- PDF might be password-protected
- Check logs for specific error messages

**Issue**: Out of memory
- Reduce maxRequests
- Process smaller batches
- Limit concurrent PDF downloads

## 📈 Next Steps After Setup

1. **Build Search Interface**: Create a frontend where citizens can search the indexed PDF content
2. **Set Up Monitoring**: Track when new documents are added
3. **Add Categorization**: Tag documents by type (meetings, reports, budgets, etc.)
4. **Implement Change Detection**: Alert users when documents are updated
5. **Create API**: Expose the data via REST API for other applications
6. **Add Analytics**: Track which documents are accessed most

## 📞 Support Resources

- **Apify Documentation**: https://docs.apify.com
- **PyPDF2 Documentation**: https://pypdf2.readthedocs.io
- **This Project**: Review README.md for detailed documentation

## ✅ Pre-Deployment Checklist

- [ ] Tested locally with example_test.py
- [ ] Reviewed output format
- [ ] Configured start URLs for ackindex.com
- [ ] Set appropriate crawl depth and request limits
- [ ] Checked if authentication is needed
- [ ] Decided on PDF download vs. link-only extraction
- [ ] Read troubleshooting section in README

---

**Ready to go!** Start with QUICKSTART.md for the fastest path to deployment.
