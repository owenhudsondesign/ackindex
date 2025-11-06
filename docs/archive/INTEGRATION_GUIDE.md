# AckIndex Integration Guide: Apify → Supabase → Semantic Search

This guide shows exactly how data flows from the Apify scraper through Supabase to semantic search and chat.

---

## Part 1: Apify Scraper Output

The Nantucket Playwright Scraper produces datasets in this format:

```python
# apify-actors/nantucket-playwright-scraper/main.py
# Returns items like:
{
    "type": "page",                    # or "pdf"
    "url": "https://example.gov/page",
    "title": "Example Page Title",
    "text": "Cleaned page content...",
    "tables": [],                      # if applicable
    "metadata": {
        "crawledAt": "2024-10-30T...",
        "pdf_count": 0
    }
}

{
    "type": "pdf",
    "url": "https://example.gov/file.pdf",
    "title": "Permit Application",
    "full_text": "Extracted PDF text...",
    "tables": [...],                   # Table data extracted
    "metadata": {
        "num_pages": 5,
        "total_tables": 2,
        "parser": "pdf-parse"
    }
}
```

---

## Part 2: Apify Integration (src/lib/apifyScraper.ts)

```typescript
// Start a scraping job
export async function startScrapeJob(
  url: string,
  options: ScrapeOptions = {}
): Promise<string> {
  const apifyClient = getApifyClient();
  
  // Choose actor based on environment
  const useStagehand = process.env.USE_STAGEHAND_ACTOR === 'true';
  const actorId = useStagehand 
    ? process.env.STAGEHAND_ACTOR_ID || 'legible_radish/stagehand-nantucket-scraper'
    : process.env.APIFY_ACTOR_ID || 'legible_radish/ackindex-pdf-actor';

  const run = await apifyClient.actor(actorId).call({
    startUrl: url,
    maxPages: options.maxPages || 50,
    maxDepth: options.maxDepth || 2,
    extractPDFs: options.extractPDFs !== false,
  });

  return run.id; // Return job ID for polling
}

// Fetch results from completed job
export async function getJobResults(runId: string): Promise<ScrapedContent[]> {
  const apifyClient = getApifyClient();
  const run = await apifyClient.run(runId).get();
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  
  // Process items and normalize to ScrapedContent format
  const results: ScrapedContent[] = [];
  for (const item of items) {
    if (item.type === 'page' && item.text?.length > 100) {
      results.push({
        url: item.url,
        title: item.title || extractTitleFromUrl(item.url),
        text: cleanText(item.text),
        pdfs: [],
        tables: item.tables || [],
        metadata: { crawledAt: new Date().toISOString() }
      });
    } else if (item.type === 'pdf' && item.full_text?.length > 100) {
      results.push({
        url: item.url,
        title: item.title || extractFilenameFromUrl(item.url),
        text: cleanText(item.full_text),
        pdfs: [{ url: item.url, filename: extractFilenameFromUrl(item.url) }],
        tables: item.tables || [],
        metadata: {
          num_pages: item.num_pages || 0,
          total_tables: item.total_tables || 0,
          parser: item.parser || 'pdf-parse'
        }
      });
    }
  }
  
  return results;
}
```

---

## Part 3: Data Ingestion (src/app/api/admin/scrape-url/route.ts)

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const supabase = await getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // 2. Create document record
  const { url } = await request.json();
  const document = await createDocument({
    source_type: 'url',
    source_url: url,
    title: url,
    created_by: session.user.id,
  });

  // 3. Start processing in background (fire-and-forget)
  processUrlScraping(document.id, url, session.user.id).catch(error => {
    console.error('[Scrape API] Background processing failed:', error);
  });

  return NextResponse.json({
    message: 'URL scraping started successfully',
    documentId: document.id,
    url,
  });
}

