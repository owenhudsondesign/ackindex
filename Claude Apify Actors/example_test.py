"""
Example/Test Script for Local PDF Extraction
Run this to test the PDF extractor before deploying to Apify
"""

from pdf_extractor import PDFExtractor
import json

def test_pdf_extraction():
    """Test the PDF extraction on sample pages"""
    
    # Replace with your actual ackindex.com URLs
    test_cases = [
        {
            'url': 'https://ackindex.com',  # Replace with actual URL
            'description': 'Home page'
        },
        {
            'url': 'https://ackindex.com/meetings',  # Replace with actual URL
            'description': 'Meetings page'
        }
    ]
    
    print("🔍 Starting PDF Extraction Test")
    print("=" * 60)
    
    for test in test_cases:
        print(f"\n📄 Testing: {test['description']}")
        print(f"   URL: {test['url']}")
        print("-" * 60)
        
        try:
            # Initialize extractor
            extractor = PDFExtractor(test['url'])
            
            # For real testing, you'd need to fetch the HTML first
            # Here's how you would do it:
            import requests
            response = requests.get(test['url'])
            html_content = response.text
            
            # Extract PDF links (without downloading)
            pdf_links = extractor.extract_pdf_links(html_content, test['url'])
            
            print(f"   ✓ Found {len(pdf_links)} PDF link(s)")
            
            for i, pdf in enumerate(pdf_links, 1):
                print(f"\n   PDF #{i}:")
                print(f"      Filename: {pdf['filename']}")
                print(f"      Link text: {pdf['link_text']}")
                print(f"      URL: {pdf['url']}")
            
            # Test downloading and parsing the first PDF (if any)
            if pdf_links:
                print(f"\n   🔽 Downloading and parsing first PDF...")
                first_pdf = pdf_links[0]
                
                pdf_content = extractor.download_pdf(first_pdf['url'])
                if pdf_content:
                    parsed = extractor.parse_pdf(pdf_content)
                    print(f"      ✓ Pages: {parsed['num_pages']}")
                    print(f"      ✓ Text length: {len(parsed['full_text'])} chars")
                    print(f"      ✓ Title: {parsed['metadata'].get('title', 'N/A')}")
                    
                    # Save first page text as sample
                    if parsed['pages']:
                        first_page = parsed['pages'][0]['text'][:200]
                        print(f"\n      Sample text (first 200 chars):")
                        print(f"      {first_page}...")
                else:
                    print(f"      ✗ Failed to download PDF")
            
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Test complete!")


def test_with_sample_html():
    """Test with sample HTML (doesn't require actual website access)"""
    
    print("\n🧪 Testing with Sample HTML")
    print("=" * 60)
    
    # Sample HTML that might exist on ackindex.com
    sample_html = '''
    <!DOCTYPE html>
    <html>
    <head><title>Nantucket Town Documents</title></head>
    <body>
        <h1>Town Meeting Documents</h1>
        <ul>
            <li><a href="/documents/town-meeting-minutes-2024-01.pdf">January 2024 Meeting Minutes</a></li>
            <li><a href="/documents/annual-budget-2024.pdf">Annual Budget Report 2024</a></li>
            <li><a href="/reports/zoning/zoning-board-decision-2024-03.pdf">Zoning Board Decision - March 2024</a></li>
        </ul>
        
        <h2>Planning Documents</h2>
        <p>View the <a href="plans/comprehensive-plan-2024.pdf">Comprehensive Plan</a></p>
    </body>
    </html>
    '''
    
    extractor = PDFExtractor('https://ackindex.com')
    pdf_links = extractor.extract_pdf_links(sample_html, 'https://ackindex.com/documents')
    
    print(f"\nFound {len(pdf_links)} PDF links in sample HTML:")
    for i, pdf in enumerate(pdf_links, 1):
        print(f"\n  {i}. {pdf['filename']}")
        print(f"     Text: '{pdf['link_text']}'")
        print(f"     URL: {pdf['url']}")
    
    print("\n" + "=" * 60)
    print("✅ Sample test complete!")


def save_sample_output():
    """Generate and save sample output JSON"""
    sample_output = {
        "url": "https://ackindex.com/documents/meeting-minutes-2024-01.pdf",
        "filename": "meeting-minutes-2024-01.pdf",
        "source_page": "https://ackindex.com/meetings",
        "link_text": "January 2024 Meeting Minutes",
        "status": "success",
        "num_pages": 12,
        "metadata": {
            "title": "Town Meeting Minutes - January 2024",
            "author": "Town Clerk",
            "creation_date": "D:20240115093000-05'00'",
            "subject": "Official Town Meeting Minutes"
        },
        "pages": [
            {
                "page_number": 1,
                "text": "TOWN OF NANTUCKET\nSELECTMEN'S MEETING MINUTES\nJanuary 15, 2024..."
            }
        ],
        "full_text": "TOWN OF NANTUCKET\nSELECTMEN'S MEETING MINUTES\n...",
        "text_length": 8456
    }
    
    with open('/home/claude/sample_output.json', 'w') as f:
        json.dump(sample_output, indent=2, fp=f)
    
    print("\n💾 Sample output saved to sample_output.json")


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("  NANTUCKET PDF SCRAPER - LOCAL TEST")
    print("=" * 60)
    
    # Test with sample HTML first (no website access needed)
    test_with_sample_html()
    
    # Generate sample output
    save_sample_output()
    
    # Uncomment below to test with actual website
    # NOTE: Replace URLs in test_pdf_extraction() with real ackindex.com URLs
    
    # print("\n\n⚠️  To test with actual website, uncomment the line below")
    # print("    and update the URLs in the test_pdf_extraction() function\n")
    # test_pdf_extraction()
    
    print("\n" + "=" * 60)
    print("📚 Next Steps:")
    print("   1. Update URLs in test_pdf_extraction() function")
    print("   2. Run: python example_test.py")
    print("   3. Review the output and adjust extraction patterns")
    print("   4. Deploy to Apify using the instructions in README.md")
    print("=" * 60 + "\n")
