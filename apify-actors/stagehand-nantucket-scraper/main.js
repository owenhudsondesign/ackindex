import { Actor } from 'apify';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import pdfParse from 'pdf-parse';

// Helper to clean extracted text
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Main actor logic
await Actor.main(async () => {
  const input = await Actor.getInput();
  
  if (!input) {
    throw new Error('Input is required');
  }
  
  const {
    startUrl,
    maxPages = 20,
    maxDepth = 2,
    extractPDFs = true,
    openaiApiKey,
  } = input;

  if (!openaiApiKey) {
    throw new Error('OpenAI API key is required');
  }

  console.log('🚀 Starting Stagehand AI scraper...');
  console.log(`📍 Start URL: ${startUrl}`);
  console.log(`📊 Max pages: ${maxPages}, Max depth: ${maxDepth}`);

  // Set OpenAI API key as environment variable (required by Stagehand)
  process.env.OPENAI_API_KEY = openaiApiKey;

  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: 'LOCAL', // Use local Playwright in Docker
    verbose: 1,
    headless: true, // Run in headless mode for Docker
  });

  await stagehand.init();
  console.log('✅ Stagehand initialized');

  // Track visited URLs and depth
  const visited = new Set();
  const queue = [{ url: startUrl, depth: 0 }];
  let pagesProcessed = 0;

  try {
    while (queue.length > 0 && pagesProcessed < maxPages) {
      const { url, depth } = queue.shift();

      // Skip if already visited or too deep
      if (visited.has(url) || depth > maxDepth) {
        continue;
      }

      visited.add(url);
      console.log(`📄 Processing (${pagesProcessed + 1}/${maxPages}): ${url}`);

      try {
        // Navigate to page
        await stagehand.page.goto(url, { waitUntil: 'networkidle' });
        
        // Extract page content using AI
        const pageData = await stagehand.page.extract({
          instruction: 'Extract the main title, all body text content, and find all PDF links. Return clean, readable text without navigation menus or boilerplate.',
          schema: z.object({
            title: z.string().describe('The main page title'),
            text: z.string().describe('All readable body text content'),
            pdfLinks: z.array(z.string()).describe('Array of URLs to PDF files found on the page')
          })
        });

        const cleanedText = cleanText(pageData.text);
        
        // Save page data
        await Actor.pushData({
          type: 'page',
          url,
          title: pageData.title || '',
          text: cleanedText,
          text_length: cleanedText.length,
          pdf_count: pageData.pdfLinks?.length || 0,
          scraped_at: new Date().toISOString(),
        });

        console.log(`✅ Extracted ${cleanedText.length} chars, found ${pageData.pdfLinks?.length || 0} PDFs`);

        // Process PDFs if enabled
        if (extractPDFs && pageData.pdfLinks && pageData.pdfLinks.length > 0) {
          for (const pdfUrl of pageData.pdfLinks.slice(0, 5)) { // Limit to 5 PDFs per page
            try {
              console.log(`📥 Downloading PDF: ${pdfUrl}`);
              
              const response = await fetch(pdfUrl);
              if (!response.ok) {
                console.log(`⚠️ Failed to download PDF: ${response.status}`);
                continue;
              }

              const buffer = await response.arrayBuffer();
              const pdfData = await pdfParse(Buffer.from(buffer));

              const pdfText = cleanText(pdfData.text);

              await Actor.pushData({
                type: 'pdf',
                url: pdfUrl,
                source_page: url,
                title: pdfUrl.split('/').pop() || 'document.pdf',
                full_text: pdfText,
                num_pages: pdfData.numpages,
                text_length: pdfText.length,
                status: 'success',
                parser: 'pdf-parse',
                scraped_at: new Date().toISOString(),
              });

              console.log(`✅ Extracted PDF: ${pdfData.numpages} pages, ${pdfText.length} chars`);
            } catch (pdfError) {
              console.log(`⚠️ Failed to process PDF ${pdfUrl}:`, pdfError.message);
            }
          }
        }

        // Find links for crawling (if not at max depth)
        if (depth < maxDepth) {
          const links = await stagehand.page.extract({
            instruction: 'Find all navigation links and document links on this page that are relevant to the main content. Return absolute URLs only.',
            schema: z.object({
              links: z.array(z.string()).describe('Array of absolute URLs found on the page')
            })
          });

          if (links.links && Array.isArray(links.links)) {
            for (const link of links.links) {
              try {
                const linkUrl = new URL(link, url).href;
                if (!visited.has(linkUrl) && linkUrl.startsWith('http')) {
                  queue.push({ url: linkUrl, depth: depth + 1 });
                }
              } catch (e) {
                // Invalid URL, skip
              }
            }
          }
        }

        pagesProcessed++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (pageError) {
        console.log(`⚠️ Error processing ${url}:`, pageError.message);
      }
    }

    console.log(`🎉 Scraping finished! Processed ${pagesProcessed} pages.`);
  } finally {
    await stagehand.close();
    console.log('✅ Stagehand closed');
  }
});

