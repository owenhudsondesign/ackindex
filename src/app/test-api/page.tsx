'use client';

import { useState } from 'react';

export default function TestAPIPage() {
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [embeddingResult, setEmbeddingResult] = useState<any>(null);
  const [chatResult, setChatResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Note: Using anon key for testing. For admin operations, you should be authenticated.
  const [apiKey, setApiKey] = useState('');

  async function testScrape() {
    setLoading('scrape');
    try {
      const response = await fetch('/api/admin/scrape-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: 'https://www.nantucket-ma.gov/1450/Building-Permits'
        })
      });
      const data = await response.json();
      setScrapeResult(data);
    } catch (error: any) {
      setScrapeResult({ error: error.message });
    }
    setLoading(null);
  }

  async function testEmbeddings() {
    setLoading('embeddings');
    try {
      const response = await fetch('/api/admin/generate-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ batchSize: 50 })
      });
      const data = await response.json();
      setEmbeddingResult(data);
    } catch (error: any) {
      setEmbeddingResult({ error: error.message });
    }
    setLoading(null);
  }

  async function testChat() {
    setLoading('chat');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          message: 'What are the requirements for building permits in Nantucket?'
        })
      });
      const data = await response.json();
      setChatResult(data);
    } catch (error: any) {
      setChatResult({ error: error.message });
    }
    setLoading(null);
  }

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', fontFamily: 'monospace' }}>
      <h1>AckIndex API Tester</h1>

      <section style={{ marginBottom: '40px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          API Key (paste your Supabase service role key):
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your API key here"
          style={{ width: '100%', padding: '10px', fontSize: '14px', fontFamily: 'monospace' }}
        />
        <p style={{ fontSize: '12px', color: '#856404', marginTop: '10px' }}>
          ⚠️ Never commit API keys to git. This key is only stored in memory.
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Step 1: Scrape URL</h2>
        <button
          onClick={testScrape}
          disabled={loading === 'scrape'}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading === 'scrape' ? '⏳ Scraping...' : '🔍 Scrape URL'}
        </button>
        {scrapeResult && (
          <pre style={{ background: '#f4f4f4', padding: '15px', borderRadius: '5px', marginTop: '10px', overflow: 'auto' }}>
            {JSON.stringify(scrapeResult, null, 2)}
          </pre>
        )}
        <p style={{ color: '#666', fontSize: '14px' }}>⏳ Wait 90 seconds after clicking before generating embeddings</p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Step 2: Generate Embeddings</h2>
        <button
          onClick={testEmbeddings}
          disabled={loading === 'embeddings'}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading === 'embeddings' ? '⏳ Generating...' : '🧠 Generate Embeddings'}
        </button>
        {embeddingResult && (
          <pre style={{ background: '#f4f4f4', padding: '15px', borderRadius: '5px', marginTop: '10px', overflow: 'auto' }}>
            {JSON.stringify(embeddingResult, null, 2)}
          </pre>
        )}
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Step 3: Test Chat</h2>
        <button
          onClick={testChat}
          disabled={loading === 'chat'}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading === 'chat' ? '⏳ Asking...' : '💬 Ask Question'}
        </button>
        {chatResult && (
          <pre style={{ background: '#f4f4f4', padding: '15px', borderRadius: '5px', marginTop: '10px', overflow: 'auto' }}>
            {JSON.stringify(chatResult, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
