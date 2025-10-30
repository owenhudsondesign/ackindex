import { Actor } from 'apify';
import axios from 'axios';
import { Builder, By, until } from 'selenium-webdriver';

await Actor.init();

let sessionId;
let bbHeaders;

try {
  const input = (await Actor.getInput()) || {};
  const portalUrl = input.portalUrl || 'https://nantucketma.portal.civicclerk.com/';
  const maxEvents = input.maxEvents || 20;
  const bbKey = input.browserbaseApiKey || process.env.BROWSERBASE_API_KEY;
  const bbProject = input.browserbaseProjectId || process.env.BROWSERBASE_PROJECT_ID;
  if (!bbKey || !bbProject) throw new Error('Missing Browserbase credentials');

  bbHeaders = { 'x-bb-api-key': bbKey, 'content-type': 'application/json' };

  // Check for and close any active sessions to avoid 429 errors
  console.log('[Browserbase] Checking for active sessions...');
  try {
    const activeSessions = await axios.get(`https://api.browserbase.com/v1/sessions?projectId=${bbProject}&status=active`, {
      headers: bbHeaders,
    });
    if (activeSessions.data && activeSessions.data.length > 0) {
      console.log(`[Browserbase] Found ${activeSessions.data.length} active session(s), closing...`);
      for (const sess of activeSessions.data) {
        try {
          await axios.delete(`https://api.browserbase.com/v1/sessions/${sess.id}`, { headers: bbHeaders });
          console.log(`[Browserbase] Closed session: ${sess.id}`);
          await Actor.sleep(2000); // Wait a bit between closes
        } catch (e) {
          console.log(`[Browserbase] Could not close session ${sess.id}: ${e.message}`);
        }
      }
      await Actor.sleep(3000); // Wait for sessions to fully close
    }
  } catch (e) {
    console.log(`[Browserbase] Could not check active sessions: ${e.message}`);
  }

  // Create new session with retry logic for rate limits
  let session;
  let retries = 3;
  while (retries > 0) {
    try {
      session = await axios.post('https://api.browserbase.com/v1/sessions', { projectId: bbProject }, {
        headers: bbHeaders,
      });
      break; // Success
    } catch (e) {
      if (e.response?.status === 429 && retries > 1) {
        const waitTime = 10; // seconds
        console.log(`[Browserbase] Rate limited (429). Waiting ${waitTime}s before retry (${retries - 1} attempts left)...`);
        await Actor.sleep(waitTime * 1000);
        retries--;
      } else {
        throw e; // Re-throw if not 429 or out of retries
      }
    }
  }

  const { seleniumRemoteUrl, connectUrl, signingKey, id } = session.data;
  sessionId = id;
  console.log(`[Browserbase] Session: ${sessionId}`);

  // Prefer connectUrl if provided; otherwise embed apiKey and signingKey
  let remoteUrl = connectUrl || seleniumRemoteUrl;
  try {
    const url = new URL(remoteUrl);
    // If no username present, embed API key as basic auth
    if (!url.username && bbHeaders && bbHeaders['x-bb-api-key']) {
      url.username = bbHeaders['x-bb-api-key'];
    }
    if (signingKey) url.searchParams.set('signingKey', signingKey);
    remoteUrl = url.href;
  } catch {}
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .usingServer(remoteUrl)
    .build();

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
  console.log('[Selenium] WebDriver quit');

  // Close Browserbase session
  try {
    await axios.delete(`https://api.browserbase.com/v1/sessions/${sessionId}`, { headers: bbHeaders });
    console.log(`[Browserbase] Session ${sessionId} closed`);
  } catch (e) {
    console.log(`[Browserbase] Could not close session ${sessionId}: ${e.message}`);
  }
} catch (e) {
  console.error('Actor failed:', e);
  // Try to close session even on error
  if (sessionId && bbHeaders) {
    try {
      await axios.delete(`https://api.browserbase.com/v1/sessions/${sessionId}`, { headers: bbHeaders });
    } catch (closeErr) {
      console.log(`[Browserbase] Could not close session on error: ${closeErr.message}`);
    }
  }
  throw e;
} finally {
  await Actor.exit();
}


