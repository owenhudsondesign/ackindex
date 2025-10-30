# AckIndex Documentation Index

## START HERE

### 1. **PROJECT_OVERVIEW.md** (15 KB)
**The Complete System Architecture**
- Database schema (9 tables with relationships)
- All 9 stages of development
- OpenAI embeddings & chat integration
- Apify scraping configuration
- API endpoints (8+ routes)
- What's built vs what needs to be built
- Integration flow diagram
- File structure reference

**Read this if you want:** Full understanding of the entire system

### 2. **QUICK_REFERENCE.md** (8 KB)
**Quick Lookup Guide**
- ASCII architecture diagram
- Data flow visualization
- Database schema summary table
- Key functions by module
- API endpoint examples (with curl commands)
- Subscription tiers
- Environment variables checklist
- Common issues & solutions
- Performance notes
- Production checklist

**Read this if you want:** Fast reference for common questions

### 3. **INTEGRATION_GUIDE.md** (12 KB)
**Code Examples & Data Flow**
- Complete code snippets for each stage
- Apify output format (Python)
- Data ingestion pipeline (TypeScript)
- Embedding generation process
- Semantic search RPC function (SQL)
- Chat endpoint with context building
- Database schema details
- Complete flow summary with numbered steps
- Testing examples (curl commands)

**Read this if you want:** To understand how everything connects with actual code

---

## QUICK NAVIGATION

### Setup & Configuration
- **SETUP-CHECKLIST.md** - Initial project setup
- **SUPABASE-AUTH-SETUP.md** - Authentication configuration
- **STRIPE-SETUP.md** - Payment processing
- **EMAIL-SETUP.md** - SendGrid configuration

### Database & Migrations
- **SQL-MIGRATIONS-GUIDE.md** - How to apply database migrations
- **STAGE-7-COMPLETE.md** - Document/chunk tables (detailed)
- **STAGE-8-COMPLETE.md** - Vector embeddings (detailed)
- **STAGE-9-COMPLETE.md** - User profiles & subscriptions (detailed)

### Apify Scrapers
- **ACTOR-COMPARISON.md** - Stagehand vs Python actor comparison
- **APIFY-ACTOR-FIX-SUMMARY.md** - Recent fixes and improvements
- **APIFY-DEPLOYMENT-CHECKLIST.md** - Deployment steps
- **STAGEHAND-ACTOR-SUMMARY.md** - Stagehand-specific details

### Troubleshooting
- **DIAGNOSIS-AND-FIX.md** - Common issues and solutions
- **EMBEDDING-FIX-REQUIRED.md** - Embedding type issues
- **APIFY-DEBUGGING-NEXT-STEPS.md** - Debugging Apify issues
- **IMMEDIATE-ACTION-PLAN.md** - Priority fixes

### User Guides
- **USER-GUIDE.md** - How to use the application
- **README.md** - Project README

---

## FILE LOCATIONS (Absolute Paths)

### Documentation Files
```
/Users/owenhudson/ackindex/
├── PROJECT_OVERVIEW.md              ← Start here for overview
├── QUICK_REFERENCE.md               ← Start here for quick lookup
├── INTEGRATION_GUIDE.md             ← Start here for code examples
└── DOCUMENTATION_INDEX.md           ← You are here
```

### Source Code - Core Libraries
```
/Users/owenhudson/ackindex/src/lib/
├── embeddings.ts                    # OpenAI embedding functions
├── retrieval.ts                     # Semantic search & RAG
├── chatUtils.ts                     # Chat helper functions
├── apifyScraper.ts                  # Apify integration
├── database.ts                      # Supabase queries
├── pdfParser.ts                     # PDF text extraction
├── chunking.ts                      # Text chunking logic
├── supabase.ts                      # Supabase clients
├── userProfile.ts                   # User management
└── stripe.ts                        # Stripe integration
```

