# CLAUDE_BACKEND.md - API Routes & Data Logic

## API Architecture

### Existing Endpoints
```
/api
├── /chat                          # POST: Chat with RAG
├── /admin
│   ├── /scrape-url               # POST: Trigger Apify scraping
│   ├── /upload-pdf               # POST: Upload PDF files
│   ├── /generate-embeddings      # POST/GET: Batch embeddings
│   ├── /documents                # GET: List documents
│   ├── /ingest-external          # POST: Ingest external PDFs
│   └── /trigger-scrape           # GET/POST: Manual scrape trigger
├── /user
│   └── /dashboard                # GET: User stats
├── /auth
│   └── /signup                   # POST: User registration
└── /stripe
    ├── /create-checkout          # POST: Create checkout session
    ├── /portal                   # GET: Billing portal
    └── /webhook                  # POST: Payment webhooks
```

## Core Data Flows

### 1. Chat Pipeline (src/app/api/chat/route.ts)
```
Query → Embed → Search → Dedupe → Context → LLM → Response + Citations
```

**Implementation pattern**:
```typescript
export async function POST(request: Request) {
  // 1. Validate user & check token limits
  const user = await authenticateUser(request);
  await checkTokenLimit(user.id);

  // 2. Generate query embedding
  const { message } = await request.json();
  const embedding = await generateEmbedding(message);

  // 3. Semantic search
  const chunks = await semanticSearch(embedding, { limit: 10 });

  // 4. Build context & call OpenAI
  const context = buildContext(chunks);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${message}` }
    ]
  });

  // 5. Track usage & return
  await trackUsage(user.id, response.usage);
  return { message: response.choices[0].message.content, citations };
}
```

### 2. Scraping Pipeline (src/app/api/admin/scrape-url/route.ts)
```
URL → Create Doc → Trigger Apify → Fetch Results → Chunk → Store
```

**Key functions**:
- `startScrapeJob(url, options)` - src/lib/apifyScraper.ts
- `waitForJob(runId, timeout)` - Polls until completion
- `getJobResults(runId)` - Fetches dataset items
- `chunkText(content, options)` - src/lib/chunking.ts
- `storeChunks(documentId, chunks)` - src/lib/database.ts

### 3. Embedding Generation (src/app/api/admin/generate-embeddings/route.ts)
```
Get Pending Chunks → Batch (50-100) → OpenAI API → Update DB
```

**Implementation**:
```typescript
export async function POST(request: Request) {
  const { batchSize = 50 } = await request.json();

  // Get chunks without embeddings
  const chunks = await supabase
    .from('document_chunks')
    .select('id, content')
    .is('embedding', null)
    .limit(batchSize);

  // Generate embeddings
  const embeddings = await generateEmbeddingsBatch(
    chunks.data.map(c => c.content)
  );

  // Update database
  for (let i = 0; i < chunks.data.length; i++) {
    await updateChunkEmbedding(chunks.data[i].id, embeddings[i]);
  }

  return { processed: chunks.data.length };
}
```

## Database Queries (src/lib/database.ts)

### Key Functions
```typescript
// Document management
createDocument(data: DocumentCreate): Promise<Document>
updateDocumentStatus(id: string, status: Status): Promise<void>
getDocuments(filters?: Filters): Promise<Document[]>

// Chunk operations
storeChunks(documentId: string, chunks: Chunk[]): Promise<void>
updateChunkEmbedding(chunkId: string, embedding: number[]): Promise<void>
getPendingChunks(limit: number): Promise<Chunk[]>

// User management
getUserProfile(userId: string): Promise<UserProfile>
updateSubscriptionTier(userId: string, tier: Tier): Promise<void>
trackUsage(userId: string, tokens: TokenUsage): Promise<void>
```

### Supabase RPC Functions
```sql
-- Semantic search (defined in Supabase)
CREATE FUNCTION search_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) RETURNS TABLE (
  id uuid,
  content text,
  similarity float
);
```

## OpenAI Integration (src/lib/embeddings.ts)

### Embedding Generation
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data[0].embedding;
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // OpenAI supports up to 2048 inputs per request
  const batches = chunk(texts, 100);
  const results = [];

  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: batch
    });
    results.push(...response.data.map(d => d.embedding));
    await sleep(100); // Rate limiting
  }

  return results;
}
```

## Error Handling Patterns

### API Response Structure
```typescript
// Success
return NextResponse.json({ data, message: 'Success' }, { status: 200 });

// Client error (validation failed)
return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });

// Unauthorized
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Rate limit exceeded
return NextResponse.json({
  error: 'Token limit exceeded',
  limit: user.monthly_token_limit,
  used: currentUsage
}, { status: 429 });

// Server error
return NextResponse.json({ error: 'Internal error' }, { status: 500 });
```

### Try-Catch Pattern
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ... process request
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
```

## Authentication & Authorization

### Supabase Auth
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // User is authenticated, proceed...
}
```

### Admin-only Endpoints
```typescript
// Check if user is admin (e.g., specific email or role)
const isAdmin = user.email === 'admin@ackindex.com';
if (!isAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Rate Limiting (Token-based)

```typescript
async function checkTokenLimit(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const usage = await supabase
    .from('usage_tracking')
    .select('total_tokens')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .single();

  const profile = await getUserProfile(userId);

  if (usage.data.total_tokens >= profile.monthly_token_limit) {
    throw new Error('Token limit exceeded');
  }
}
```

## Testing Endpoints

### Using curl
```bash
# Chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the zoning rules?"}'

# Generate embeddings
curl -X POST http://localhost:3000/api/admin/generate-embeddings \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"batchSize": 50}'
```

### Using Postman
- Import collection from `tests/postman_collection.json` (if exists)
- Set environment variables: `BASE_URL`, `AUTH_TOKEN`

## Related Files
- **src/lib/embeddings.ts**: OpenAI embedding functions
- **src/lib/retrieval.ts**: Semantic search & RAG
- **src/lib/apifyScraper.ts**: Apify integration
- **src/lib/database.ts**: Supabase queries
- **src/lib/chunking.ts**: Text chunking logic
