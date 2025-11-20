# AckIndex Architecture & Technical Decisions

## Overview
AckIndex is a RAG (Retrieval Augmented Generation) chatbot for Nantucket civic data, built with Next.js, Supabase, OpenAI, and Apify. It uses a robust worker architecture for background processing of scraping, transcription, and embedding tasks.

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: TailwindCSS
- **State**: React hooks
- **Auth**: Supabase Auth

### Backend
- **API**: Next.js API Routes (act as dispatchers)
- **Database**: Supabase (PostgreSQL 15+)
- **Vector Search**: pgvector extension
- **Authentication**: Supabase Auth
- **Queue System**: BullMQ backed by Redis (ioredis)
- **Caching**: Redis (Upstash)

### AI/ML
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **LLM**: OpenAI GPT-4o-mini
- **Transcription**: Gladia (primary), AssemblyAI (backup)
- **Vector Similarity**: Cosine distance

### Data Pipeline
- **Web Scraping**: Apify (Playwright/Stagehand)
- **Video Processing**: YouTube.js + Gladia
- **PDF Parsing**: pdf-parse library
- **Text Chunking**: Custom (500 tokens, 50 overlap)

### Payments
- **Billing**: Stripe
- **Tiers**: Free (3,500 tokens/month), Premium ($9.99/month unlimited)

## Database Schema

### Core Tables

**documents**
```sql
id UUID PRIMARY KEY
source_type VARCHAR (url/pdf/external)
source_url TEXT
filename TEXT
title TEXT
description TEXT
status VARCHAR (pending/processing/completed/failed)
total_chunks INTEGER
total_tokens INTEGER
created_by UUID (→ auth.users)
created_at TIMESTAMP
updated_at TIMESTAMP
```

**document_chunks**
```sql
id UUID PRIMARY KEY
document_id UUID (→ documents)
content TEXT
chunk_index INTEGER
metadata JSONB
embedding vector(1536)  -- pgvector
created_at TIMESTAMP
```

**user_profiles**
```sql
id UUID PRIMARY KEY (→ auth.users)
full_name TEXT
subscription_tier VARCHAR (free/premium)
monthly_token_limit INTEGER
stripe_customer_id TEXT
stripe_subscription_id TEXT
created_at TIMESTAMP
```

**usage_tracking**
```sql
id UUID PRIMARY KEY
user_id UUID (→ auth.users)
year INTEGER
month INTEGER
input_tokens INTEGER
output_tokens INTEGER
total_tokens INTEGER
query_count INTEGER
estimated_cost_cents INTEGER
```

**scheduled_scrapes**
```sql
id UUID PRIMARY KEY
url TEXT
frequency VARCHAR (daily/weekly/monthly)
priority INTEGER
next_scrape_at TIMESTAMP
last_scraped_at TIMESTAMP
status VARCHAR (active/paused/failed)
```

### Key Indexes
- `document_chunks.embedding` - IVFFlat index for fast vector search
- `document_chunks.content` - GIN index for full-text search
- `documents.status` - B-tree for filtering
- `usage_tracking (user_id, year, month)` - Composite for monthly queries

## Architecture Decisions

### 1. Vector Search Strategy
**Decision**: Use pgvector with IVFFlat index
**Reasoning**:
- Native PostgreSQL extension (no separate vector DB)
- Sub-100ms query times for <100k vectors
- Simplifies deployment (one database)
- Cost-effective

### 2. Asynchronous Processing (Workers)
**Decision**: BullMQ with Redis
**Reasoning**:
- Decouples heavy processing (scraping, embedding) from the user-facing API.
- Allows for retries, concurrency control, and rate limiting.
- **Worker Process**: A standalone Node.js process (`worker.ts`) handles these queues.
    - `scraping`: URL scraping and YouTube processing.
    - `embedding`: Batch embedding generation.
    - `pdf-processing`: PDF parsing.

### 3. Chunking Strategy
**Decision**: 500 tokens per chunk, 50 token overlap
**Reasoning**:
- Fits within GPT-4's context window.
- Overlap preserves context across chunk boundaries.

### 4. Retrieval Strategy
**Decision**: Hybrid Search (Semantic + Keyword)
**Reasoning**:
- Semantic search captures meaning but can miss specific keywords.
- Keyword search ensures exact matches are found.
- **Boosting**:
    - Recency Boost: Newer documents get a slight score increase.
    - Chunk Type Boost: Summaries are prioritized.

### 5. Transcription
**Decision**: Gladia API
**Reasoning**:
- Fast and accurate transcription for audio/video.
- Supports speaker diarization.
- Fallback to AssemblyAI for specific use cases.

### 6. Deployment
**Decision**: Vercel (Web) + Railway (Worker) + Supabase (DB)
**Reasoning**:
- **Vercel**: Best-in-class for Next.js hosting.
- **Railway**: Ideal for long-running worker processes (Node.js) that Vercel Serverless functions cannot handle.
- **Supabase**: Managed Postgres + Auth + Storage.

## Data Flow

### Scraping Pipeline
```
URL → API Route → BullMQ (Scraping Queue) → Worker → Apify/Gladia → Text/Transcript → BullMQ (Embedding Queue) → Worker → OpenAI → Supabase
```

1. User submits URL via API.
2. Job added to `scraping` queue.
3. Worker picks up job:
    - If URL: Calls Apify to scrape.
    - If YouTube: Fetches metadata, downloads audio, calls Gladia for transcription.
4. Content is chunked.
5. Chunks added to `embedding` queue.
6. Worker picks up embedding job, calls OpenAI, saves to `document_chunks`.
7. Document status updated to `completed`.

### Chat Pipeline
```
Query → Embed → Hybrid Search (Semantic + Keyword) → Dedupe → Context → LLM → Response + Citations
```

1. User sends message.
2. Generate query embedding (OpenAI).
3. Perform Hybrid Search (pgvector + text match).
4. Deduplicate and re-rank results.
5. Build context string.
6. Send to OpenAI with system prompt.
7. Return response with citations.

## Security

### Authentication
- Supabase JWT tokens (HTTP-only cookies)
- RLS policies on all tables
- Service role key only on server-side (and worker)

### Input Validation
- URL validation (scraping)
- File type validation (PDF upload)
- Token count limits (rate limiting)

## Monitoring & Logging

- **Sentry/GlitchTip**: Error tracking for both Next.js app and Worker process.
- **Console Logs**: Structured logging in Worker.

## Future Enhancements

### Short-term
- Admin analytics dashboard
- Export chat transcripts

### Medium-term
- Multi-tenant support
- Custom data sources per user
- Fine-tuned models

## References

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [BullMQ](https://docs.bullmq.io/)
- [Gladia API](https://docs.gladia.io/)
