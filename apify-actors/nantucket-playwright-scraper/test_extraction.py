"""
Local Test Script - Verify Playwright Extraction Works
Run this BEFORE deploying to Apify to confirm the fix works
"""

import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re

async def test_extraction(url: str):
    """Test that we can extract content and PDFs from a URL"""
    
    print(f"\n{'='*70}")
    print(f"🧪 Testing URL: {url}")
    print('='*70)
    
    async with async_playwright() as p:
        print('\n🌐 Launching browser...')
        browser = await p.chromium.launch(headless=False)  # Set False to see it work
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        page = await context.new_page()
        
        print(f'📄 Navigating to {url}...')
        await page.goto(url, wait_until='networkidle', timeout=45000)
        print('✅ Page loaded!')
        
        # Wait a bit for dynamic content
        await page.wait_for_timeout(2000)
        
        # Get page info
        title = await page.title()
        html = await page.content()
        
        print(f'\n📊 Page Statistics:')
        print(f'   Title: {title}')
        print(f'   HTML length: {len(html):,} bytes')
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find PDF links
        pdf_links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            is_pdf = (href.lower().endswith('.pdf') or 
                     '/DocumentCenter/View/' in href or
                     '/document/' in href.lower())
            
            if is_pdf:
                absolute_url = urljoin(url, href)
                link_text = link.get_text(strip=True)
                pdf_links.append({
                    'url': absolute_url,
                    'text': link_text
                })
        
        print(f'\n🔗 PDF Links Found: {len(pdf_links)}')
        for i, pdf in enumerate(pdf_links[:10], 1):  # Show first 10
            print(f'   {i}. {pdf["text"][:50]}...')
            print(f'      {pdf["url"]}')
        
        # Extract main content
        for element in soup(["script", "style", "nav", "header", "footer"]):
            element.decompose()
        
        # Find main content area
        main_content = None
        for selector in ['article', 'main', '[role="main"]', '.content', '#content']:
            main_content = soup.select_one(selector)
            if main_content:
                print(f'\n📍 Found main content using: {selector}')
                break
        
        content_element = main_content if main_content else soup.body
        text = content_element.get_text(separator='\n', strip=True) if content_element else ''
        
        # Clean text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)
        
        print(f'\n📝 Extracted Text:')
        print(f'   Length: {len(clean_text):,} characters')
        print(f'   Lines: {len(clean_text.splitlines())} lines')
        print(f'\n   First 500 characters:')
        print('   ' + '-'*50)
        print('   ' + clean_text[:500].replace('\n', '\n   '))
        print('   ' + '-'*50)
        
        # Verdict
        print(f'\n{"="*70}')
        print('🎯 VERDICT:')
        
        if len(clean_text) < 100:
            print('❌ FAILED: Very little text extracted')
            print('   This means the page likely needs JavaScript rendering')
        elif len(pdf_links) == 0:
            print('⚠️  WARNING: No PDF links found')
            print('   The page might not have PDFs, or they\'re in a different format')
        else:
            print('✅ SUCCESS: Page extraction working!')
            print(f'   - Extracted {len(clean_text):,} characters of text')
            print(f'   - Found {len(pdf_links)} PDF links')
            print('   Ready to deploy!')
        
        print('='*70 + '\n')
        
        await browser.close()


async def test_multiple_urls():
    """Test multiple Nantucket URLs"""
    
    test_urls = [
        'https://www.nantucket-ma.gov/2091/Annual-Town-Meeting',
        'https://www.nantucket-ma.gov/1183/Planning-Board',
        'https://www.nantucket-ma.gov/DocumentCenter',
    ]
    
    print('\n' + '='*70)
    print('🧪 PLAYWRIGHT EXTRACTION TEST SUITE')
    print('='*70)
    print('\nThis will test if Playwright can extract content from Nantucket')
    print('government pages. You should see:')
    print('  ✅ Browser launches')
    print('  ✅ Page loads with full HTML')
    print('  ✅ PDF links found')
    print('  ✅ Text content extracted')
    print('\nStarting tests in 3 seconds...\n')
    
    await asyncio.sleep(3)
    
    for url in test_urls:
        try:
            await test_extraction(url)
            await asyncio.sleep(2)  # Pause between tests
        except Exception as e:
            print(f'\n❌ Error testing {url}:')
            print(f'   {str(e)}\n')


if __name__ == '__main__':
    print('\n' + '='*70)
    print('TESTING PLAYWRIGHT EXTRACTION - BEFORE DEPLOYING')
    print('='*70)
    print('\nThis script will:')
    print('1. Launch a browser using Playwright')
    print('2. Navigate to Nantucket government pages')
    print('3. Extract text content and PDF links')
    print('4. Verify the extraction is working')
    print('\nIf you see "SUCCESS" for each URL, the fix works!')
    print('='*70 + '\n')
    
    try:
        asyncio.run(test_multiple_urls())
        
        print('\n' + '='*70)
        print('🎉 ALL TESTS COMPLETE')
        print('='*70)
        print('\nNext steps:')
        print('1. If tests passed: Deploy main_fixed.py to Apify')
        print('2. If tests failed: Check error messages above')
        print('3. If Playwright not installed: pip install playwright && playwright install chromium')
        print('='*70 + '\n')
        
    except Exception as e:
        print(f'\n❌ Test suite failed: {str(e)}')
        print('\nCommon issues:')
        print('  • Playwright not installed: pip install playwright')
        print('  • Chromium not installed: playwright install chromium')
        print('  • Network issue: Check internet connection')
        print('  • Site blocking: Try different URL\n')
