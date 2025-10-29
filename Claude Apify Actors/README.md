# Nantucket Town Government PDF Scraper

This project extends your Apify crawler to extract PDF links from Nantucket town government pages and parse their content for citizen access.

## Features

- 🔍 **Automatic PDF Detection**: Extracts all PDF links from crawled pages
- 📊 **TABLE EXTRACTION**: Parses tables with full structure preservation (rows, columns, headers)
- 📄 **PDF Parsing**: Downloads and extracts text from PDFs
- 🎯 **Structured Data**: Tables exported as JSON arrays ready for analysis
- 📋 **Metadata Extraction**: Captures PDF metadata (title, author, creation date, etc.)
- 🔄 **Apify Integration**: Works seamlessly with Apify's crawling infrastructure
- 🎛️ **Flexible Configuration**: Control crawl depth, PDF downloading, and more

### Why Table Extraction Matters

Government documents (budgets, meeting minutes, permits) contain critical data in tables. Without proper table extraction, this data becomes unusable text. With **pdfplumber**, tables are preserved as structured data you can search, analyze, and export to CSV/databases.

**Example:** A budget PDF table with departments and amounts becomes queryable JSON instead of jumbled text.

See [TABLE_GUIDE.md](TABLE_GUIDE.md) for detailed examples and before/after comparisons.

## Project Structure

```
.
├── pdf_extractor.py        # Standalone PDF extraction module
├── apify_actor_main.py     # Main Apify Actor file
├── requirements.txt        # Python dependencies
├── input_schema.json       # Apify Actor input configuration
└── README.md              # This file
```

## Setup Instructions

### Option 1: Deploy as Apify Actor

1. **Create a new Apify Actor**:
   - Go to https://console.apify.com/actors
   - Click "Create new" → "Empty Actor"
   - Name it "nantucket-pdf-scraper"

2. **Upload the files**:
   - Copy `apify_actor_main.py` to the Actor's main file (rename to `main.py`)
   - Upload `requirements.txt`
   - Upload `input_schema.json` in the Actor's "Input" tab

3. **Configure the Actor**:
   - Set Python version to 3.11
   - Set Dockerfile template to "Python" 

4. **Build and run**:
   - Click "Build"
   - Once built, click "Start" with your desired configuration

### Option 2: Use as Standalone Script

If you want to test locally first:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the standalone extractor
python pdf_extractor.py
```

Edit the `if __name__ == '__main__'` section in `pdf_extractor.py` to test with your URLs.

### Option 3: Integrate with Existing Apify Crawler

Add the PDF extraction logic to your existing crawler:

```python
from pdf_extractor import PDFExtractor

# In your existing crawler's request handler:
async def request_handler(context):
    url = context.request.url
    html = await context.page.content()
    
    # Add PDF extraction
    extractor = PDFExtractor(url)
    pdf_data = extractor.process_page(html, url, download_pdfs=True)
    
    # Save to dataset
    for pdf in pdf_data:
        await Actor.push_data(pdf)
    
    # Continue with your existing logic
    await context.enqueue_links()
```

## Configuration

### Input Parameters

When running the Apify Actor, you can configure:

- **Start URLs**: Initial URLs to crawl (default: `https://ackindex.com`)
- **Download PDFs**: Whether to download and parse PDFs or just extract links (default: `true`)
- **Max Crawl Depth**: How many levels deep to crawl (default: `2`)
- **Max Requests**: Maximum number of pages to crawl (default: `100`)

### Example Input

```json
{
  "startUrls": [
    {"url": "https://ackindex.com"},
    {"url": "https://ackindex.com/town-meetings"}
  ],
  "downloadPdfs": true,
  "maxCrawlDepth": 3,
  "maxRequests": 200
}
```

## Output Format

Each PDF in the dataset will have this structure:

```json
{
  "url": "https://ackindex.com/documents/meeting-minutes-2024.pdf",
  "filename": "meeting-minutes-2024.pdf",
  "source_page": "https://ackindex.com/meetings",
  "link_text": "Meeting Minutes - January 2024",
  "status": "success",
  "parser": "pdfplumber",
  "num_pages": 12,
  "total_tables": 3,
  "metadata": {
    "title": "Town Meeting Minutes",
    "author": "Town Clerk",
    "creation_date": "D:20240115120000",
    "subject": "Official Minutes"
  },
  "pages": [
    {
      "page_number": 1,
      "text": "TOWN OF NANTUCKET\nMEETING MINUTES...",
      "tables": [],
      "table_count": 0
    },
    {
      "page_number": 3,
      "text": "VOTING RECORD...",
      "tables": [
        {
          "page": 3,
          "table_index": 1,
          "rows": 5,
          "cols": 4,
          "headers": ["Item", "For", "Against", "Abstain"],
          "body": [
            ["Budget Amendment", "4", "1", "0"],
            ["Zoning Change", "3", "2", "0"]
          ],
          "data": [
            ["Item", "For", "Against", "Abstain"],
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
      "rows": 5,
      "cols": 4,
      "headers": ["Item", "For", "Against", "Abstain"],
      "body": [
        ["Budget Amendment", "4", "1", "0"],
        ["Zoning Change", "3", "2", "0"]
      ],
      "data": [
        ["Item", "For", "Against", "Abstain"],
        ["Budget Amendment", "4", "1", "0"],
        ["Zoning Change", "3", "2", "0"]
      ]
    }
  ],
  "full_text": "Complete extracted text from all pages...",
  "text_length": 5432
}
```

