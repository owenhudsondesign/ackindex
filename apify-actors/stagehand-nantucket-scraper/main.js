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
  
  // Extract base domain to prevent going to parent/different sites
  const startDomain = new URL(startUrl).hostname;

  // Special handling for CivicClerk portals - allow following to associated government domain
  const allowedDomains = [startDomain];
  if (startDomain.includes('civicclerk.com')) {
    // Extract government domain from CivicClerk subdomain
    // e.g., "nantucketma.portal.civicclerk.com" -> "nantucket-ma.gov"
    const match = startDomain.match(/^([^.]+)\.portal\.civicclerk\.com$/);
    if (match) {
      const govSlug = match[1]; // "nantucketma"
      // Convert to government domain format
      // Handle patterns like "nantucketma" -> "nantucket-ma"
      let govName = govSlug;
      // Add hyphen before state abbreviation if it's 2 letters at the end
      if (govSlug.length > 2 && govSlug.slice(-2).match(/[a-z]{2}/)) {
        govName = govSlug.slice(0, -2) + '-' + govSlug.slice(-2);
      }
      const govDomain = govName.toLowerCase() + '.gov';
      allowedDomains.push(`www.${govDomain}`);
      allowedDomains.push(govDomain);
      console.log(`🔓 CivicClerk portal detected - also allowing: ${govDomain}`);
    }
  }

  console.log(`🔒 Restricting crawl to domains: ${allowedDomains.join(', ')}`);

  try {
    while (queue.length > 0 && pagesProcessed < maxPages) {
      const { url, depth } = queue.shift();

      // Skip if already visited or too deep
      if (visited.has(url) || depth > maxDepth) {
        continue;
      }
      
      // Skip URLs that go to a different domain (prevents going backwards to parent sites)
      try {
        const urlDomain = new URL(url).hostname;
        if (!allowedDomains.includes(urlDomain)) {
          console.log(`⏭️ Skipping ${url} (domain ${urlDomain} not in allowed list)`);
          continue;
        }
      } catch (e) {
        console.log(`⚠️ Invalid URL: ${url}`);
        continue;
      }

      visited.add(url);
      console.log(`📄 Processing (${pagesProcessed + 1}/${maxPages}): ${url}`);

      try {
        // Navigate to page with timeout
        await stagehand.page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 20000 // 20 second timeout
        });

        // Special handling for CivicClerk portals - bi-directional infinite scroll
        if (url.includes('civicclerk.com')) {
          console.log('🗓️ CivicClerk portal detected - scrolling to load all meetings...');
          try {
            const maxScrollAttempts = 50; // Allow more scrolls for historical data
            let scrollAttempts = 0;

            // Step 1: Scroll DOWN to load future meetings (usually ~1 week)
            console.log('⬇️ Phase 1: Scrolling down to load future meetings...');
            let previousHeight = 0;
            let currentHeight = await stagehand.page.evaluate(() => document.body.scrollHeight);

            while (previousHeight !== currentHeight && scrollAttempts < 10) {
              previousHeight = currentHeight;
              await stagehand.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
              console.log(`📜 Down scroll ${scrollAttempts + 1}: ${currentHeight}px`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              currentHeight = await stagehand.page.evaluate(() => document.body.scrollHeight);
              scrollAttempts++;
            }
            console.log(`✅ Loaded ${scrollAttempts} future meeting pages`);

            // Step 2: Scroll back to top
            await stagehand.page.evaluate(() => window.scrollTo(0, 0));
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('⬆️ Phase 2: Scrolling up to load historical meetings...');

            // Step 3: Scroll UP to load historical meetings (can go back years)
            // On CivicClerk, scrolling to top (y=0) triggers loading of older meetings
            scrollAttempts = 0;
            let previousMeetingCount = 0;
            let noChangeCount = 0; // Track consecutive times with no change
            let currentMeetingCount = await stagehand.page.evaluate(() => {
              // Count meeting items in the DOM
              const items = document.querySelectorAll('[class*="event"], [class*="meeting"], [data-testid*="event"]');
              return items.length;
            });

            while (scrollAttempts < maxScrollAttempts) {
              // Scroll to top to trigger loading older content
              await stagehand.page.evaluate(() => window.scrollTo(0, 0));
              await new Promise(resolve => setTimeout(resolve, 3000)); // Longer wait for loading

              // Check if new meetings loaded
              currentMeetingCount = await stagehand.page.evaluate(() => {
                const items = document.querySelectorAll('[class*="event"], [class*="meeting"], [data-testid*="event"]');
                return items.length;
              });

              console.log(`📜 Up scroll ${scrollAttempts + 1}: ${currentMeetingCount} meetings loaded`);

              // Stop only after 5 consecutive attempts with no new meetings
              if (currentMeetingCount === previousMeetingCount) {
                noChangeCount++;
                if (noChangeCount >= 5) {
                  console.log(`⏹️ No new meetings loaded after ${noChangeCount} attempts, stopping...`);
                  break;
                }
              } else {
                noChangeCount = 0; // Reset counter when new meetings are found
              }

              previousMeetingCount = currentMeetingCount;
              scrollAttempts++;
            }

            console.log(`✅ Finished loading ${currentMeetingCount} total meetings (${scrollAttempts} scroll attempts)`);

            // Scroll to middle for extraction
            await stagehand.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight / 2);
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (scrollError) {
            console.log('⚠️ Scroll action failed, continuing anyway:', scrollError.message);
          }
        }

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
          console.log(`📑 Processing ${pageData.pdfLinks.length} PDFs...`);
          for (const pdfUrl of pageData.pdfLinks) { // Process all PDFs
            try {
              // Convert relative URLs to absolute URLs
              const absolutePdfUrl = new URL(pdfUrl, url).href;
              console.log(`📥 Downloading PDF: ${absolutePdfUrl}`);

              const response = await fetch(absolutePdfUrl);
              if (!response.ok) {
                console.log(`⚠️ Failed to download PDF: ${response.status}`);
                continue;
              }

              const buffer = await response.arrayBuffer();
              const pdfData = await pdfParse(Buffer.from(buffer));

              const pdfText = cleanText(pdfData.text);

              await Actor.pushData({
                type: 'pdf',
                url: absolutePdfUrl,
                source_page: url,
                title: absolutePdfUrl.split('/').pop() || 'document.pdf',
                full_text: pdfText,
                num_pages: pdfData.numpages,
                text_length: pdfText.length,
                status: 'success',
                parser: 'pdf-parse',
                scraped_at: new Date().toISOString(),
              });

              console.log(`✅ Extracted PDF: ${pdfData.numpages} pages, ${pdfText.length} chars`);
            } catch (pdfError) {
              console.log(`⚠️ Failed to process PDF ${pdfUrl} (${pdfError.message})`);
            }
          }
        }

        // Find links for crawling (if not at max depth)
        if (depth < maxDepth) {
          // Customize instruction based on page type
          const linkInstruction = url.includes('civicclerk.com')
            ? 'Find ALL links to specific meetings, agendas, minutes, and documents. Look for calendar events, meeting dates, committee names, and document links. Include links that go to www.nantucket-ma.gov for meeting details. DO NOT include navigation, login, or help links.'
            : 'Find links to meeting pages, agendas, agenda packets, and documents. DO NOT include navigation menus, breadcrumbs, or links to parent/home pages. Only return links that go deeper into meeting content or documents.';

          const links = await stagehand.page.extract({
            instruction: linkInstruction,
            schema: z.object({
              links: z.array(z.string()).describe('Array of absolute URLs to meetings, agendas, and documents')
            })
          });

          if (links.links && Array.isArray(links.links)) {
            console.log(`🔗 Found ${links.links.length} potential links to follow`);
            for (const link of links.links) {
              try {
                const linkUrl = new URL(link, url).href;
                const linkDomain = new URL(linkUrl).hostname;
                
                // Only queue links within allowed domains
                if (!visited.has(linkUrl) && linkUrl.startsWith('http') && allowedDomains.includes(linkDomain)) {
                  console.log(`➕ Queuing: ${linkUrl}`);
                  queue.push({ url: linkUrl, depth: depth + 1 });
                } else if (!allowedDomains.includes(linkDomain)) {
                  console.log(`⏭️ Skipping external link: ${linkUrl} (domain ${linkDomain} not allowed)`);
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