// Background processing function
async function processUrlScraping(documentId: string, url: string, userId: string) {
  try {
    // Mark as processing
    await updateDocument(documentId, { status: 'processing' });

    // Step 1: Trigger Apify
    const runId = await startScrapeJob(url, {
      maxPages: 50,
      maxDepth: 2,
      extractPDFs: true,
    });

    // Step 2: Wait for completion
    await waitForJob(runId, 180000); // 3 minutes timeout

    // Step 3: Fetch results
    const results = await getJobResults(runId);

    // Step 4: Process results
    let allChunks: any[] = [];
    let totalTokens = 0;

    for (const result of results) {
      // Chunk the content
      const chunks = chunkText(result.text, { 
        maxTokens: 500, 
        overlap: 50 
      });

      for (const chunk of chunks) {
        allChunks.push({
          document_id: documentId,
          content: chunk.content,
          chunk_index: allChunks.length,
          metadata: {
            source_url: result.url,
            source_type: result.pdfs.length > 0 ? 'pdf' : 'page',
            title: result.title,
            tables: result.tables?.length || 0,
            ...result.metadata,
          },
        });
        totalTokens += chunk.tokens;
      }
    }

    // Step 5: Store chunks in database
    if (allChunks.length > 0) {
      await storeChunks(documentId, allChunks);
    }

    // Step 6: Mark as completed
    await markDocumentCompleted(documentId, allChunks.length, totalTokens);

    console.log(`[Scrape] Completed: ${allChunks.length} chunks, ${totalTokens} tokens`);
  } catch (error) {
    console.error(`[Scrape] Failed: ${error}`);
    await markDocumentFailed(documentId, error instanceof Error ? error.message : 'Unknown error');
  }
}
```

---

## Part 4: Database Storage (src/lib/database.ts)

```typescript
// Store chunks in database
export async function storeChunks(
  documentId: string,
  chunks: Array<{
    document_id?: string;
    content: string;
    chunk_index: number;
    metadata: Record<string, any>;
  }>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('document_chunks')
    .insert(
      chunks.map(chunk => ({
        document_id: documentId,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
        metadata: chunk.metadata,
        // embedding field is NULL at this point
      }))
    );

  if (error) {
    console.error('[DB] Failed to store chunks:', error);
    throw new Error('Failed to store chunks');
  }
}

// Get chunks without embeddings for batch processing
export async function getChunksWithoutEmbeddings(
  limit: number = 50
): Promise<Array<{ id: string; content: string }>> {
  const { data, error } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content')
    .is('embedding', null)  // NULL check for embedding column
    .limit(limit);

  if (error) {
    console.error('[DB] Failed to get chunks:', error);
    throw new Error('Failed to retrieve chunks');
  }

  return data || [];
}

// Update chunk with embedding
export async function updateChunkEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  // Format embedding as vector(1536) type
  const formattedEmbedding = `[${embedding.join(',')}]`;

  const { error } = await supabaseAdmin
    .from('document_chunks')
    .update({ embedding: formattedEmbedding })
    .eq('id', chunkId);

  if (error) {
    console.error('[DB] Failed to update embedding:', error);
    throw new Error('Failed to update chunk embedding');
  }
}
```

---

## Part 5: Embedding Generation (src/app/api/admin/generate-embeddings/route.ts)

```typescript
export async function POST(request: NextRequest) {
  // 1. Get chunks without embeddings
  const chunks = await getChunksWithoutEmbeddings(50);

  if (chunks.length === 0) {
    return NextResponse.json({
      message: 'All chunks already have embeddings',
    });
  }

  // 2. Generate embeddings in batch
  const texts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddingsBatch(texts);
  // Returns: number[][] (array of 1536-dimensional vectors)

  // 3. Update database with embeddings
  let successCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      await updateChunkEmbedding(chunks[i].id, embeddings[i]);
      successCount++;
    } catch (error) {
      console.error(`Failed to update chunk ${chunks[i].id}:`, error);
    }
  }

  return NextResponse.json({
    message: `Generated embeddings for ${successCount} chunks`,
    processed: successCount,
  });
}
```

### Embedding Generation (src/lib/embeddings.ts)

```typescript
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const batchSize = 100; // OpenAI API supports up to 2048 inputs per request
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const cleanBatch = batch.map(text => text.trim().slice(0, 32000)); // Limit tokens

    // Call OpenAI API
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: cleanBatch,
    });

    // Extract embeddings (1536 dimensions each)
    embeddings.push(...response.data.map(d => d.embedding));

    // Rate limiting
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}
```

---

## Part 6: Semantic Search (src/lib/retrieval.ts)

```typescript
export async function retrieveRelevantChunks(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const { maxResults = 5, minSimilarity = 0.7, searchMode = 'semantic' } = options;

  // Step 1: Generate embedding for user query
  const queryEmbedding = await generateEmbedding(query);
  // Returns: number[] (1536 dimensions)

  // Step 2: Call Supabase RPC function for semantic search
  const { data, error } = await supabaseAdmin.rpc('search_similar_chunks', {
    query_embedding: queryEmbedding,    // Pass as array
    match_threshold: minSimilarity,     // Cosine similarity threshold
    match_count: maxResults,             // Limit results
  });

  if (error) {
    console.error('[Retrieval] Database search error:', error);
    throw new Error('Database search failed');
  }

  // Step 3: Enrich with document info
  if (data && data.length > 0) {
    return await enrichWithDocumentInfo(data);
  }

  return data || [];
}