**Key Fields for Tables:**
- `total_tables`: Total number of tables found in the PDF
- `pages[].tables`: Tables found on each specific page
- `tables`: All tables consolidated from all pages
- `tables[].headers`: First row of table (column names)
- `tables[].body`: All data rows
- `tables[].data`: Complete table (headers + body combined)

## Advanced Usage

### Custom PDF Processing

You can customize the PDF parser in `pdf_extractor.py`:

```python
def parse_pdf(self, pdf_content: bytes) -> Dict[str, any]:
    # Add custom logic here
    # For example, extract tables, images, or specific sections
    
    # Use pdfplumber for better table extraction:
    # import pdfplumber
    # with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
    #     for page in pdf.pages:
    #         tables = page.extract_tables()
```

### Better PDF Parsing with pdfplumber

For more accurate text extraction (especially with tables), install pdfplumber:

```bash
pip install pdfplumber
```

Then modify the `parse_pdf` method:

```python
import pdfplumber

def parse_pdf_with_tables(self, pdf_content: bytes):
    with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
        pages_data = []
        for page in pdf.pages:
            text = page.extract_text()
            tables = page.extract_tables()
            pages_data.append({
                'page_number': page.page_number,
                'text': text,
                'tables': tables
            })
        return pages_data
```

## Handling Different PDF Types

### Scanned PDFs (OCR)

If you encounter scanned PDFs, you'll need OCR. Add to requirements.txt:

```
pytesseract==0.3.10
pdf2image==1.16.3
Pillow==10.1.0
```

Then add OCR capability:

```python
from pdf2image import convert_from_bytes
import pytesseract

def ocr_pdf(self, pdf_content: bytes):
    images = convert_from_bytes(pdf_content)
    text_pages = []
    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image)
        text_pages.append({'page': i + 1, 'text': text})
    return text_pages
```

### Password-Protected PDFs

Add password support:

```python
def parse_pdf(self, pdf_content: bytes, password: str = None):
    pdf_file = io.BytesIO(pdf_content)
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    
    if pdf_reader.is_encrypted:
        if password:
            pdf_reader.decrypt(password)
        else:
            return {'error': 'PDF is password protected'}
    
    # Continue with normal parsing...
```

## Filtering and Search

### Filter PDFs by Type

Add filtering logic to only process certain types of documents:

```python
def should_process_pdf(self, pdf_info: dict) -> bool:
    """Decide whether to download and parse a PDF"""
    filename = pdf_info['filename'].lower()
    link_text = pdf_info['link_text'].lower()
    
    # Only process meeting minutes and reports
    keywords = ['minutes', 'report', 'agenda', 'budget']
    return any(keyword in filename or keyword in link_text 
               for keyword in keywords)
```

### Index for Search

Save data to a searchable format:

```python
# After parsing, create search index
search_data = {
    'id': pdf_info['url'],
    'title': metadata.get('title') or link_text,
    'content': full_text,
    'date': metadata.get('creation_date'),
    'url': pdf_info['url'],
    'keywords': extract_keywords(full_text)  # Custom function
}

# Store in database or search engine (Elasticsearch, etc.)
```

## Troubleshooting

### Issue: PDFs not downloading

- Check if the site requires authentication
- Verify PDF URLs are absolute, not relative
- Check for JavaScript-generated links (may need different extraction method)

### Issue: Empty text extraction

- PDF might be scanned images (needs OCR)
- PDF might be password-protected
- PDF might use custom fonts or encoding

### Issue: Memory errors with large PDFs

- Process PDFs in batches
- Limit concurrent downloads
- Stream large files instead of loading fully into memory

### Issue: Rate limiting

- Add delays between requests
- Use Apify's proxy service
- Implement exponential backoff

## Monitoring and Logs

The Actor logs helpful information:

- Number of PDFs found on each page
- Download/parse success/failure for each PDF
- Errors and warnings

View logs in the Apify Console under the Actor run.

## Next Steps

1. **Test with your actual data**: Run on a few ackindex.com pages first
2. **Refine extraction**: Adjust regex patterns if PDFs are missed
3. **Add data validation**: Ensure extracted text meets quality standards
4. **Create search interface**: Build a frontend for citizens to search the indexed data
5. **Schedule regular runs**: Set up scheduled Actor runs to keep data updated

## Support

For issues specific to:
- **Apify platform**: https://docs.apify.com
- **PDF parsing**: https://pypdf2.readthedocs.io
- **This scraper**: Review the code comments and adjust as needed

## License

This is custom code for Nantucket town government data access. Modify as needed for your use case.