### Source Code - API Routes
```
/Users/owenhudson/ackindex/src/app/api/
├── chat/route.ts                    # POST: Chat with AI + RAG
├── admin/
│   ├── scrape-url/route.ts          # POST: Trigger Apify scraping
│   ├── upload-pdf/route.ts          # POST: Upload PDF files
│   ├── generate-embeddings/route.ts # POST/GET: Batch embeddings
│   ├── documents/route.ts           # GET: List documents
│   └── ingest-external/route.ts     # POST: Ingest external PDFs
├── user/
│   └── dashboard/route.ts           # GET: User stats
├── auth/
│   └── signup/route.ts              # POST: User registration
└── stripe/
    ├── create-checkout/route.ts     # POST: Create checkout
    ├── portal/route.ts              # GET: Billing portal
    └── webhook/route.ts             # POST: Payment webhooks
```

### Database Migrations (SQL)
```
/Users/owenhudson/ackindex/
├── supabase-schema.sql              # Stage 7: Core tables
├── supabase-migration-stage8.sql    # Vector embeddings
├── supabase-migration-stage9.sql    # User management
├── add-embedding-index.sql          # Performance optimization
└── fix-embedding-types.sql          # Type conversion
```

### Apify Actors
```
/Users/owenhudson/ackindex/apify-actors/nantucket-playwright-scraper/
├── main.py                          # Python scraper logic
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Container configuration
└── .actor/
    ├── actor.json                   # Actor metadata
    └── input_schema.json            # Input configuration
```

---

## KEY COMPONENTS AT A GLANCE

### 1. Database (Supabase PostgreSQL with pgvector)
- **documents** - Track uploaded/scraped documents
- **document_chunks** - Store parsed content with embeddings
- **scrape_jobs** - Track Apify job status
- **user_profiles** - User info & subscription tier
- **usage_tracking** - Monthly token usage per user
- **subscription_history** - Audit trail of changes
- **email_subscribers** - Newsletter subscriptions

### 2. APIs (Next.js Routes)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/chat | POST | Chat with context from embeddings |
| /api/admin/scrape-url | POST | Trigger Apify scraping |
| /api/admin/generate-embeddings | POST | Generate embeddings for chunks |
| /api/admin/documents | GET | List documents |
| /api/user/dashboard | GET | User stats & usage |

### 3. AI Integration
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Chat**: OpenAI GPT-4 or GPT-4o
- **Semantic Search**: Cosine similarity on vector embeddings
- **RAG Pipeline**: Query → Embedding → Search → Context → Chat

### 4. Web Scraping
- **Actor**: Nantucket Playwright Scraper (Python)
- **Technology**: Playwright + BeautifulSoup + PyPDF2
- **Features**: PDF extraction, table extraction, AI-powered cleaning
- **Integration**: Apify dataset → Next.js API → Supabase

---

## DEVELOPMENT WORKFLOW

### To Scrape a Website:
1. User submits URL → `/api/admin/scrape-url`
2. Apify actor crawls site, extracts PDFs
3. Results stored in Supabase document_chunks (embedding=NULL)
4. Run `/api/admin/generate-embeddings` to create vectors
5. Chunks are now searchable via semantic search

### To Answer a Question:
1. User sends query → `/api/chat`
2. Generate embedding of query (OpenAI)
3. Search similar chunks (Supabase RPC)
4. Build context from results
5. Send to OpenAI with context
6. Return response + citations

### To Add a New Feature:
1. Add API route in `/src/app/api/...`
2. Add library function in `/src/lib/...`
3. Use Supabase client for database
4. Track token usage for rate limiting
5. Add RLS policies if needed

---

## TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ | Web UI (partially built) |
| **Backend API** | Next.js API Routes | Chat, scraping, embeddings |
| **Database** | Supabase (PostgreSQL) | Document storage |
| **Vector DB** | pgvector (PostgreSQL) | Semantic search |
| **Embeddings** | OpenAI text-embedding-ada-002 | Vector representations |
| **LLM** | OpenAI GPT-4 | Chat responses |
| **Scraping** | Apify + Playwright | Web crawling |
| **PDF Parsing** | pdf-parse | Text extraction |
| **Auth** | Supabase Auth | User authentication |
| **Payments** | Stripe | Subscription billing |