// Build context string from retrieved chunks
export function buildContext(results: RetrievalResult[]): string {
  if (results.length === 0) return 'No relevant information found.';

  return results
    .map((result, index) => {
      const source = result.document?.title || 'Unknown source';
      return `[Source ${index + 1}: ${source}]\n${result.content}\n`;
    })
    .join('\n');
}

// Extract citations for response
export function extractCitations(results: RetrievalResult[]) {
  return results.map((result, index) => ({
    title: result.document?.title || 'Untitled',
    url: result.document?.source_url,
    snippet: result.content.slice(0, 100),
  }));
}
```

### Supabase RPC Function (defined in supabase-migration-stage8.sql)

```sql
-- This function is called by the retrieval code
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
    -- <=> is the cosine distance operator (negative cosine similarity)
    -- 1 - distance gives us similarity score (0-1, where 1 is most similar)
  FROM document_chunks dc
  WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Part 7: Chat with Context (src/app/api/chat/route.ts)

```typescript
export async function POST(request: NextRequest) {
  const { message, conversationHistory = [] } = await request.json();

  // Step 1: Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Step 2: Check token limit
  const canQuery = await canUserQuery(user.id);
  if (!canQuery) {
    return NextResponse.json({ error: 'Token limit exceeded' }, { status: 429 });
  }

  // Step 3: Retrieve relevant chunks (semantic search)
  const rawResults = await retrieveRelevantChunks(message, {
    maxResults: 10,
    minSimilarity: 0.7,
    searchMode: 'semantic',
  });

  // Step 4: Deduplicate results
  const deduplicatedResults = deduplicateResults(rawResults);

  // Step 5: Check if results are relevant
  if (!hasRelevantResults(deduplicatedResults)) {
    return NextResponse.json({
      message: 'I could not find relevant information to answer your question.',
      citations: [],
    });
  }

  // Step 6: Build context from chunks
  const context = buildContext(deduplicatedResults);

  // Step 7: Call OpenAI with context
  const systemPrompt = `You are a helpful AI assistant for Nantucket government documents.
Answer questions based only on the provided context.
If you don't know the answer, say so.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${message}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const responseText = completion.choices[0].message.content || '';

  // Step 8: Extract citations from retrieved chunks
  const citations = extractCitations(deduplicatedResults);

  // Step 9: Track token usage
  const tokensUsed = {
    input: completion.usage?.prompt_tokens || 0,
    output: completion.usage?.completion_tokens || 0,
  };

  await recordUsage(user.id, tokensUsed.input, tokensUsed.output);

  // Step 10: Return response
  return NextResponse.json({
    message: responseText,
    citations,
    tokensUsed,
  });
}
```

---

## Part 8: Database Schema Overview

```sql
-- document_chunks table (created by supabase-schema.sql)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,                    -- The chunk of text
  chunk_index INTEGER NOT NULL,             -- Order within document
  metadata JSONB DEFAULT '{}',              -- Additional data
  embedding vector(1536),                   -- 1536-dim OpenAI embedding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Indexes for fast retrieval
CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_content_search ON document_chunks 
  USING gin(to_tsvector('english', content));
CREATE INDEX idx_chunks_embedding ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  -- IVFFlat index: ~10ms search time for 1000+ chunks
```

---

## Complete Flow Summary

```
1. USER SUBMITS URL
   POST /api/admin/scrape-url?url=https://example.gov
   
2. CREATE DOCUMENT RECORD
   documents table: { id, source_url, status='pending' }
   
3. START APIFY JOB (Background)
   Apify Actor runs, produces dataset
   
4. FETCH APIFY RESULTS
   getJobResults() → [ScrapedContent, ...]
   
5. CHUNK CONTENT
   chunkText() → [TextChunk, ...]
   
6. STORE CHUNKS
   INSERT into document_chunks → chunks created with NULL embedding
   
7. GENERATE EMBEDDINGS
   POST /api/admin/generate-embeddings
   generateEmbeddingsBatch() → number[][]
   UPDATE document_chunks SET embedding = ...
   
8. USER ASKS QUESTION
   POST /api/chat?message=What is...
   
9. SEMANTIC SEARCH
   generateEmbedding(message) → number[]
   search_similar_chunks(embedding) → RetrievalResult[]
   
10. BUILD CONTEXT
    buildContext(results) → "Source 1: ...\nSource 2: ...\n"
    
11. CALL OPENAI
    openai.chat.completions.create({
      messages: [..., { role: 'user', content: context + message }]
    })
    
12. EXTRACT CITATIONS
    extractCitations(results) → [{ title, url, snippet }, ...]
    
13. TRACK USAGE
    recordUsage(userId, inputTokens, outputTokens)
    
14. RETURN RESPONSE
    { message, citations, tokensUsed }
```

---

## Key Integration Points

### 1. Apify → Database
- Apify produces `ScrapedContent` objects
- Converted to `DocumentChunk` records with metadata
- Stored in PostgreSQL `document_chunks` table

### 2. Chunks → Embeddings
- Unembedded chunks identified (WHERE embedding IS NULL)
- Text sent to OpenAI in batches (max 100 per batch)
- Returns 1536-dimensional vectors
- Stored as `vector(1536)` type in PostgreSQL

### 3. Query → Search → Context
- User query converted to embedding using same model
- `search_similar_chunks()` RPC function finds matches using cosine distance
- Results deduplicated and re-ranked
- Top results formatted as context string for LLM

### 4. Context → LLM → Response
- System prompt + context + user query sent to OpenAI
- Model generates response based on context
- Citations extracted from retrieved chunks
- Token usage tracked for rate limiting

---

## Environment Variables

All connections require these environment variables:

```bash
# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (embeddings + chat)
OPENAI_API_KEY=sk-proj-...

# Apify (scraping)
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=legible_radish/ackindex-pdf-actor

# Stripe (payments)
STRIPE_SECRET_KEY=sk_live_...
```

---

## Testing the Integration

```bash
# 1. Scrape a URL
curl -X POST http://localhost:3000/api/admin/scrape-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://nantucket-ma.gov/..."}'
# Returns: { documentId, message }

# 2. Generate embeddings for new chunks
curl -X POST http://localhost:3000/api/admin/generate-embeddings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 50}'
# Returns: { processed, failed, stats }

# 3. Ask a question
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the zoning regulations?"}'
# Returns: { message, citations, tokensUsed }

# 4. Check usage
curl -X GET http://localhost:3000/api/user/dashboard \
  -H "Authorization: Bearer $TOKEN"
# Returns: { tokens_used_this_month, tokens_remaining, ... }
```

