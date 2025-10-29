"""
PDF Extractor and Parser for Nantucket Town Government Data
Extends Apify crawler to extract PDF links and parse their content
"""

import re
import requests
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Optional
import PyPDF2
import io

class PDFExtractor:
    def __init__(self, base_url: str):
        """
        Initialize PDF extractor
        
        Args:
            base_url: Base URL of the website being scraped
        """
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_pdf_links(self, html_content: str, page_url: str) -> List[Dict[str, str]]:
        """
        Extract all PDF links from HTML content
        
        Args:
            html_content: HTML content as string
            page_url: URL of the page being scraped (for resolving relative URLs)
        
        Returns:
            List of dictionaries with PDF metadata
        """
        pdf_links = []
        
        # Pattern 1: Direct href links to PDFs
        href_pattern = r'href=["\']([^"\']*\.pdf[^"\']*)["\']'
        matches = re.finditer(href_pattern, html_content, re.IGNORECASE)
        
        for match in matches:
            pdf_url = match.group(1)
            absolute_url = urljoin(page_url, pdf_url)
            
            # Try to extract link text/description
            # Look backwards in HTML for anchor text
            start_pos = max(0, match.start() - 500)
            context = html_content[start_pos:match.end() + 200]
            
            # Extract text between <a> and </a>
            text_match = re.search(r'>(.*?)</a>', context, re.DOTALL)
            link_text = text_match.group(1).strip() if text_match else ""
            link_text = re.sub(r'<[^>]+>', '', link_text)  # Remove HTML tags
            link_text = ' '.join(link_text.split())  # Normalize whitespace
            
            pdf_links.append({
                'url': absolute_url,
                'source_page': page_url,
                'link_text': link_text,
                'filename': pdf_url.split('/')[-1]
            })
        
        # Pattern 2: JavaScript-based PDF links (onclick, etc.)
        js_pattern = r'["\']([^"\']*\.pdf[^"\']*)["\']'
        js_matches = re.finditer(js_pattern, html_content, re.IGNORECASE)
        
        for match in js_matches:
            pdf_url = match.group(1)
            if not any(link['url'] == urljoin(page_url, pdf_url) for link in pdf_links):
                absolute_url = urljoin(page_url, pdf_url)
                pdf_links.append({
                    'url': absolute_url,
                    'source_page': page_url,
                    'link_text': '',
                    'filename': pdf_url.split('/')[-1]
                })
        
        return pdf_links
    
    def download_pdf(self, pdf_url: str) -> Optional[bytes]:
        """
        Download PDF content
        
        Args:
            pdf_url: URL of the PDF
        
        Returns:
            PDF content as bytes, or None if download fails
        """
        try:
            response = self.session.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            # Verify it's actually a PDF
            if response.headers.get('content-type', '').lower() in ['application/pdf', 'application/x-pdf']:
                return response.content
            elif response.content[:4] == b'%PDF':
                return response.content
            else:
                print(f"Warning: {pdf_url} doesn't appear to be a PDF")
                return None
                
        except Exception as e:
            print(f"Error downloading {pdf_url}: {str(e)}")
            return None
    
    def parse_pdf(self, pdf_content: bytes) -> Dict[str, any]:
        """
        Parse PDF and extract text content with table extraction
        
        Args:
            pdf_content: PDF file as bytes
        
        Returns:
            Dictionary with parsed PDF data including tables
        """
        try:
            # Try pdfplumber first (better for tables)
            try:
                import pdfplumber
                return self._parse_with_pdfplumber(pdf_content)
            except ImportError:
                print("Warning: pdfplumber not installed, falling back to PyPDF2 (limited table support)")
                return self._parse_with_pypdf2(pdf_content)
            
        except Exception as e:
            print(f"Error parsing PDF: {str(e)}")
            return {
                'error': str(e),
                'num_pages': 0,
                'metadata': {},
                'pages': [],
                'full_text': '',
                'tables': []
            }
    
    def _parse_with_pdfplumber(self, pdf_content: bytes) -> Dict[str, any]:
        """
        Parse PDF using pdfplumber (better table extraction)
        """
        import pdfplumber
        
        pdf_file = io.BytesIO(pdf_content)
        
        # First get metadata with PyPDF2
        metadata = {}
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            if pdf_reader.metadata:
                metadata = {
                    'title': pdf_reader.metadata.get('/Title', ''),
                    'author': pdf_reader.metadata.get('/Author', ''),
                    'subject': pdf_reader.metadata.get('/Subject', ''),
                    'creator': pdf_reader.metadata.get('/Creator', ''),
                    'creation_date': pdf_reader.metadata.get('/CreationDate', '')
                }
        except:
            pass
        
        # Now extract text and tables with pdfplumber
        pages_data = []
        all_tables = []
        
        with pdfplumber.open(pdf_file) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    # Extract text
                    text = page.extract_text() or ""
                    
                    # Extract tables
                    tables = page.extract_tables()
                    page_tables = []
                    
                    for table_idx, table in enumerate(tables):
                        if table and len(table) > 0:
                            # Convert table to dict format
                            table_data = {
                                'page': page_num,
                                'table_index': table_idx + 1,
                                'rows': len(table),
                                'cols': len(table[0]) if table else 0,
                                'data': table,
                                'headers': table[0] if table else [],
                                'body': table[1:] if len(table) > 1 else []
                            }
                            page_tables.append(table_data)
                            all_tables.append(table_data)
                    
                    pages_data.append({
                        'page': page_num,
                        'text': text.strip(),
                        'tables': page_tables,
                        'table_count': len(page_tables)
                    })
                    
                except Exception as e:
                    print(f"Error extracting page {page_num}: {str(e)}")
                    pages_data.append({
                        'page': page_num,
                        'text': '',
                        'tables': [],
                        'error': str(e)
                    })
        
        full_text = '\n\n'.join([p['text'] for p in pages_data if p.get('text')])
        
        return {
            'num_pages': len(pages_data),
            'metadata': metadata,
            'pages': pages_data,
            'full_text': full_text,
            'tables': all_tables,
            'total_tables': len(all_tables),
            'parser': 'pdfplumber'
        }
    
    def _parse_with_pypdf2(self, pdf_content: bytes) -> Dict[str, any]:
        """
        Fallback parser using PyPDF2 (limited table support)
        """
        pdf_file = io.BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract metadata
        metadata = {}
        if pdf_reader.metadata:
            metadata = {
                'title': pdf_reader.metadata.get('/Title', ''),
                'author': pdf_reader.metadata.get('/Author', ''),
                'subject': pdf_reader.metadata.get('/Subject', ''),
                'creator': pdf_reader.metadata.get('/Creator', ''),
                'creation_date': pdf_reader.metadata.get('/CreationDate', '')
            }
        
        # Extract text from all pages
        text_content = []
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                text = page.extract_text()
                if text.strip():
                    text_content.append({
                        'page': page_num + 1,
                        'text': text.strip(),
                        'tables': [],
                        'table_count': 0
                    })
            except Exception as e:
                print(f"Error extracting page {page_num + 1}: {str(e)}")
        
        return {
            'num_pages': len(pdf_reader.pages),
            'metadata': metadata,
            'pages': text_content,
            'full_text': '\n\n'.join([p['text'] for p in text_content]),
            'tables': [],
            'total_tables': 0,
            'parser': 'pypdf2',
            'warning': 'Table extraction not available with PyPDF2. Install pdfplumber for better table support.'
        }
    
    def process_page(self, html_content: str, page_url: str, download_pdfs: bool = True) -> List[Dict]:
        """
        Complete workflow: extract PDF links, download, and parse
        
        Args:
            html_content: HTML content of the page
            page_url: URL of the page
            download_pdfs: Whether to download and parse PDFs (True) or just extract links (False)
        
        Returns:
            List of dictionaries with PDF data
        """
        # Extract PDF links
        pdf_links = self.extract_pdf_links(html_content, page_url)
        print(f"Found {len(pdf_links)} PDF links on {page_url}")
        
        results = []
        
        for pdf_info in pdf_links:
            result = pdf_info.copy()
            
            if download_pdfs:
                # Download PDF
                pdf_content = self.download_pdf(pdf_info['url'])
                
                if pdf_content:
                    # Parse PDF
                    parsed_data = self.parse_pdf(pdf_content)
                    result.update(parsed_data)
                    print(f"✓ Parsed: {pdf_info['filename']} ({parsed_data['num_pages']} pages)")
                else:
                    result['error'] = 'Download failed'
                    print(f"✗ Failed: {pdf_info['filename']}")
            
            results.append(result)
        
        return results


