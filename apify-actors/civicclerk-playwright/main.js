import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

try {
  const input = (await Actor.getInput()) || {};
  const portalUrl = input.portalUrl || 'https://nantucketma.portal.civicclerk.com/';
  const maxEvents = input.maxEvents || 50;

  const browser = await chromium.launch({ args: ['--no-sandbox'], headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const discovered = new Set();

  await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle');

  // Collect event links from the landing page
  const collectEventLinks = async () => {
    const links = await page.$$eval('a[href*="/event/"]', as => as.map(a => a.href));
    return Array.from(new Set(links)).slice(0, maxEvents);
  };

  const eventLinks = await collectEventLinks();

  // Helper to push dataset entries
  const pushPdf = async (fromUrl, pdfUrl, title) => {
    if (!pdfUrl || discovered.has(pdfUrl)) return;
    discovered.add(pdfUrl);
    await Actor.pushData({
      type: 'pdf',
      source_page: fromUrl,
      url: pdfUrl,
      title: title || pdfUrl.split('/').pop() || 'Document',
      scraped_at: new Date().toISOString(),
    });
  };

  for (const ev of eventLinks) {
    try {
      const filesUrl = ev.endsWith('/files') ? ev : ev.replace(/\/?$/, '/files');
      await page.goto(filesUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle');

      // Grab anchors first
      const anchors = await page.$$eval('a[href]', as => as.map(a => ({ href: a.getAttribute('href') || '', text: (a.textContent||'').trim() })));
      for (const a of anchors) {
        const abs = new URL(a.href, filesUrl).href;
        if (/\.pdf(\?|#|$)/i.test(abs) || /download/i.test(abs) || /(agenda|minutes)/i.test(a.text)) {
          await pushPdf(filesUrl, abs, a.text);
        }
      }

      // Click any menus then look again
      const menuButtons = await page.$$('button, [role="button"], a');
      for (const b of menuButtons.slice(0, 10)) {
        const label = (await b.getAttribute('aria-label')) || (await b.getAttribute('title')) || '';
        if (/more|action|menu|ellipsis|download/i.test(label)) {
          await b.click({ noWaitAfter: true }).catch(()=>{});
        }
      }
      await page.waitForTimeout(600);
      const anchors2 = await page.$$eval('a[href]', as => as.map(a => ({ href: a.getAttribute('href') || '', text: (a.textContent||'').trim() })));
      for (const a of anchors2) {
        const abs = new URL(a.href, filesUrl).href;
        if (/\.pdf(\?|#|$)/i.test(abs) || /download/i.test(abs) || /(agenda|minutes)/i.test(a.text)) {
          await pushPdf(filesUrl, abs, a.text);
        }
      }

      // Parse scripts for JSON urls/ids
      const scriptText = await page.$$eval('script', ss => ss.map(s => s.textContent || '').join('\n'));
      const urlMatches = scriptText.match(/https?:[^"'\s]+\.(?:pdf)(?:[^"'\s]*)/gi) || [];
      for (const u of urlMatches) await pushPdf(filesUrl, u);
      const idMatches = scriptText.match(/"(?:id|fileId|documentId)"\s*:\s*"?([A-Za-z0-9\-]+)"?/gi) || [];
      for (const m of idMatches) {
        const id = (m.match(/"(?:id|fileId|documentId)"\s*:\s*"?([A-Za-z0-9\-]+)"?/)||[])[1];
        if (id) {
          await pushPdf(filesUrl, new URL(`/download?id=${id}`, filesUrl).href);
          await pushPdf(filesUrl, new URL(`/Document/Download?Id=${id}`, filesUrl).href);
          await pushPdf(filesUrl, new URL(`/api/document/${id}/download`, filesUrl).href);
        }
      }
    } catch (e) {
      await Actor.pushData({ type: 'error', url: ev, error: String(e) });
    }
  }

  await browser.close();
} catch (e) {
  console.error('Actor failed:', e);
  throw e;
} finally {
  await Actor.exit();
}


