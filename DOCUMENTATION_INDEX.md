# AckIndex Documentation Index

## START HERE 🚀

### New to AckIndex?
1. Read **README.md** (5 min) - Project overview
2. Read **ARCHITECTURE.md** (15 min) - Technical architecture & decisions
3. Read **NEXT_STEPS.md** (10 min) - Roadmap & priorities

### Need Quick Reference?
→ **QUICK_REFERENCE.md** - Commands, APIs, troubleshooting

### Need Setup Help?
→ **SETUP-CHECKLIST.md** - Step-by-step setup guide

---

## Core Documentation

### 1. **README.md**
**Project Overview**
- What is AckIndex
- Tech stack summary
- Getting started
- Project structure

### 2. **ARCHITECTURE.md** ⭐ NEW
**Technical Architecture & Decisions**
- Complete tech stack breakdown
- Database schema with relationships
- Architecture decisions & trade-offs
- Data flow diagrams
- Security considerations
- Performance optimizations
- Cost structure
- Known limitations

### 3. **NEXT_STEPS.md** ⭐ NEW
**Roadmap & Action Plan**
- Current status (what's done vs. what's missing)
- Immediate priorities (next 2 weeks)
- Short-term goals (1 month)
- Medium-term goals (3 months)
- Long-term vision (6-12 months)
- Success metrics
- Resource requirements

### 4. **QUICK_REFERENCE.md**
**Quick Lookup Guide**
- ASCII architecture diagram
- Data flow visualization
- Database schema summary table
- Key functions by module
- API endpoint examples (curl commands)
- Common issues & solutions
- Environment variables

### 5. **PROJECT_OVERVIEW.md**
**Detailed System Overview**
- Database schema (all tables)
- AI/LLM integration details
- Data ingestion pipelines
- Apify actor configuration
- API endpoints (complete list)
- Integration flow diagrams
- File structure reference

### 6. **INTEGRATION_GUIDE.md**
**Code Examples & Data Flow**
- Complete code snippets
- Apify output format
- Data ingestion pipeline
- Embedding generation
- Semantic search RPC functions
- Chat endpoint implementation
- Testing examples

---

## Setup & Configuration

### Getting Started
- **SETUP-CHECKLIST.md** - Complete setup checklist
- **EMAIL-SETUP.md** - Resend email configuration
- **SUPABASE-AUTH-SETUP.md** - Authentication setup
- **STRIPE-SETUP.md** - Payment processing
- **SQL-MIGRATIONS-GUIDE.md** - Database migrations

### For Users
- **USER-GUIDE.md** - End-user documentation
- **ADDING_WEBSITES_GUIDE.md** - How to add new websites
- **MANUAL-SCRAPE-TRIGGER-GUIDE.md** - Manual scraping

---

## All Documentation Files

### Core Files
- `README.md` - Project overview
- `ARCHITECTURE.md` ⭐ - Technical architecture
- `NEXT_STEPS.md` ⭐ - Roadmap & priorities
- `QUICK_REFERENCE.md` - Quick reference guide
- `PROJECT_OVERVIEW.md` - Detailed system overview
- `INTEGRATION_GUIDE.md` - Code examples
- `DOCUMENTATION_INDEX.md` - This file

### Setup Guides
- `SETUP-CHECKLIST.md` - Setup checklist
- `EMAIL-SETUP.md` - Email configuration
- `SUPABASE-AUTH-SETUP.md` - Auth setup
- `STRIPE-SETUP.md` - Payment setup
- `SQL-MIGRATIONS-GUIDE.md` - Database migrations

### User Guides
- `USER-GUIDE.md` - End-user guide
- `ADDING_WEBSITES_GUIDE.md` - Adding websites
- `MANUAL-SCRAPE-TRIGGER-GUIDE.md` - Manual scraping

---

## File Locations

### Documentation (Root)
```
/Users/owenhudson/ackindex/
├── README.md
├── ARCHITECTURE.md              ← NEW
├── NEXT_STEPS.md                ← NEW
├── QUICK_REFERENCE.md
├── PROJECT_OVERVIEW.md
├── INTEGRATION_GUIDE.md
├── DOCUMENTATION_INDEX.md
└── ... (other .md files)
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

## Quick Task Guide

| I want to... | Read this |
|--------------|-----------|
| Understand the architecture | ARCHITECTURE.md |
| Know what to build next | NEXT_STEPS.md |
| Set up the project | SETUP-CHECKLIST.md |
| Find API endpoints | QUICK_REFERENCE.md |
| See code examples | INTEGRATION_GUIDE.md |
| Configure Stripe | STRIPE-SETUP.md |
| Add new websites | ADDING_WEBSITES_GUIDE.md |
| Help end users | USER-GUIDE.md |

---

## Project Status

| Component | Status | Documentation |
|-----------|--------|---------------|
| Database Schema | ✅ Complete | ARCHITECTURE.md, PROJECT_OVERVIEW.md |
| Vector Embeddings | ✅ Complete | ARCHITECTURE.md, INTEGRATION_GUIDE.md |
| Semantic Search | ✅ Complete | INTEGRATION_GUIDE.md |
| Chat/RAG Pipeline | ✅ Complete | INTEGRATION_GUIDE.md |
| Web Scraping | ✅ Complete | ADDING_WEBSITES_GUIDE.md |
| Authentication | ✅ Complete | SUPABASE-AUTH-SETUP.md |
| Payments | ✅ Complete | STRIPE-SETUP.md |
| Frontend UI | ⚠️ Partial | NEXT_STEPS.md (see priorities) |
| Admin Dashboard | ⚠️ Basic | NEXT_STEPS.md (see enhancements) |
| Job Queue | ❌ Missing | NEXT_STEPS.md (immediate priority) |
| Caching | ❌ Missing | NEXT_STEPS.md (short-term) |
| Analytics | ❌ Missing | NEXT_STEPS.md (medium-term) |

---

Last Updated: 2025-11-02
