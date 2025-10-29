import { Actor } from 'apify';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import pdfParse from 'pdf-parse';

await Actor.init();

try {
    // Get input from Apify
    const input = await Actor.getInput() || {};
    const {
        startUrl,
        maxPages = 10,
        maxDepth = 2,
        extractPDFs = true,
        openaiApiKey = process.env.OPENAI_API_KEY, // Fall back to env var
    } = input;

    if (!openaiApiKey) {
        throw new Error('OpenAI API key is required for Stagehand. Please provide it in the input or set OPENAI_API_KEY environment variable.');
    }

    console.log('🚀 Starting Stagehand Nantucket scraper...');
    console.log(`📍 Start URL: ${startUrl}`);
    console.log(`📄 Max pages: ${maxPages}, Max depth: ${maxDepth}`);
    console.log(`📋 Extract PDFs: ${extractPDFs}`);

    // Initialize Stagehand with OpenAI
    const stagehand = new Stagehand({
        env: 'LOCAL', // Use LOCAL when running in Apify
        verbose: 1,
        debugDom: true,
        enableCaching: false, // Disable caching for fresh data
        apiKey: openaiApiKey,
    });

    await stagehand.init();
    const page = stagehand.page;

    // Track visited URLs and pages to crawl
    const visited = new Set();
    const toVisit = [{ url: startUrl, depth: 0 }];
    let pagesProcessed = 0;

    // Process URLs in breadth-first order
    while (toVisit.length > 0 && pagesProcessed < maxPages) {
        const { url, depth } = toVisit.shift();

        // Skip if already visited or too deep
        if (visited.has(url) || depth > maxDepth) {
            continue;
        }

        visited.add(url);
        pagesProcessed++;

        console.log(`\n📄 [${pagesProcessed}/${maxPages}] Processing: ${url} (depth: ${depth})`);

        try {
            // Navigate to page
            await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });

            // Wait a bit for dynamic content
            await page.waitForTimeout(2000);

            console.log('✅ Page loaded successfully');

            // Use Stagehand's AI to extract page content and find PDF links
            const pageData = await page.extract({
                instruction: `
                    Extract the following information from this page:
                    1. The main page title
                    2. All meaningful text content (skip navigation, headers, footers, ads)
                    3. All PDF document links with their link text
                    4. All relevant page links that might contain more PDFs or information
                    
                    Focus on government documents, meeting minutes, reports, and official content.
                `,
                schema: z.object({
                    title: z.string().describe('The main title or heading of the page'),
                    content: z.string().describe('The main text content of the page, cleaned and formatted'),
                    pdfLinks: z.array(z.object({
                        url: z.string().describe('The URL of the PDF document'),
                        linkText: z.string().describe('The text of the link or document title'),
                    })).describe('All PDF document links found on the page'),
                    pageLinks: z.array(z.object({
                        url: z.string().describe('URL of a relevant page to explore'),
                        linkText: z.string().describe('The link text'),
                    })).describe('Links to other relevant pages (not PDFs)'),
                }),
            });

            console.log(`📝 Extracted: ${pageData.title}`);
            console.log(`📄 Content length: ${pageData.content?.length || 0} characters`);
            console.log(`📎 Found ${pageData.pdfLinks?.length || 0} PDF links`);
            console.log(`🔗 Found ${pageData.pageLinks?.length || 0} page links`);

            // Save page data to dataset
            if (pageData.content && pageData.content.length > 100) {
                await Actor.pushData({
                    type: 'page',
                    url,
                    title: pageData.title || 'Untitled',
                    text: pageData.content,
                    text_length: pageData.content.length,
                    pdf_count: pageData.pdfLinks?.length || 0,
                    scraped_at: new Date().toISOString(),
                    depth,
                });
                console.log('✅ Saved page data to dataset');
            }

            // Process PDF links
            if (extractPDFs && pageData.pdfLinks && pageData.pdfLinks.length > 0) {
                for (const pdfLink of pageData.pdfLinks) {
                    try {
                        // Make URL absolute
                        const pdfUrl = new URL(pdfLink.url, url).href;
                        
                        console.log(`📥 Downloading PDF: ${pdfLink.linkText}`);
                        
                        // Download PDF
                        const response = await page.context().request.get(pdfUrl, {
                            timeout: 30000,
                        });

                        if (response.ok()) {
                            const pdfBuffer = await response.body();
                            
                            // Parse PDF
                            const pdfData = await pdfParse(pdfBuffer);
                            
                            console.log(`✅ Parsed PDF: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);

                            // Save PDF data to dataset
                            await Actor.pushData({
                                type: 'pdf',
                                url: pdfUrl,
                                source_page: url,
                                title: pdfLink.linkText || 'Untitled Document',
                                status: 'success',
                                full_text: pdfData.text,
                                text_length: pdfData.text.length,
                                num_pages: pdfData.numpages,
                                metadata: pdfData.info || {},
                                tables: [], // We don't extract tables with pdf-parse, but keep field for compatibility
                                total_tables: 0,
                                parser: 'pdf-parse',
                                scraped_at: new Date().toISOString(),
                            });
                            console.log('✅ Saved PDF data to dataset');
                        } else {
                            console.warn(`⚠️ Failed to download PDF: ${response.status()}`);
                        }
                    } catch (pdfError) {
                        console.error(`❌ Error processing PDF ${pdfLink.url}:`, pdfError.message);
                    }
                }
            }

            // Add new page links to crawl queue (if within depth limit)
            if (depth < maxDepth && pageData.pageLinks && pageData.pageLinks.length > 0) {
                for (const link of pageData.pageLinks.slice(0, 5)) { // Limit to 5 links per page
                    try {
                        const absoluteUrl = new URL(link.url, url).href;
                        
                        // Only follow links to the same domain
                        const startDomain = new URL(startUrl).hostname;
                        const linkDomain = new URL(absoluteUrl).hostname;
                        
                        if (linkDomain === startDomain && !visited.has(absoluteUrl)) {
                            toVisit.push({ url: absoluteUrl, depth: depth + 1 });
                            console.log(`➕ Added to queue: ${link.linkText}`);
                        }
                    } catch (urlError) {
                        // Skip invalid URLs
                        console.warn(`⚠️ Invalid URL: ${link.url}`);
                    }
                }
            }

        } catch (pageError) {
            console.error(`❌ Error processing ${url}:`, pageError.message);
            
            // Save error to dataset for debugging
            await Actor.pushData({
                type: 'error',
                url,
                error: pageError.message,
                scraped_at: new Date().toISOString(),
            });
        }
    }

    await stagehand.close();
    
    console.log('\n✨ Scraping completed!');
    console.log(`📊 Total pages processed: ${pagesProcessed}`);
    console.log(`📊 Total URLs visited: ${visited.size}`);
    
} catch (error) {
    console.error('💥 Fatal error during scraping:', error);
    throw error;
}

await Actor.exit();

