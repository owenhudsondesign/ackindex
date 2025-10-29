import { Actor } from 'apify';
import axios from 'axios';
import { Builder, By, until } from 'selenium-webdriver';

await Actor.init();

try {
  const input = (await Actor.getInput()) || {};
  const portalUrl = input.portalUrl || 'https://nantucketma.portal.civicclerk.com/';
  const maxEvents = input.maxEvents || 20;
  const bbKey = input.browserbaseApiKey || process.env.BROWSERBASE_API_KEY;
  const bbProject = input.browserbaseProjectId || process.env.BROWSERBASE_PROJECT_ID;
  if (!bbKey || !bbProject) throw new Error('Missing Browserbase credentials');

  const session = await axios.post('https://api.browserbase.com/v1/sessions', { projectId: bbProject }, {
    headers: { 'x-bb-api-key': bbKey, 'content-type': 'application/json' },
  });
  const { seleniumRemoteUrl, id: sessionId } = session.data;
  console.log(`[Browserbase] Session: ${sessionId}`);

  const driver = await new Builder().forBrowser('chrome').usingServer(seleniumRemoteUrl).build();

  const startUrl = /\/events/i.test(portalUrl) ? portalUrl : new URL('/events', portalUrl).href;
  await driver.get(startUrl);
  await driver.wait(until.elementLocated(By.css('body')),{ timeout: 30000 });
  await Actor.sleep(3000);

  const getEventLinks = async () => {
    const as = await driver.findElements(By.css('a[href*="/event/"]'));
    const hrefs = [];
    for (const a of as) {
      const h = await a.getAttribute('href');
      if (h) hrefs.push(h);
      if (hrefs.length >= maxEvents) break;
    }
    return Array.from(new Set(hrefs));
  };

  let events = await getEventLinks();
  console.log(`[Actor] Detected ${events.length} event links`);
  if (events.length === 0) {
    await Actor.pushData({ type: 'page', url: startUrl, note: 'No events detected', scraped_at: new Date().toISOString() });
  }

  const pushPdf = async (fromUrl, url, title) => {
    if (!url) return;
    await Actor.pushData({ type: 'pdf', source_page: fromUrl, url, title: title || url.split('/').pop() || 'Document', scraped_at: new Date().toISOString() });
  };

  for (const ev of events) {
    try {
      const filesUrl = ev.endsWith('/files') ? ev : ev.replace(/\/?$/, '/files');
      console.log(`[Actor] Files page: ${filesUrl}`);
      await driver.get(filesUrl);
      await driver.wait(until.elementLocated(By.css('body')),{ timeout: 30000 });
      await Actor.sleep(1000);

      const anchors = await driver.findElements(By.css('a[href]'));
      for (const a of anchors) {
        const href = await a.getAttribute('href');
        const text = (await a.getText()) || '';
        if (/\.pdf(\?|#|$)/i.test(href) || /download/i.test(href) || /(agenda|minutes)/i.test(text)) {
          await pushPdf(filesUrl, href, text);
        }
      }
    } catch (e) {
      await Actor.pushData({ type: 'error', url: ev, error: String(e) });
    }
  }

  await driver.quit();
} catch (e) {
  console.error('Actor failed:', e);
  throw e;
} finally {
  await Actor.exit();
}


