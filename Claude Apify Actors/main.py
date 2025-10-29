"""
Apify Actor Main File - Nantucket Town Government PDF Scraper
Integrates PDF extraction with Apify's crawling framework
"""

from apify import Actor
from apify_client import ApifyClient
import asyncio
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
import PyPDF2
import io
import aiohttp

class NantucketPDFCrawler:
    def __init__(self):
        self.pdf_results = []
        
    async def extract_pdf_links(self, html: str, page_url: str):
        """Extract all PDF links from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        pdf_links = []
        
        # Find all links
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.lower().endswith('.pdf'):
                absolute_url = urljoin(page_url, href)
                link_text = link.get_text(strip=True)
                
                pdf_links.append({
                    'url': absolute_url,
                    'text': link_text,
                    'source_page': page_url
                })
        
        # Also check for PDFs in onclick, data attributes, etc.
        for element in soup.find_all(attrs={'onclick': True}):
            onclick = element['onclick']
            pdf_matches = re.findall(r'["\']([^"\']*\.pdf[^"\']*)["\']', onclick, re.IGNORECASE)
            for pdf_url in pdf_matches:
                absolute_url = urljoin(page_url, pdf_url)
                if not any(p['url'] == absolute_url for p in pdf_links):
                    pdf_links.append({
                        'url': absolute_url,
                        'text': element.get_text(strip=True),
                        'source_page': page_url
                    })
        
        return pdf_links
    
    async def download_and_parse_pdf(self, session: aiohttp.ClientSession, pdf_info: dict):
        """Download and parse a PDF file"""
        try:
            Actor.log.info(f"Downloading PDF: {pdf_info['url']}")
            
            async with session.get(pdf_info['url'], timeout=30) as response:
                if response.status == 200:
                    pdf_content = await response.read()
                    
                    # Parse PDF
                    parsed_data = self.parse_pdf_content(pdf_content)
                    
                    return {
                        **pdf_info,
                        **parsed_data,
                        'status': 'success'
                    }
                else:
                    Actor.log.warning(f"Failed to download {pdf_info['url']}: Status {response.status}")
                    return {
                        **pdf_info,
                        'status': 'failed',
                        'error': f'HTTP {response.status}'
                    }
                    
        except Exception as e:
            Actor.log.error(f"Error processing {pdf_info['url']}: {str(e)}")
            return {
                **pdf_info,
                'status': 'error',
                'error': str(e)
            }
    
    def parse_pdf_content(self, pdf_bytes: bytes):
        """Parse PDF and extract text and metadata with table support"""
        try:
            # Try pdfplumber first for better table extraction
            try:
                import pdfplumber
                return self._parse_with_pdfplumber(pdf_bytes)
            except ImportError:
                Actor.log.warning("pdfplumber not available, using PyPDF2 (limited table support)")
                return self._parse_with_pypdf2(pdf_bytes)
                
        except Exception as e:
            Actor.log.error(f"Error parsing PDF: {str(e)}")
            return {
                'num_pages': 0,
                'metadata': {},
                'pages': [],
                'full_text': '',
                'tables': [],
                'parse_error': str(e)
            }
    
    def _parse_with_pdfplumber(self, pdf_bytes: bytes):
        """Parse with pdfplumber for table extraction"""
        import pdfplumber
        
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Get metadata with PyPDF2
        metadata = {}
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            if pdf_reader.metadata:
                metadata = {
                    'title': pdf_reader.metadata.get('/Title', ''),
                    'author': pdf_reader.metadata.get('/Author', ''),
                    'subject': pdf_reader.metadata.get('/Subject', ''),
                    'creation_date': pdf_reader.metadata.get('/CreationDate', '')
                }
        except:
            pass
        
        pages_data = []
        all_tables = []
        
        with pdfplumber.open(pdf_file) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    text = page.extract_text() or ""
                    tables = page.extract_tables()
                    page_tables = []
                    
                    for table_idx, table in enumerate(tables):
                        if table and len(table) > 0:
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
                        'page_number': page_num,
                        'text': text.strip(),
                        'tables': page_tables,
                        'table_count': len(page_tables)
                    })
                    
                except Exception as e:
                    Actor.log.warning(f"Error extracting page {page_num}: {str(e)}")
        
        full_text = '\n\n'.join([p['text'] for p in pages_data if p.get('text')])
        
        return {
            'num_pages': len(pages_data),
            'metadata': metadata,
            'pages': pages_data,
            'full_text': full_text,
            'text_length': len(full_text),
            'tables': all_tables,
            'total_tables': len(all_tables),
            'parser': 'pdfplumber'
        }
    
    def _parse_with_pypdf2(self, pdf_bytes: bytes):
        """Fallback parser using PyPDF2"""
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        metadata = {}
        if pdf_reader.metadata:
            metadata = {
                'title': pdf_reader.metadata.get('/Title', ''),
                'author': pdf_reader.metadata.get('/Author', ''),
                'subject': pdf_reader.metadata.get('/Subject', ''),
                'creation_date': pdf_reader.metadata.get('/CreationDate', '')
            }
        
        pages_text = []
        for page_num, page in enumerate(pdf_reader.pages, 1):
            try:
                text = page.extract_text()
                if text.strip():
                    pages_text.append({
                        'page_number': page_num,
                        'text': text.strip(),
                        'tables': [],
                        'table_count': 0
                    })
            except Exception as e:
                Actor.log.warning(f"Error extracting page {page_num}: {str(e)}")
        
        full_text = '\n\n'.join([p['text'] for p in pages_text])
        
        return {
            'num_pages': len(pdf_reader.pages),
            'metadata': metadata,
            'pages': pages_text,
            'full_text': full_text,
            'text_length': len(full_text),
            'tables': [],
            'total_tables': 0,
            'parser': 'pypdf2',
            'warning': 'Table extraction requires pdfplumber'
        }


async def main():
    async with Actor:
        Actor.log.info('Nantucket PDF Crawler starting...')
        
        # Get input
        actor_input = await Actor.get_input() or {}
        start_urls = actor_input.get('startUrls', [{'url': 'https://ackindex.com'}])
        max_depth = actor_input.get('maxCrawlDepth', 2)
        download_pdfs = actor_input.get('downloadPdfs', True)
        
        crawler_instance = NantucketPDFCrawler()
        
        # Create aiohttp session for downloading PDFs
        async with aiohttp.ClientSession() as session:
            
            # Define the request handler
            async def request_handler(context):
                """Handle each crawled page"""
                url = context.request.url
                Actor.log.info(f'Processing: {url}')
                
                # Get HTML content
                html = await context.page.content()
                
                # Extract PDF links from this page
                pdf_links = await crawler_instance.extract_pdf_links(html, url)
                Actor.log.info(f'Found {len(pdf_links)} PDF(s) on {url}')
                
                # Process each PDF
                if download_pdfs and pdf_links:
                    for pdf_info in pdf_links:
                        result = await crawler_instance.download_and_parse_pdf(session, pdf_info)
                        await Actor.push_data(result)
                elif pdf_links:
                    # Just save PDF links without downloading
                    for pdf_info in pdf_links:
                        await Actor.push_data(pdf_info)
                
                # Save page data (optional)
                await Actor.push_data({
                    'url': url,
                    'type': 'page',
                    'title': await context.page.title(),
                    'pdf_count': len(pdf_links)
                })
                
                # Enqueue links for further crawling
                await context.enqueue_links()
        
            # Create and run the crawler
            from crawlee.playwright_crawler import PlaywrightCrawler
            
            crawler = PlaywrightCrawler(
                max_request_retries=3,
                max_requests_per_crawl=actor_input.get('maxRequests', 100),
            )
            
            crawler.router.default_handler(request_handler)
            
            await crawler.run(start_urls)
        
        Actor.log.info('Crawling finished!')


if __name__ == '__main__':
    asyncio.run(main())