# Example usage for Apify integration
def apify_handler(context):
    """
    Example handler function for Apify Actor
    This would be called for each page crawled
    """
    from apify import Actor
    
    async def main():
        async with Actor:
            # Get input from Apify
            actor_input = await Actor.get_input() or {}
            base_url = actor_input.get('startUrls', [{}])[0].get('url', '')
            
            # Initialize PDF extractor
            extractor = PDFExtractor(base_url)
            
            # Get the current page data
            request = await Actor.get_current_request()
            page_url = request.get('url')
            html_content = request.get('html')  # Assuming HTML is available
            
            # Process PDFs
            pdf_data = extractor.process_page(html_content, page_url)
            
            # Save to Apify dataset
            for pdf in pdf_data:
                await Actor.push_data(pdf)
    
    return main


if __name__ == '__main__':
    # Test example
    extractor = PDFExtractor('https://example.com')
    
    # Example HTML with PDF links
    test_html = '''
    <html>
        <body>
            <a href="/documents/meeting-minutes-2024.pdf">Meeting Minutes</a>
            <a href="/reports/annual-report.pdf">Annual Report 2024</a>
        </body>
    </html>
    '''
    
    results = extractor.process_page(test_html, 'https://example.com/page', download_pdfs=False)
    print(f"\nFound {len(results)} PDFs:")
    for r in results:
        print(f"  - {r['filename']}: {r['link_text']}")
