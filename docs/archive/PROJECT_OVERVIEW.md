# AckIndex Project: Comprehensive Setup Overview

## Executive Summary
AckIndex is a modern full-stack application for semantic search and AI-powered chatbot on government documents. It combines:
- **Frontend**: Next.js web application
- **Backend**: Next.js API routes with Supabase PostgreSQL database
- **Scraping**: Apify actors (Python Playwright-based) for web crawling and PDF extraction
- **AI**: OpenAI for embeddings and chat completions
- **Monetization**: Stripe subscription integration with free/premium tiers

---

## 1. DATABASE & SUPABASE SCHEMA

### Current Schema (Stage 9 - Latest)

#### Core Tables:

**documents**
- Stores metadata about uploaded/scraped content
- Fields: id, source_type (url/pdf), source_url, filename, title, description, status, error_message, total_chunks, total_tokens, timestamps, created_by
- Indexes on: status, created_at, source_type

**document_chunks**
- Parsed and chunked content for RAG retrieval
- Fields: id, document_id, content, chunk_index, metadata (JSONB), embedding (vector(1536)), created_at
- Indexes on: document_id, content (full-text search), metadata (JSONB), embedding (vector cosine distance)
- **Key**: This table stores the 1536-dimensional OpenAI embeddings

**scrape_jobs**
- Tracks Apify scraping job status and results
- Fields: id, document_id, apify_run_id, apify_status, url, config (JSONB), pages_crawled, pdfs_found, timestamps

**user_profiles**
- Extended user information beyond auth.users
- Fields: id, full_name, email_preferences, subscription_tier, stripe_customer_id, monthly_token_limit, timestamps
- Subscription tiers: free (3,500 tokens/month) | premium (unlimited)

**usage_tracking**
- Monthly token usage per user (input_tokens, output_tokens, total_tokens, query_count, estimated_cost_cents)
- One record per user per month
- RLS: Users can only view their own usage

**subscription_history**
- Audit trail of subscription changes (subscription_created, tier_upgraded, payment_succeeded, etc.)
- Stores stripe_subscription_id, stripe_invoice_id, amount_cents, event metadata

**email_subscribers**
- Newsletter subscription table (may or may not have accounts)
- Fields: email, user_id (optional), frequency, topics, verification_token, timestamps

### Vector Search Functions:

**search_similar_chunks(query_embedding, match_threshold, match_count)**
- Performs semantic search using cosine similarity
- Returns matching chunks with similarity scores
- Requires embedding vectors to be present

**hybrid_search_chunks(query_embedding, query_text, match_count)**
- Combines vector similarity + full-text search
- Returns results ranked by combined score (70% vector, 30% text)

### RLS Policies:
- All authenticated users can read/write documents and chunks (permissive)
- Users can only view their own profiles, usage, and subscription history
- Service role has full access (for webhooks)

### Migrations Applied:
- `supabase-schema.sql` (Stage 7): Initial document/chunk/scrape tables
- `supabase-migration-stage9.sql`: User profiles, subscriptions, usage tracking
- `supabase-migration-stage8.sql`: Vector embeddings with pgvector extension
- `add-embedding-index.sql`: IVFFlat index for vector similarity (for >1000 chunks)
- `fix-embedding-types.sql`: Type conversion for embeddings storage

---

## 2. AI/LLM INTEGRATION

### OpenAI Integration

**Embeddings** (`src/lib/embeddings.ts`)
- Model: `text-embedding-ada-002`
- Dimensions: 1536
- Functions:
  - `generateEmbedding()`: Single text → embedding
  - `generateEmbeddingsBatch()`: Multiple texts in batches (up to 100 at a time)
  - `cosineSimilarity()`: Vector similarity calculation
  - `findMostSimilar()`: Top-K similarity matching
  - `estimateEmbeddingCost()`: Cost estimation (≈$0.0001 per 1K tokens)
  - `isValidEmbedding()` / `formatEmbeddingForDB()`: Validation and formatting

**Chat Completions** (`src/app/api/chat/route.ts`)
- Uses OpenAI's chat API (model not specified but likely GPT-4 or GPT-4o)
- RAG pipeline:
  1. User query → embedding generation
  2. Semantic search in Supabase using embeddings
  3. Deduplication of results
  4. Context building from top chunks
  5. System prompt + context + user message → OpenAI
  6. Response with citations

**Chat Flow:**
```
User Query
    ↓
Generate Query Embedding (OpenAI)
    ↓
Semantic Search (Supabase RPC)
    ↓
Deduplicate Results
    ↓
Build Context from Chunks
    ↓
OpenAI Chat Completion with Context
    ↓
Return Response + Citations
    ↓
Record Token Usage (usage_tracking table)
```

### Features:
- Token-based rate limiting (free tier: 3,500 tokens/month)
- Usage tracking (input tokens, output tokens, cost estimation)
- Citations extraction from retrieved chunks
- Conversation history support

---

## 3. DATA INGESTION & SCRAPING PIPELINES

### Pipeline 1: URL Scraping (`src/app/api/admin/scrape-url/route.ts`)

