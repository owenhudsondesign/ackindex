# AckIndex Architecture & Technical Decisions

## Overview
AckIndex is a RAG (Retrieval Augmented Generation) chatbot for Nantucket civic data, built with Next.js, Supabase, OpenAI, and Apify.

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: TailwindCSS
- **State**: React hooks
- **Auth**: Supabase Auth

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL 15+)
- **Vector Search**: pgvector extension
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage (future)

### AI/ML
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **LLM**: OpenAI GPT-4o-mini
- **Vector Similarity**: Cosine distance

### Data Pipeline
- **Web Scraping**: Apify Playwright actor (Python)
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

**Trade-offs**:
- Not as fast as dedicated vector DBs (Pinecone, Weaviate) for >1M vectors
- Requires careful index tuning at scale

### 2. Chunking Strategy
**Decision**: 500 tokens per chunk, 50 token overlap
**Reasoning**:
- Fits within GPT-4's context window (8k tokens = ~16 chunks)
- Overlap preserves context across chunk boundaries
- Balances granularity vs. retrieval accuracy

**Trade-offs**:
- More chunks = more storage + embedding costs
- Smaller chunks might lose context

### 3. Embedding Model
**Decision**: OpenAI text-embedding-ada-002
**Reasoning**:
- Industry standard (1536 dimensions)
- Cost-effective ($0.0001 per 1K tokens)
- High quality semantic understanding
- Easy OpenAI integration

**Trade-offs**:
- Locked into OpenAI ecosystem
- Not fine-tunable for domain-specific use

### 4. RAG vs. Fine-tuning
**Decision**: Use RAG (retrieval augmented generation)
**Reasoning**:
- Civic data changes frequently (fine-tuning is static)
- Transparent source attribution (citations)
- Lower cost than fine-tuning
- Easier to update with new documents

### 5. Synchronous vs. Async Scraping
**Decision**: Async fire-and-forget for scraping
**Reasoning**:
- Scraping takes 1-5 minutes (too long for HTTP request)
- API returns immediately, scraping happens in background
- User doesn't wait for completion

**Trade-offs**:
- No immediate feedback on scraping results
- Harder to debug failures
- **Future**: Add job queue (Bull/BullMQ) for reliability

### 6. Subscription Model
**Decision**: Free tier with token limits, Premium unlimited
**Reasoning**:
- Aligns usage with costs (OpenAI charges per token)
- Encourages upgrades without blocking free users
- Simple two-tier model

**Pricing**:
- Free: 3,500 tokens/month (~25-30 questions)
- Premium: $9.99/month unlimited

### 7. Authentication
**Decision**: Supabase Auth
**Reasoning**:
- Built-in email/password
- Row Level Security integration
- OAuth providers ready if needed
- No separate auth service needed

### 8. Deployment
**Decision**: Vercel for Next.js, Supabase for database
**Reasoning**:
- Zero-config Next.js deployment
- Global CDN + edge functions
- Automatic HTTPS + custom domains
- Supabase offers generous free tier

## Data Flow

### Scraping Pipeline
```
URL → Apify Actor → Dataset → Parse → Chunk → Store → Embed → Search Ready
```

1. User submits URL
2. Create document record (status: pending)
3. Trigger Apify actor (background)
4. Apify crawls, extracts PDFs, parses content
5. Fetch results from Apify dataset
6. Chunk text (500 tokens, 50 overlap)
7. Store chunks in document_chunks (embedding=NULL)
8. Generate embeddings (batch of 50)
9. Update chunks with embeddings
10. Document status: completed

### Chat Pipeline
```
Query → Embed → Search → Dedupe → Context → LLM → Response + Citations
```

1. User sends message
2. Generate query embedding (OpenAI)
3. Semantic search (pgvector cosine similarity)
4. Deduplicate results (same content, different sources)
5. Build context string (top 5-10 chunks)
6. Send to OpenAI: system prompt + context + query
7. Extract citations from retrieved chunks
8. Record token usage
9. Return response + citations

## API Design

### RESTful Endpoints
- `POST /api/chat` - Chat with RAG
- `POST /api/admin/scrape-url` - Trigger scraping
- `POST /api/admin/upload-pdf` - Upload PDF
- `POST /api/admin/ingest-external` - Ingest external URLs
- `POST /api/admin/generate-embeddings` - Batch embed chunks
- `GET /api/admin/documents` - List documents
- `GET /api/user/dashboard` - User stats

### Authentication
- All endpoints require Supabase Bearer token
- RLS policies enforce user-level permissions
- Service role key used for admin operations

## Security

### Authentication
- Supabase JWT tokens (HTTP-only cookies)
- RLS policies on all tables
- Service role key only on server-side

### Input Validation
- URL validation (scraping)
- File type validation (PDF upload)
- Token count limits (rate limiting)
- SQL injection prevention (parameterized queries)

### Rate Limiting
- Token-based (free: 3,500/month, premium: unlimited)
- Usage tracked in database
- Enforced at API level

## Performance Optimizations

### Database
- IVFFlat index on embeddings (10-100ms searches)
- GIN index on content (full-text search)
- Indexes on foreign keys
- Connection pooling (Supabase default)

### Caching
**Current**: None
**Future**:
- Redis/Vercel KV for frequent queries
- Cache embeddings for repeat queries
- Cache user profile/subscription data

### Batch Processing
- Embed 50-100 chunks at once
- OpenAI supports up to 2048 inputs per request
- Rate limiting: 100ms delay between batches

## Cost Structure

### OpenAI
- Embeddings: $0.0001 per 1K tokens (~$0.10 per 1M tokens)
- Chat: $0.03 per 1K prompt tokens, $0.06 per 1K completion
- Typical user: 500 tokens/query = $0.02-0.03/query

### Apify
- Scraping: ~$0.01-0.10 per URL (depends on depth)
- Charged by compute time

### Supabase
- Free tier: 500MB database, 1GB bandwidth
- Pro: $25/month (8GB database, 50GB bandwidth)

### Stripe
- 2.9% + $0.30 per transaction
- Monthly billing: $9.99 → $0.88 fee

## Monitoring & Logging

**Current**: Console logs
**Future**:
- Sentry (error tracking)
- LogRocket (session replay)
- Vercel Analytics (performance)
- Custom dashboard (usage metrics)

## Known Limitations

1. **No Job Queue**: Scraping is fire-and-forget, no retry logic
2. **No Caching**: Every query hits OpenAI and database
3. **Limited Error Recovery**: Failed scrapes require manual retry
4. **No Async Embeddings**: Embedding generation blocks API request
5. **Single-tenant**: No multi-org support
6. **No Streaming**: Chat responses appear all at once

## Future Enhancements

### Short-term (1-3 months)
- Job queue for reliability (Bull/BullMQ)
- Caching layer (Redis/Vercel KV)
- Async embedding generation
- Improved error handling
- Better logging/monitoring

### Medium-term (3-6 months)
- Conversation history persistence
- User feedback on responses
- Admin analytics dashboard
- Export chat transcripts
- API access for Premium users

### Long-term (6-12 months)
- Multi-tenant support
- Custom data sources per user
- Fine-tuned models
- Advanced search filters
- Mobile app

## References

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [pgvector](https://github.com/pgvector/pgvector)
- [Apify](https://docs.apify.com)
