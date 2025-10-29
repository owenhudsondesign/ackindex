"""
Apify Actor Main File - Nantucket Town Government PDF Scraper
Integrates PDF extraction with Apify's crawling framework
"""

from apify import Actor
from apify_client import ApifyClient
import asyncio
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import PyPDF2
import io
import aiohttp
from playwright.async_api import async_playwright
from openai import OpenAI
import os

class NantucketPDFCrawler:
    def __init__(self, openai_api_key=None):
        self.pdf_results = []
        self.visited_urls = set()
        self.openai_client = None
        
        # Initialize OpenAI if API key is provided
        if openai_api_key:
            self.openai_client = OpenAI(api_key=openai_api_key)
            Actor.log.info('✅ OpenAI enabled for AI-powered content extraction')
        else:
            Actor.log.warning('⚠️ OpenAI API key not provided - using basic extraction')
        
    async def extract_pdf_links(self, html: str, page_url: str):
        """Extract all PDF links from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        pdf_links = []
        
        # Find all links
        for link in soup.find_all('a', href=True):
            href = link['href']
            # Check for direct .pdf links OR DocumentCenter/View links (common in government sites)
            is_pdf = (href.lower().endswith('.pdf') or 
                     '/DocumentCenter/View/' in href or
                     'PDF' in href or 'pdf' in href)
            
            if is_pdf:
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
    
    async def extract_page_links(self, html: str, base_url: str, start_url: str):
        """Extract all page links for crawling"""
        soup = BeautifulSoup(html, 'html.parser')
        links = []
        base_domain = urlparse(start_url).netloc
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            absolute_url = urljoin(base_url, href)
            
            # Only crawl links from the same domain and not PDFs
            parsed = urlparse(absolute_url)
            if (parsed.netloc == base_domain and 
                not absolute_url.lower().endswith('.pdf') and
                absolute_url not in self.visited_urls):
                links.append(absolute_url)
        
        return links
    
    def ai_extract_content(self, raw_text: str, page_title: str) -> str:
        """
        Use OpenAI to intelligently extract main content from HTML text.
        This removes navigation, headers, footers, and boilerplate, keeping only meaningful content.
        """
        if not self.openai_client:
            return raw_text  # Fallback to basic extraction
        
        try:
            # Truncate if too long (GPT context limits)
            text_to_analyze = raw_text[:8000] if len(raw_text) > 8000 else raw_text
            
            Actor.log.info(f'🤖 Using AI to extract clean content from: {page_title}')
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert content extractor for government websites. 
Your job is to extract ONLY the main, meaningful content from web pages.

REMOVE:
- Navigation menus, breadcrumbs
- Headers and footers
- Social media links
- "Last updated" dates
- Copyright notices
- Cookie notices
- Contact info unless it's the main content
- Repetitive boilerplate text

KEEP:
- Main article/page content
- Meeting minutes and agendas
- Official documents and reports
- Important announcements
- Policy information
- Substantive text about the topic

Return ONLY the cleaned, meaningful content. Be thorough - if the page has good content, include all of it."""
                    },
                    {
                        "role": "user",
                        "content": f"Page title: {page_title}\n\nExtract the main content from this text:\n\n{text_to_analyze}"
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            extracted_content = response.choices[0].message.content.strip()
            
            Actor.log.info(f'✅ AI extraction: {len(raw_text)} → {len(extracted_content)} characters')
            
            return extracted_content if extracted_content else raw_text
            
        except Exception as e:
            Actor.log.error(f'❌ AI extraction failed: {str(e)} - falling back to basic extraction')
            return raw_text
    
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
        Actor.log.info('🚀 Nantucket PDF Crawler with AI starting...')
        
        # Get input
        actor_input = await Actor.get_input() or {}
        # Log received keys for debugging
        try:
            Actor.log.info(f"Input keys: {list(actor_input.keys())}")
        except Exception:
            pass

        # Normalize input: support startUrl (string) or url (string)
        start_urls_input = actor_input.get('startUrls')
        if not start_urls_input:
            if 'startUrl' in actor_input and actor_input.get('startUrl'):
                start_urls_input = [{ 'url': actor_input.get('startUrl') }]
            elif 'url' in actor_input and actor_input.get('url'):
                start_urls_input = [{ 'url': actor_input.get('url') }]
            else:
                start_urls_input = [{ 'url': 'https://www.nantucket-ma.gov/2091/Annual-Town-Meeting' }]
        
        # Handle both formats: array of objects or array of strings
        start_urls = []
        for url_item in start_urls_input:
            if isinstance(url_item, dict):
                start_urls.append(url_item.get('url'))
            else:
                start_urls.append(str(url_item))
        
        # Normalize limits: support maxPages/maxDepth in addition to maxRequests
        max_pages = actor_input.get('maxRequests') or actor_input.get('maxPages') or 10
        download_pdfs = actor_input.get('downloadPdfs', True)
        max_depth = actor_input.get('maxCrawlDepth') or actor_input.get('maxDepth') or 2

        Actor.log.info(f"Start URLs: {start_urls}")
        Actor.log.info(f"max_pages={max_pages}, max_depth={max_depth}, download_pdfs={download_pdfs}")
        
        # Get OpenAI API key from input or environment variable
        openai_api_key = actor_input.get('openaiApiKey') or os.environ.get('OPENAI_API_KEY')
        
        if openai_api_key:
            Actor.log.info('✅ OpenAI API key found - AI extraction enabled')
        else:
            Actor.log.warning('⚠️ No OpenAI API key - using basic extraction only')
        
        crawler_instance = NantucketPDFCrawler(openai_api_key=openai_api_key)
        
        # Create aiohttp session for downloading PDFs
        async with aiohttp.ClientSession() as session:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                urls_to_visit = start_urls.copy()
                pages_crawled = 0
                
                while urls_to_visit and pages_crawled < max_pages:
                    url = urls_to_visit.pop(0)
                    
                    if url in crawler_instance.visited_urls:
                        continue
                    
                    # Skip PDF URLs - they'll be downloaded separately
                    if url.lower().endswith('.pdf') or '/DocumentCenter/View/' in url:
                        Actor.log.info(f'Skipping direct PDF/document URL: {url}')
                        continue
                    
                    crawler_instance.visited_urls.add(url)
                    pages_crawled += 1
                    
                    try:
                        Actor.log.info(f'Processing ({pages_crawled}/{max_pages}): {url}')
                        
                        # Navigate to page and wait for DOM to be ready (faster than networkidle)
                        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                        
                        # Additional wait for dynamic content to render
                        await page.wait_for_timeout(2000)
                        
                        # Get HTML content after JavaScript has executed
                        html = await page.content()
                        page_title = await page.title()
                        
                        Actor.log.info(f'Page loaded: {page_title} (HTML length: {len(html)} bytes)')
                        
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
                        
                        # Extract text content from the page
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Log raw body length before cleaning
                        raw_body_text = soup.body.get_text() if soup.body else soup.get_text()
                        Actor.log.info(f'Raw body text length before cleaning: {len(raw_body_text)} characters')
                        
                        # Remove script and style elements, ads, and navigation
                        for element in soup(["script", "style", "nav", "header", "footer", "iframe", "noscript"]):
                            element.decompose()
                        
                        # Remove common ad and tracking elements
                        for element in soup.find_all(class_=re.compile(r'(ad|advertisement|tracking|social-share)', re.I)):
                            element.decompose()
                        
                        # Try to find main content areas (prioritize article, main, content divs)
                        main_content = None
                        for selector in ['article', 'main', '[role="main"]', '.content', '.main-content', '#content', '#main']:
                            main_content = soup.select_one(selector)
                            if main_content:
                                Actor.log.info(f'Found main content using selector: {selector}')
                                break
                        
                        # Use main content if found, otherwise use entire body
                        content_element = main_content if main_content else soup.body if soup.body else soup
                        Actor.log.info(f'Using content from: {"main content area" if main_content else "entire body"}')
                        
                        # Get text content
                        page_text = content_element.get_text(separator='\n', strip=True)
                        
                        # Clean up whitespace
                        lines = (line.strip() for line in page_text.splitlines())
                        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                        page_text = '\n'.join(chunk for chunk in chunks if chunk)
                        
                        Actor.log.info(f'Extracted text length after cleaning: {len(page_text)} characters')
                        
                        # Use AI to further clean and extract meaningful content
                        if openai_api_key and len(page_text) > 100:
                            final_text = crawler_instance.ai_extract_content(page_text, page_title)
                        else:
                            final_text = page_text
                        
                        if len(final_text) < 100:
                            Actor.log.warning(f'Very little text extracted! HTML preview: {html[:500]}...')
                            Actor.log.warning(f'Raw text preview: {raw_body_text[:500]}...')
                        else:
                            Actor.log.info(f'Final text preview: {final_text[:300]}...')
                        
                        # Save page data with AI-cleaned content
                        await Actor.push_data({
                            'url': url,
                            'type': 'page',
                            'title': page_title,
                            'text': final_text,
                            'text_length': len(final_text),
                            'pdf_count': len(pdf_links),
                            'tables': [],  # HTML pages don't have tables extracted yet
                            'ai_processed': bool(openai_api_key and len(page_text) > 100)
                        })
                        
                        # Extract more links to crawl
                        if pages_crawled < max_pages:
                            page_links = await crawler_instance.extract_page_links(html, url, start_urls[0])
                            # Enforce max_depth by tracking distance from first start URL
                            next_depth = 1  # minimal tracking since we don't store per-URL depth here
                            if next_depth <= max_depth:
                                urls_to_visit.extend(page_links[:max_pages - pages_crawled])
                        
                    except Exception as e:
                        Actor.log.error(f'Error processing {url}: {str(e)}')
                
                await browser.close()
        
        Actor.log.info(f'Crawling finished! Processed {pages_crawled} pages.')


if __name__ == '__main__':
    asyncio.run(main())
