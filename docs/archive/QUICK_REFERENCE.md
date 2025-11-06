# AckIndex Quick Reference Guide

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  Chat UI | Document Manager | Admin Dashboard | User Profile       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES                               │
├─────────────────────────────────────────────────────────────────────┤
│ /api/chat                  - Chat with AI + RAG                     │
│ /api/admin/scrape-url      - Trigger Apify scraping                │
│ /api/admin/upload-pdf      - Upload PDF files                      │
│ /api/admin/generate-embeddings - Batch generate embeddings         │
│ /api/admin/documents       - List/manage documents                 │
│ /api/admin/ingest-external - Ingest external PDFs                  │
│ /api/user/dashboard        - User stats & profile                  │
│ /api/stripe/*              - Payment webhooks                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐  ┌────▼─────┐  ┌──▼────────┐
│   APIFY    │  │  OPENAI  │  │ SUPABASE  │
│            │  │          │  │           │
│ Scraper    │  │ Embeddings│  │ PostgreSQL│
│ (Python)   │  │ Chat API │  │ pgvector  │
└────────────┘  └──────────┘  └────┬──────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
         ┌──────────▼─┐  ┌──────────▼────┐  ┌────────▼──────┐
         │ documents  │  │document_chunks│  │ user_profiles │
         │            │  │                │  │               │
         │ - metadata │  │ - content      │  │ - tier        │
         │ - status   │  │ - embedding    │  │ - tokens used │
         │ - stats    │  │ - metadata     │  │ - subscription│
         └────────────┘  └────────────────┘  └───────────────┘
```

## Data Flow: Scraping → Embeddings → Search → Chat

```
1. SCRAPING PIPELINE
   Apify Actor (Playwright)
   ├─ Crawl website
   ├─ Extract PDFs
   └─ Parse content → Apify Dataset
                         │
2. INGESTION PIPELINE
   /api/admin/scrape-url
   ├─ Fetch Apify results
   ├─ Parse PDFs (pdf-parse)
   ├─ Clean text
   └─ Chunk (500 tokens, 50 overlap) → document_chunks table
                         │
3. EMBEDDING PIPELINE
   /api/admin/generate-embeddings
   ├─ Find chunks without embeddings
   ├─ Batch generate OpenAI embeddings (ada-002, 1536-dim)
   └─ Store embeddings → document_chunks.embedding column
                         │
4. SEARCH PIPELINE
   /api/chat (POST)
   ├─ Get user query
   ├─ Generate query embedding (OpenAI)
   ├─ Semantic search via RPC (search_similar_chunks)
   ├─ Deduplicate & re-rank results
   └─ Build context string
                         │
5. CHAT PIPELINE
   OpenAI Chat API
   ├─ System prompt + context + user message
   ├─ Generate response
   ├─ Extract citations
   ├─ Track token usage
   └─ Return to user
```

## Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| documents | Track documents | id, source_type, status, total_chunks, total_tokens |
| document_chunks | Store parsed content | id, document_id, content, embedding (vector(1536)), metadata |
| scrape_jobs | Track Apify jobs | id, document_id, apify_run_id, apify_status |
| user_profiles | User info | id, subscription_tier, monthly_token_limit |
| usage_tracking | Token usage | user_id, year, month, total_tokens, query_count |
| subscription_history | Audit trail | user_id, event_type, tier, stripe_subscription_id |
| email_subscribers | Newsletter | email, user_id, is_subscribed, frequency |

## Key Functions & Their Purpose

### Embeddings (`src/lib/embeddings.ts`)
- `generateEmbedding()` - Convert text to 1536-dim vector
- `generateEmbeddingsBatch()` - Batch process (up to 100 at time)
- `cosineSimilarity()` - Calculate vector similarity

### Retrieval (`src/lib/retrieval.ts`)
- `retrieveRelevantChunks()` - Find relevant content for query
- `semanticSearch()` - Vector similarity search
- `keywordSearch()` - Full-text search
- `hybridSearch()` - Combined vector + text
- `buildContext()` - Format results for LLM

### Scraping (`src/lib/apifyScraper.ts`)
- `startScrapeJob()` - Trigger Apify actor
- `waitForJob()` - Poll until completion
- `getJobResults()` - Fetch dataset items
- `downloadPDF()` - Download PDF from URL

### Database (`src/lib/database.ts`)
- `createDocument()` - Create document record
- `storeChunks()` - Save chunks to DB
- `updateChunkEmbedding()` - Store embedding vector
- `getChunksWithoutEmbeddings()` - Find unprocessed chunks

## API Quick Reference

### Chat Endpoint
```bash
POST /api/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "What are the zoning regulations?",
  "conversationHistory": []
}

Response:
{
  "message": "...",
  "citations": [
    { "title": "Zoning Code", "url": "...", "snippet": "..." }
  ],
  "tokensUsed": { "input": 150, "output": 200 },
  "canQuery": true
}
```

### Scrape URL Endpoint
```bash
POST /api/admin/scrape-url
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://nantucket-ma.gov/..."
}

Response:
{
  "message": "URL scraping started successfully",
  "documentId": "uuid",
  "url": "..."
}
```

### Generate Embeddings Endpoint
```bash
POST /api/admin/generate-embeddings
Content-Type: application/json
Authorization: Bearer <token>

{
  "batchSize": 50
}

Response:
{
  "processed": 150,
  "failed": 0,
  "stats": {
    "total_chunks": 1000,
    "chunks_with_embeddings": 950,
    "chunks_without_embeddings": 50
  }
}
```

## Subscription Tiers

| Feature | Free | Premium |
|---------|------|---------|
| Monthly Tokens | 3,500 | Unlimited |
| Concurrent Queries | Limited | Unlimited |
| Query History | 7 days | Unlimited |
| Cost | Free | $9.99/month |
| Token Cost (if overage) | $0.0001 per 1K | Included |

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (for embeddings & chat)
OPENAI_API_KEY=sk-proj-...

# Apify (for web scraping)
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=legible_radish/ackindex-pdf-actor

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG....
CONTACT_EMAIL=...@...
```

## Common Tasks

### 1. Scrape a New URL
```bash
curl -X POST http://localhost:3000/api/admin/scrape-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```
→ Triggers Apify actor, stores content, chunks are created

### 2. Generate Embeddings for Chunks
```bash
curl -X POST http://localhost:3000/api/admin/generate-embeddings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 50}'
```
→ Finds chunks without embeddings, generates them from OpenAI

### 3. Search for Content
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the zoning code?"}'
```
→ Generates embedding, searches database, sends to OpenAI with context

### 4. Check User Token Usage
```bash
curl -X GET http://localhost:3000/api/user/dashboard \
  -H "Authorization: Bearer <token>"
```
→ Returns usage stats for current month

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No embeddings found" | Chunks haven't been embedded | Run /api/admin/generate-embeddings |
| Chat returns generic response | Low similarity results | Check embedding quality, increase chunk overlap |
| Apify job fails | Memory/timeout issues | Reduce maxPages, increase timeout |
| Slow searches | No embedding index | Apply add-embedding-index.sql (1000+ chunks) |
| Token limit exceeded | User hit monthly limit | Upgrade to Premium or wait for reset |

## Performance Notes

- Embedding generation: ~1-2 per second per OpenAI call
- Semantic search: <100ms (without index), <10ms (with IVFFlat index)
- PDF parsing: ~1-2 seconds per 10-page document
- Chunk creation: ~100ms per 500-token chunk

## Production Checklist

- [ ] Database backups configured
- [ ] Supabase RLS policies reviewed
- [ ] Rate limiting on API routes
- [ ] Error logging/monitoring set up
- [ ] Stripe webhook signing verified
- [ ] Embedding costs monitored
- [ ] PDF upload size limits enforced
- [ ] Job queue implemented (for reliability)
- [ ] Caching layer added (Redis/Vercel KV)
- [ ] Load testing completed

