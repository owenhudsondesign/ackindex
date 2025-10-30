"""
Apify Actor Main File - Nantucket Town Government PDF Scraper (FIXED)
Now actually uses Playwright for browser rendering!
"""

from apify import Actor
import asyncio
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import PyPDF2
import io
import aiohttp
from playwright.async_api import async_playwright
import gc
from openai import OpenAI
import os
from datetime import datetime

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
            Actor.log.info('ℹ️ OpenAI API key not provided - using basic extraction')

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
                     '/document/' in href.lower() or
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
        """
        if not self.openai_client:
            return raw_text

        try:
            text_to_analyze = raw_text[:8000] if len(raw_text) > 8000 else raw_text

            Actor.log.info(f'🤖 Using AI to extract clean content from: {page_title}')

            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert content extractor for government websites.
Extract ONLY the main, meaningful content from web pages.

REMOVE: Navigation, headers, footers, social media, dates, copyright, cookies, contact info
KEEP: Main article content, meeting minutes, official documents, announcements, policy info

Return ONLY the cleaned, meaningful content."""
                    },
                    {
                        "role": "user",
                        "content": f"Page title: {page_title}\n\nExtract main content:\n\n{text_to_analyze}"
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )

            extracted = response.choices[0].message.content.strip()
            Actor.log.info(f'✅ AI: {len(raw_text)} → {len(extracted)} chars')
            return extracted if extracted else raw_text

        except Exception as e:
            Actor.log.error(f'❌ AI extraction failed: {str(e)}')
            return raw_text

    async def download_and_parse_pdf(self, session: aiohttp.ClientSession, pdf_info: dict):
        """Download and parse a PDF file"""
        try:
            Actor.log.info(f"📥 Downloading PDF: {pdf_info['url']}")

            async with session.get(pdf_info['url'], timeout=30) as response:
                if response.status == 200:
                    # Skip large PDFs (5 MB cap for ultra-low memory)
                    try:
                        content_len = response.headers.get('content-length')
                        if content_len and int(content_len) > 5 * 1024 * 1024:
                            Actor.log.warning(f"⚠️ Skipping large PDF (>5MB)")
                            return { **pdf_info, 'status': 'skipped_large' }
                    except Exception:
                        pass

                    pdf_content = await response.read()
                    if len(pdf_content) > 5 * 1024 * 1024:
                        Actor.log.warning(f"⚠️ Skipping large PDF after download")
                        return { **pdf_info, 'status': 'skipped_large' }

                    # Parse PDF
                    parsed_data = self.parse_pdf_content(pdf_content)

                    del pdf_content
                    gc.collect()

                    return {
                        **pdf_info,
                        **parsed_data,
                        'status': 'success'
                    }
                else:
                    Actor.log.warning(f"⚠️ Failed to download: Status {response.status}")
                    return {
                        **pdf_info,
                        'status': 'failed',
                        'error': f'HTTP {response.status}'
                    }

        except Exception as e:
            Actor.log.error(f"❌ Error processing PDF: {str(e)}")
            return {
                **pdf_info,
                'status': 'error',
                'error': str(e)
            }

    def parse_pdf_content(self, pdf_bytes: bytes):
        """Parse PDF and extract text with pdfplumber for tables"""
        try:
            try:
                import pdfplumber
                return self._parse_with_pdfplumber(pdf_bytes)
            except ImportError:
                Actor.log.warning("⚠️ pdfplumber not available, using PyPDF2")
                return self._parse_with_pypdf2(pdf_bytes)

        except Exception as e:
            Actor.log.error(f"❌ Error parsing PDF: {str(e)}")
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
                    page_tables = []
                    try:
                        tables = page.extract_tables()
                        for table_idx, table in enumerate(tables):
                            if table and len(table) > 0:
                                table_data = {
                                    'page': page_num,
                                    'table_index': table_idx + 1,
                                    'rows': len(table),
                                    'cols': len(table[0]) if table else 0,
                                }
                                page_tables.append(table_data)
                                all_tables.append(table_data)
                    except Exception:
                        pass

                    pages_data.append({
                        'page_number': page_num,
                        'text': text.strip(),
                        'tables': page_tables,
                        'table_count': len(page_tables)
                    })

                except Exception as e:
                    Actor.log.warning(f"⚠️ Error extracting page {page_num}: {str(e)}")

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
                Actor.log.warning(f"⚠️ Error extracting page {page_num}: {str(e)}")

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
        Actor.log.info('🚀 Nantucket PDF Crawler with PLAYWRIGHT starting...')

        # Get input
        actor_input = await Actor.get_input() or {}
        Actor.log.info(f"📥 Input keys: {list(actor_input.keys())}")

        # Normalize input
        start_urls_input = actor_input.get('startUrls')
        if not start_urls_input:
            if 'startUrl' in actor_input and actor_input.get('startUrl'):
                start_urls_input = [{ 'url': actor_input.get('startUrl') }]
            elif 'url' in actor_input and actor_input.get('url'):
                start_urls_input = [{ 'url': actor_input.get('url') }]
            else:
                start_urls_input = [{ 'url': 'https://www.nantucket-ma.gov/2091/Annual-Town-Meeting' }]

        start_urls = []
        for url_item in start_urls_input:
            if isinstance(url_item, dict):
                start_urls.append(url_item.get('url'))
            else:
                start_urls.append(str(url_item))

        max_pages = actor_input.get('maxRequests') or actor_input.get('maxPages') or 10
        download_pdfs = actor_input.get('downloadPdfs', True)
        max_depth = actor_input.get('maxCrawlDepth') or actor_input.get('maxDepth') or 2

        Actor.log.info(f"🎯 Start URLs: {start_urls}")
        Actor.log.info(f"📊 max_pages={max_pages}, max_depth={max_depth}, download_pdfs={download_pdfs}")

        openai_api_key = actor_input.get('openaiApiKey') or os.environ.get('OPENAI_API_KEY')

        crawler_instance = NantucketPDFCrawler(openai_api_key=openai_api_key)

        # ⭐ FIX: USE PLAYWRIGHT FOR BROWSER RENDERING ⭐
        async with async_playwright() as p:
            Actor.log.info('🌐 Launching Playwright browser...')
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            )
            page = await context.new_page()

            # Also keep aiohttp session for PDF downloads
            async with aiohttp.ClientSession(headers={
                'User-Agent': 'Mozilla/5.0 (compatible; AckindexBot/1.0; +https://ackindex.com)'
            }) as session:

                urls_to_visit = start_urls.copy()
                pages_crawled = 0

                while urls_to_visit and pages_crawled < max_pages:
                    url = urls_to_visit.pop(0)

                    if url in crawler_instance.visited_urls:
                        continue

                    if url.lower().endswith('.pdf') or '/DocumentCenter/View/' in url:
                        Actor.log.info(f'⏭️ Skipping direct PDF URL: {url}')
                        continue

                    crawler_instance.visited_urls.add(url)
                    pages_crawled += 1

                    try:
                        Actor.log.info(f'📄 Processing ({pages_crawled}/{max_pages}): {url}')

                        # ⭐ FIX: Use Playwright to navigate and render JavaScript ⭐
                        try:
                            await page.goto(url, wait_until='networkidle', timeout=60000)
                        except Exception as e:
                            # If networkidle times out, try with domcontentloaded
                            Actor.log.warning(f'⚠️ Networkidle timeout, trying domcontentloaded: {str(e)}')
                            await page.goto(url, wait_until='domcontentloaded', timeout=30000)

                        Actor.log.info('✅ Page loaded with Playwright')

                        # Wait for any dynamic content
                        await page.wait_for_timeout(3000)

                        # Get rendered HTML
                        html = await page.content()
                        Actor.log.info(f'📄 HTML length: {len(html)} bytes')

                        # Get page title
                        page_title = await page.title()
                        Actor.log.info(f'📌 Page title: {page_title}')

                        # Extract PDF links
                        pdf_links = await crawler_instance.extract_pdf_links(html, url)
                        Actor.log.info(f'🔗 Found {len(pdf_links)} PDF(s) on {url}')

                        # Process PDFs - limit to 2 per page for ultra-low memory (1GB tier)
                        if download_pdfs and pdf_links:
                            Actor.log.info(f'📥 Processing {min(2, len(pdf_links))} PDFs (out of {len(pdf_links)} found)')
                            for pdf_info in pdf_links[:2]:
                                result = await crawler_instance.download_and_parse_pdf(session, pdf_info)
                                await Actor.push_data(result)
                                del result
                                gc.collect()
                                # Brief pause to allow garbage collection
                                await asyncio.sleep(0.1)
                        elif pdf_links:
                            for pdf_info in pdf_links:
                                await Actor.push_data(pdf_info)

                        # Extract text content using BeautifulSoup
                        soup = BeautifulSoup(html, 'html.parser')

                        # Remove unwanted elements
                        for element in soup(["script", "style", "nav", "header", "footer", "iframe", "noscript"]):
                            element.decompose()

                        for element in soup.find_all(class_=re.compile(r'(ad|advertisement|tracking|social-share)', re.I)):
                            element.decompose()

                        # Find main content
                        main_content = None
                        # CivicEngage-specific selectors first, then generic ones
                        for selector in ['.fr-view', '#PageContent', '.PageContent', '.module', '#panel',
                                        'article', 'main', '[role="main"]', '.content', '.main-content', '#content', '#main']:
                            main_content = soup.select_one(selector)
                            if main_content:
                                Actor.log.info(f'📍 Found main content: {selector}')
                                break

                        content_element = main_content if main_content else soup.body if soup.body else soup
                        page_text = content_element.get_text(separator='\n', strip=True)

                        # Clean whitespace
                        lines = (line.strip() for line in page_text.splitlines())
                        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                        page_text = '\n'.join(chunk for chunk in chunks if chunk)

                        Actor.log.info(f'📝 Extracted text: {len(page_text)} chars')

                        # AI enhancement if available
                        if openai_api_key and len(page_text) > 100:
                            final_text = crawler_instance.ai_extract_content(page_text, page_title)
                        else:
                            final_text = page_text

                        # Save page data
                        await Actor.push_data({
                            'url': url,
                            'type': 'page',
                            'title': page_title,
                            'text': final_text,
                            'text_length': len(final_text),
                            'pdf_count': len(pdf_links),
                            'tables': [],
                            'ai_processed': bool(openai_api_key and len(page_text) > 100),
                            'scraped_at': datetime.now().isoformat()
                        })

                        Actor.log.info('✅ Saved page data')

                        # Extract more links
                        if pages_crawled < max_pages and max_depth > 0:
                            page_links = await crawler_instance.extract_page_links(html, url, start_urls[0])
                            urls_to_visit.extend(page_links[:max_pages - pages_crawled])

                        # Clean up memory after processing each page
                        del html, soup, page_text, final_text
                        gc.collect()

                    except Exception as e:
                        Actor.log.error(f'❌ Error processing {url}: {str(e)}')
                        await Actor.push_data({
                            'type': 'error',
                            'url': url,
                            'error': str(e),
                            'scraped_at': datetime.now().isoformat()
                        })

            await browser.close()
            Actor.log.info('✅ Browser closed')

        Actor.log.info(f'🎉 Crawling finished! Processed {pages_crawled} pages.')


if __name__ == '__main__':
    asyncio.run(main())
