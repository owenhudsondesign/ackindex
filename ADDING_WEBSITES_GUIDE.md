# Guide: Adding New Websites to AckIndex

This guide shows you how to add new government websites to your AckIndex knowledge base.

---

## Quick Summary

To add a new website, you just need to:
1. Call the `/api/admin/scrape-url` endpoint with the URL
2. Wait for scraping to complete (1-3 minutes)
3. Generate embeddings with `/api/admin/generate-embeddings`
4. Start chatting! The new content is now searchable

---

## Method 1: Using the API Directly

### Step 1: Scrape the URL

```bash
curl -X POST http://localhost:3000/api/admin/scrape-url \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.nantucket-ma.gov/1450/Building-Permits"
  }'
```

**Response:**
```json
{
  "message": "URL scraping started successfully",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://www.nantucket-ma.gov/1450/Building-Permits"
}
```

The scraping happens **in the background**. The API returns immediately, but Apify will:
- Crawl up to 50 pages (max depth 2)
- Extract all PDF links
- Parse PDF content
- Clean text with AI
- Store chunks in your database

This typically takes **1-3 minutes** depending on the site size.

---

### Step 2: Generate Embeddings

After scraping completes, run:

```bash
curl -X POST http://localhost:3000/api/admin/generate-embeddings \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 50}'
```

**Response:**
```json
{
  "message": "Generated embeddings for 47 chunks",
  "processed": 47,
  "failed": 0,
  "stats": {
    "total_chunks": 47,
    "embedded_chunks": 47,
    "pending_chunks": 0
  }
}
```

This converts all the text chunks into 1536-dimensional vectors that enable semantic search.

---

### Step 3: Test with a Question

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the building permit requirements?"
  }'
```

**Response:**
```json
{
  "message": "Based on the Nantucket building regulations...",
  "citations": [
    {
      "title": "Building Permits - Nantucket",
      "url": "https://www.nantucket-ma.gov/1450/Building-Permits",
      "snippet": "All construction projects require..."
    }
  ],
  "tokensUsed": {
    "input": 523,
    "output": 187
  }
}
```

---

## Method 2: Using the Test Script

We've provided a Node.js test script:

```bash
# Install dependencies if needed
npm install

# Set your auth token
export AUTH_TOKEN="your-supabase-auth-token"

# Run the test
node test-pipeline.js
```

This will automatically:
1. Scrape a test URL
2. Wait for completion
3. Generate embeddings
4. Ask a test question

---

## Method 3: Programmatic Integration

You can integrate scraping into your own code:

```typescript
// src/lib/addWebsite.ts
import { startScrapeJob, waitForJob, getJobResults } from './apifyScraper';
import { storeChunks } from './database';
import { chunkText } from './chunking';
import { generateEmbeddingsBatch } from './embeddings';

export async function addWebsiteToKnowledgeBase(url: string, userId: string) {
  // 1. Create document
  const document = await createDocument({
    source_type: 'url',
    source_url: url,
    created_by: userId,
  });

  // 2. Start scraping
  const runId = await startScrapeJob(url, {
    maxPages: 50,
    maxDepth: 2,
    extractPDFs: true,
  });

  // 3. Wait for completion
  await waitForJob(runId, 180000); // 3 minute timeout

  // 4. Get results
  const results = await getJobResults(runId);

  // 5. Chunk and store
  const chunks = [];
  for (const result of results) {
    const textChunks = chunkText(result.text);
    chunks.push(...textChunks.map((chunk, i) => ({
      document_id: document.id,
      content: chunk.content,
      chunk_index: i,
      metadata: {
        source_url: result.url,
        title: result.title,
      }
    })));
  }

  await storeChunks(document.id, chunks);

  // 6. Generate embeddings
  const texts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddingsBatch(texts);

  // 7. Update chunks with embeddings
  for (let i = 0; i < chunks.length; i++) {
    await updateChunkEmbedding(chunks[i].id, embeddings[i]);
  }

  return document.id;
}
```

---

## Examples of Government Websites to Scrape

Here are some government sites that work well with the scraper:

### Municipal Sites
```bash
# Nantucket
https://www.nantucket-ma.gov/1450/Building-Permits
https://www.nantucket-ma.gov/151/Zoning-Bylaws

# Other MA towns
https://www.provincetown-ma.gov/
https://www.cambridgema.gov/
```

### State Sites
```bash
# Massachusetts
https://www.mass.gov/topics/building-codes
https://www.mass.gov/service-details/building-permit-requirements
```

### County Sites
```bash
# County clerk offices, planning departments, etc.
```

---

## Configuration Options

You can customize the scraping behavior:

```javascript
{
  "url": "https://example.gov",
  "maxPages": 50,      // Max pages to crawl (default: 50)
  "maxDepth": 2,       // Max link depth (default: 2)
  "extractPDFs": true  // Extract and parse PDFs (default: true)
}
```

---

## Monitoring Progress

### Check Document Status

```typescript
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('id', documentId)
  .single();

console.log(data.status); // 'pending' | 'processing' | 'completed' | 'failed'
```

### Check Embedding Progress

```bash
curl -X GET http://localhost:3000/api/admin/generate-embeddings \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Response:
```json
{
  "total_chunks": 150,
  "embedded_chunks": 103,
  "pending_chunks": 47,
  "percentage": 68.67
}
```

---

## Troubleshooting

### Issue: Scraping takes too long

**Solution:** The scraper has a 3-minute timeout. For very large sites:
- Reduce `maxPages` (e.g., 20 instead of 50)
- Reduce `maxDepth` (e.g., 1 instead of 2)
- Target specific subdirectories instead of the homepage

### Issue: No chunks created

**Possible causes:**
- Site has little text content (mostly images)
- Site requires authentication
- Site blocks bots/scrapers
- Content is dynamically loaded with JavaScript

**Solution:** Check the scrape_jobs table:
```sql
SELECT * FROM scrape_jobs WHERE document_id = 'your-doc-id';
```

### Issue: Embeddings failing

**Causes:**
- OpenAI API key invalid
- Rate limit exceeded
- Chunk text too long (>8192 tokens)

**Solution:**
- Verify `OPENAI_API_KEY` in `.env.local`
- Reduce `batchSize` to slow down requests
- Check chunk lengths in database

---

## Best Practices

1. **Start small:** Test with a single page before crawling entire sites
2. **Monitor costs:** OpenAI embeddings cost ~$0.0001 per 1K tokens
3. **Batch embeddings:** Process 50-100 chunks at a time
4. **Update regularly:** Re-scrape sites periodically to get new content
5. **Clean old data:** Remove outdated documents to keep search relevant

---

## Cost Estimation

For reference:
- **Scraping:** Apify costs vary by compute time (~$0.01-0.10 per run)
- **Embeddings:** OpenAI costs ~$0.10 per 1M tokens
- **Chat:** GPT-4 costs ~$0.03 per 1K prompt tokens

Example: Scraping a 20-page site with 5 PDFs:
- Scraping: ~$0.05
- Embeddings (100 chunks): ~$0.01
- Total: ~$0.06 per site

---

## Next Steps

Now that you know how to add websites:

1. **Build a UI:** Create a form where users can submit URLs
2. **Add webhooks:** Get notified when scraping completes
3. **Schedule updates:** Use cron jobs to re-scrape sites weekly/monthly
4. **Add filters:** Let users search specific sources or date ranges

See the `INTEGRATION_GUIDE.md` for detailed code examples of each component.