---

## COMMON TASKS

### Check what's implemented:
→ Read **PROJECT_OVERVIEW.md**, Section 6

### Understand data flow:
→ Read **INTEGRATION_GUIDE.md**, Section "Complete Flow Summary"

### Find specific code:
→ Check **QUICK_REFERENCE.md**, "Key Functions & Their Purpose"

### Debug embedding issues:
→ Read **EMBEDDING-FIX-REQUIRED.md** or **DIAGNOSIS-AND-FIX.md**

### Deploy to production:
→ Read **APIFY-DEPLOYMENT-CHECKLIST.md** and **SETUP-CHECKLIST.md**

### Understand API endpoints:
→ Read **QUICK_REFERENCE.md**, "API Quick Reference" or **PROJECT_OVERVIEW.md**, Section 5

### Check environment variables:
→ See **QUICK_REFERENCE.md**, "Environment Variables Required" or `.env.local` file

### Troubleshoot Apify:
→ Read **APIFY-DEBUGGING-NEXT-STEPS.md** or **ACTOR-COMPARISON.md**

---

## CONFIGURATION

### Environment Variables (in .env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Apify
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=legible_radish/ackindex-pdf-actor

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Database Migrations
Apply in this order:
1. `supabase-schema.sql` (Stage 7)
2. `supabase-migration-stage8.sql` (Vector embeddings)
3. `supabase-migration-stage9.sql` (User management)
4. `add-embedding-index.sql` (After 1000+ chunks)
5. `fix-embedding-types.sql` (If needed)

---

## NEXT STEPS

### For Understanding the System:
1. Read **PROJECT_OVERVIEW.md** (15 min)
2. Read **QUICK_REFERENCE.md** (10 min)
3. Skim **INTEGRATION_GUIDE.md** (10 min)

### For Development:
1. Check **SETUP-CHECKLIST.md**
2. Review relevant code in src/lib/ and src/app/api/
3. Reference **INTEGRATION_GUIDE.md** for implementation details

### For Troubleshooting:
1. Check **DIAGNOSIS-AND-FIX.md**
2. Search relevant files (EMBEDDING-FIX*, APIFY-DEBUGGING*)
3. Check **QUICK_REFERENCE.md** for common issues

---

## VERSION INFO

- **Project Status**: Stage 9 Complete (User management & subscriptions)
- **Latest Migration**: supabase-migration-stage9.sql
- **Frontend Status**: Partially built (needs completion)
- **API Status**: Fully implemented (8+ routes)
- **Database Status**: Production ready
- **Scraper Status**: Working (Playwright-based)
- **Embeddings Status**: Working (OpenAI integration complete)

---

## SUPPORT MATRIX

| Feature | Status | Doc Location |
|---------|--------|--------------|
| Database Schema | ✅ Complete | PROJECT_OVERVIEW.md § 1 |
| Vector Embeddings | ✅ Complete | INTEGRATION_GUIDE.md § 5 |
| Semantic Search | ✅ Complete | INTEGRATION_GUIDE.md § 6 |
| Chat/RAG | ✅ Complete | INTEGRATION_GUIDE.md § 7 |
| Web Scraping | ✅ Complete | INTEGRATION_GUIDE.md § 2-3 |
| User Auth | ✅ Complete | SUPABASE-AUTH-SETUP.md |
| Payments | ✅ Complete | STRIPE-SETUP.md |
| Frontend UI | ⚠️ Partial | USER-GUIDE.md |
| Admin Dashboard | ❌ Missing | PROJECT_OVERVIEW.md § 6 |
| Caching Layer | ❌ Missing | PROJECT_OVERVIEW.md § 8 |
| Job Queue | ❌ Missing | PROJECT_OVERVIEW.md § 8 |

---

Last Updated: October 30, 2024