**Flow:**
1. User submits URL
2. Create document record (status: pending)
3. Start Apify scraping job in background
4. Wait for job completion
5. Fetch results from Apify dataset
6. Parse PDFs, extract text
7. Chunk content
8. Store chunks in Supabase
9. Mark document as completed

**Uses:** `src/lib/apifyScraper.ts`
- `startScrapeJob()`: Initiates Apify actor
- `waitForJob()`: Polls until completion
- `getJobResults()`: Fetches dataset items
- `downloadPDF()`: Downloads PDF from URL

**Apify Actor Configuration:**
- Actor ID: Can use either Stagehand or Python Playwright actor
- Config options: maxDepth, maxPages, followLinks, extractPDFs
- Handles multiple item types: pages, PDFs, tables

### Pipeline 2: PDF Upload (`src/app/api/admin/upload-pdf/route.ts`)
- Direct file upload
- Parse PDF → extract text
- Chunk content
- Store in Supabase

### Pipeline 3: External Data Ingestion (`src/app/api/admin/ingest-external/route.ts`)
- Fetch files from external URLs
- Parse PDFs
- Chunk and store
- Currently shows "source_type: external" (new field added)

### Chunking Strategy (`src/lib/chunking.ts`)
- Max tokens: 500
- Overlap: 50 tokens (for context preservation)
- Stores metadata: source_url, source_type, pdf_title, pdf_pages

### PDF Parsing (`src/lib/pdfParser.ts`)
- Uses pdf-parse library
- Extracts text and metadata
- Returns: { text, title, pages, metadata }

---

## 4. APIFY ACTOR CONFIGURATION

### Current Actor: Nantucket Playwright Scraper

**Location:** `/apify-actors/nantucket-playwright-scraper/`

**Technology Stack:**
- Playwright (browser automation)
- Python (main scraper logic)
- BeautifulSoup (HTML parsing)
- PyPDF2 (PDF text extraction)
- OpenAI (optional AI-powered content extraction)

**Main Features:**
- Extracts PDF links from government websites
- Downloads and parses PDFs
- Extracts text content
- Extracts tables from PDFs
- AI-powered content cleaning (using OpenAI GPT-4o-mini)
- Memory-optimized: 
  - Skip PDFs > 5 MB
  - Aggressive text truncation
  - Garbage collection after processing

**Key Capabilities:**
- Crawl depth: up to 2 levels
- Max pages: up to 50
- Handles document center links (common in gov websites)
- Returns: Page content, PDF text, table data, metadata

**Configuration** (`.actor/actor.json`):
- Input schema in `input_schema.json`
- Dockerfile for containerization
- Version: 1.0

**Output Format:**
Apify dataset items with structure:
```json
{
  "type": "page" | "pdf",
  "url": "string",
  "title": "string",
  "text": "string",
  "full_text": "string (for PDFs)",
  "tables": [...],
  "metadata": {...},
  "num_pages": "number",
  "total_tables": "number"
}
```

---

## 5. API ENDPOINTS

### Authentication
- `/api/auth/signup` - User registration

### Chat & Retrieval
- `POST /api/chat` - Send message, get AI response with citations
  - Requires: Bearer token authentication
  - Rate limiting: Token-based (free: 3.5K/month)
  - Returns: message, citations, usage stats

### Admin Endpoints (Authenticated)
- `POST /api/admin/scrape-url` - Start URL scraping job
- `POST /api/admin/upload-pdf` - Upload PDF file
- `POST /api/admin/generate-embeddings` - Batch generate embeddings for chunks
- `GET /api/admin/generate-embeddings` - Get embedding statistics
- `GET /api/admin/documents` - List documents
- `POST /api/admin/ingest-external` - Ingest external PDFs

### User Dashboard
- `GET /api/user/dashboard` - Get user stats, token usage, subscription info

### Stripe Integration
- `POST /api/stripe/create-checkout` - Create checkout session
- `GET /api/stripe/portal` - Redirect to billing portal
- `POST /api/stripe/webhook` - Handle Stripe events (payment, subscription changes)

### Utility
- `POST /api/contact` - Contact form submission

---

## 6. EXISTING IMPLEMENTATION STATUS

### What's Already Built:
✅ **Database & Schema**
- Supabase PostgreSQL with vector embeddings
- User profiles and subscription management
- Usage tracking and cost estimation
- RLS policies for security

✅ **Vector Embeddings**
- OpenAI text-embedding-ada-002 integration
- Batch embedding generation
- Cosine similarity search
- Storage in pgvector format

✅ **Semantic Search**
- Query embedding generation
- Vector similarity matching
- Keyword/text search fallback
- Hybrid search (combined vector + text)
- Deduplication and re-ranking

✅ **Chat/RAG Pipeline**
- Retrieval of relevant chunks
- Context building
- OpenAI integration
- Citation extraction
- Token-based rate limiting

✅ **Web Scraping**
- Apify actor integration
- PDF extraction and parsing
- Content chunking
- Multiple data sources (URL, PDF, external)

✅ **User Management**
- Authentication (Supabase Auth)
- User profiles
- Monthly usage tracking
- Subscription tiers (free/premium)

✅ **Monetization**
- Stripe integration
- Subscription management
- Webhook handling
- Payment processing

### What Needs to be Built:
❌ **Frontend UI**
- Chat interface (partially built, needs completion)
- Document management interface
- Admin dashboard
- User profile/subscription pages
- Embedding generation UI

❌ **Advanced Features**
- Conversation persistence
- User history
- Export/download functionality
- Admin controls for document moderation
- Analytics dashboard

❌ **Optimization**
- Caching layer
- Async job queue (currently using fire-and-forget)
- Load testing
- Performance monitoring

---

## 7. INTEGRATION POINTS FOR APIFY → SUPABASE → SEMANTIC SEARCH

### Current Flow:

```
1. Apify Scraper
   └─> Produces dataset with pages, PDFs, tables
   
2. Next.js API Route (/api/admin/scrape-url)
   ├─> Creates document record
   ├─> Calls Apify API
   ├─> Polls for completion
   └─> Background processing:
       ├─> Fetch results from Apify dataset
       ├─> Parse PDFs (pdf-parse library)
       ├─> Clean text
       └─> Chunk content (500 tokens, 50 overlap)
   
3. Database Storage
   ├─> Save chunks to document_chunks table
   └─> Update document status to "processing"
   
4. Embedding Generation
   ├─> Call /api/admin/generate-embeddings
   ├─> Fetch chunks without embeddings
   ├─> Generate embeddings via OpenAI (batch)
   └─> Update chunks with embedding vectors
   
5. Semantic Search (Chat)
   ├─> User query
   ├─> Generate query embedding
   ├─> Call search_similar_chunks() RPC function
   ├─> Build context from results
   └─> Send to OpenAI with context
```

### Environment Variables Needed:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
APIFY_API_TOKEN
APIFY_ACTOR_ID
USE_STAGEHAND_ACTOR (optional, default: false)
STAGEHAND_ACTOR_ID (optional)
```

---

## 8. KEY INSIGHTS & RECOMMENDATIONS

### Strengths:
1. **Complete pipeline**: Scraping → Storage → Embeddings → Search → Chat
2. **Flexible search**: Semantic + keyword + hybrid
3. **Scalable database**: PostgreSQL with vector indexes
4. **Monetization ready**: Stripe integration with usage tracking
5. **API-first**: Well-structured Next.js routes

### Areas for Improvement:
1. **Job queue**: Currently background processing is fire-and-forget; use Bull, BullMQ, or Supabase Functions for reliability
2. **Caching**: No caching layer for embeddings or frequent queries
3. **Async uploads**: Large file uploads should use signed URLs
4. **Monitoring**: No observability/logging for embeddings or search quality
5. **Error recovery**: Limited retry logic for failed scraping jobs
6. **Rate limiting**: Currently token-based, could add request-based limits

### Next Steps:
1. ✅ Connect Apify scraper to Supabase (already integrated)
2. ✅ Set up embeddings pipeline (already implemented)
3. ✅ Build semantic search (already functional)
4. ⚠️ Complete frontend UI for chat and document management
5. ⚠️ Add error handling and monitoring
6. ⚠️ Implement job queue for reliability
7. ⚠️ Add caching for performance

---

## 9. FILE STRUCTURE REFERENCE

```
/Users/owenhudson/ackindex/
├── supabase-schema.sql              # Stage 7: Core tables
├── supabase-migration-stage8.sql    # Vector embeddings
├── supabase-migration-stage9.sql    # User management
├── add-embedding-index.sql          # Performance index
├── fix-embedding-types.sql          # Type conversion
├── .env.local                       # Configuration (secrets included)
├── src/
│   ├── lib/
│   │   ├── embeddings.ts            # OpenAI embedding functions
│   │   ├── retrieval.ts             # Semantic search
│   │   ├── chatUtils.ts             # Chat utilities
│   │   ├── apifyScraper.ts          # Apify integration
│   │   ├── database.ts              # Supabase queries
│   │   ├── pdfParser.ts             # PDF text extraction
│   │   ├── chunking.ts              # Text chunking
│   │   ├── supabase.ts              # Supabase clients
│   │   ├── userProfile.ts           # User management
│   │   └── stripe.ts                # Stripe integration
│   └── app/api/
│       ├── chat/route.ts            # Chat endpoint
│       ├── admin/
│       │   ├── scrape-url/          # URL scraping
│       │   ├── upload-pdf/          # PDF upload
│       │   ├── generate-embeddings/ # Embedding generation
│       │   ├── documents/           # Document listing
│       │   └── ingest-external/     # External ingestion
│       ├── user/dashboard/          # User stats
│       └── stripe/                  # Stripe webhooks
├── apify-actors/
│   └── nantucket-playwright-scraper/
│       ├── main.py                  # Scraper logic
│       ├── requirements.txt         # Python deps
│       ├── Dockerfile
│       └── .actor/
│           ├── actor.json
│           └── input_schema.json
```

