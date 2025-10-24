# 🏗️ AckIndex Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐       │
│  │  Public Dashboard │              │ Admin Dashboard  │       │
│  │      (/)          │              │    (/admin)      │       │
│  ├──────────────────┤              ├──────────────────┤       │
│  │ • Search          │              │ • Login          │       │
│  │ • Filter          │              │ • Upload PDF     │       │
│  │ • View Cards      │              │ • View History   │       │
│  │ • View Charts     │              │ • Status         │       │
│  └────────┬─────────┘              └────────┬─────────┘       │
│           │                                   │                 │
└───────────┼───────────────────────────────────┼─────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NEXT.JS APP LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌──────────────────────┐     │
│  │   API Routes        │         │   React Components   │     │
│  ├─────────────────────┤         ├──────────────────────┤     │
│  │ GET /api/entries    │◄────────┤ • EntryCard         │     │
│  │ POST /api/upload    │         │ • ChartBlock        │     │
│  └─────────┬───────────┘         │ • MetricChip        │     │
│            │                     │ • SearchBar         │     │
│            │                     │ • CategoryTabs      │     │
│            │                     │ • UploadForm        │     │
│            │                     └──────────────────────┘     │
│            │                                                   │
└────────────┼───────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PDF Upload ──► Extract Text ──► AI Parse ──► Structure JSON  │
│      │              │                │               │          │
│      │              │                │               │          │
│  ┌───▼────┐    ┌───▼────┐      ┌───▼────┐     ┌───▼────┐    │
│  │ Validate│    │pdf-parse│      │ Claude │     │  JSON  │    │
│  │  File  │    │         │      │  API   │     │ Output │    │
│  └────────┘    └─────────┘      └────────┘     └────────┘    │
│                                      ▲                          │
│                                      │                          │
│                                  Alternative:                   │
│                                  ┌────────┐                     │
│                                  │ OpenAI │                     │
│                                  │  API   │                     │
│                                  └────────┘                     │
│                                                                 │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐           ┌──────────────────────┐     │
│  │   PostgreSQL      │           │  Supabase Storage    │     │
│  │   (Supabase)      │           │                      │     │
│  ├───────────────────┤           ├──────────────────────┤     │
│  │                   │           │                      │     │
│  │ entries           │           │ civic-documents/     │     │
│  │ ├─ id            │           │ └─ *.pdf            │     │
│  │ ├─ title         │           │                      │     │
│  │ ├─ category      │           └──────────────────────┘     │
│  │ ├─ summary       │                                         │
│  │ ├─ key_metrics   │           ┌──────────────────────┐     │
│  │ ├─ visualizations│           │  Authentication      │     │
│  │ └─ ...           │           │  (Supabase Auth)     │     │
│  │                  │           ├──────────────────────┤     │
│  │ Row Level        │           │ • Admin users        │     │
│  │ Security (RLS)   │           │ • Sessions           │     │
│  │                  │           │ • JWT tokens         │     │
│  └──────────────────┘           └──────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│   Admin     │
│  uploads    │
│    PDF      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              UPLOAD PROCESSING PIPELINE                 │
└─────────────────────────────────────────────────────────┘
       │
       ├─► 1. Validate file (type, size)
       │    └─► PDF only, max 10MB
       │
       ├─► 2. Extract text from PDF
       │    └─► pdf-parse library
       │
       ├─► 3. Send to AI API
       │    ├─► Claude 3.5 Sonnet (primary)
       │    └─► or OpenAI GPT-4o mini (alternative)
       │
       ├─► 4. Parse response
       │    └─► Extract JSON structure
       │
       ├─► 5. Store PDF in Supabase Storage
       │    └─► civic-documents/ bucket
       │
       └─► 6. Store structured data in database
            └─► entries table
       
       ▼
┌─────────────────────────────────────────────────────────┐
│                  STORED IN DATABASE                     │
├─────────────────────────────────────────────────────────┤
│  {                                                      │
│    "title": "FY2026 Budget Proposal",                 │
│    "category": "Budget",                               │
│    "summary": "The budget proposes...",                │
│    "key_metrics": [...],                               │
│    "visualizations": [...]                             │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              RENDERED ON PUBLIC DASHBOARD               │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐    │
│  │  📋 FY2026 Budget Proposal                    │    │
│  │  ─────────────────────────────────────────    │    │
│  │  Category: Budget  |  Source: Finance Dept   │    │
│  │                                                │    │
│  │  The budget proposes...                       │    │
│  │                                                │    │
│  │  💰 Total Budget: $128M                       │    │
│  │  📈 Increase: 5.2%                            │    │
│  │                                                │    │
│  │  [Bar Chart showing FY24, FY25, FY26]        │    │
│  └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
│
├── Layout
│   ├── Navigation
│   │   ├── Logo
│   │   └── Admin Link
│   │
│   ├── Main Content (children)
│   │
│   └── Footer
│
├── Home Page (/)
│   ├── Hero Section
│   ├── SearchBar
│   ├── CategoryTabs
│   └── FeedGrid
│       └── EntryCard (multiple)
│           ├── Header
│           │   ├── Title
│           │   └── Tags
│           ├── Summary (expandable)
│           ├── MetricChip (multiple)
│           ├── ChartBlock
│           │   └── Recharts Component
│           └── Footer (metadata)
│
└── Admin Page (/admin)
    ├── Login Form (if not authenticated)
    └── Dashboard (if authenticated)
        ├── UploadForm
        │   ├── Title Input
        │   ├── Category Select
        │   ├── Source Input
        │   ├── File Upload
        │   └── Submit Button
        └── Upload History
            └── History Item (multiple)
```

## Technology Stack Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT                             │
│                    ──────────────                           │
│                       Vercel                                │
│                  (Edge Network)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                     FRONTEND                                │
│                   ────────────                              │
│  Next.js 14  │  React  │  TypeScript                       │
│  Tailwind CSS  │  Framer Motion  │  Recharts               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    API LAYER                                │
│                  ──────────────                             │
│  Next.js API Routes  │  Server Actions                     │
│  SWR (data fetching)  │  Form handling                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
          ┌─────────▼──┐  ┌──▼──────────┐
          │ Supabase   │  │ AI APIs     │
          │            │  │             │
          │ PostgreSQL │  │ Claude      │
          │ Storage    │  │ 3.5 Sonnet  │
          │ Auth       │  │ or          │
          │            │  │ OpenAI      │
          └────────────┘  │ GPT-4o mini │
                          └─────────────┘
```

## Request Flow: Viewing Dashboard

```
1. User visits https://ackindex.com
   │
   ▼
2. Next.js renders page.tsx
   │
   ▼
3. useFetchEntries() hook triggers
   │
   ▼
4. GET /api/entries
   │
   ▼
5. Supabase query: SELECT * FROM entries
   │
   ▼
6. Data returned as JSON
   │
   ▼
7. SWR caches result
   │
   ▼
8. React components render
   │
   ├─► EntryCard components
   ├─► ChartBlock components
   └─► MetricChip components
   │
   ▼
9. User sees beautiful dashboard ✨
```

## Request Flow: Uploading Document

```
1. Admin visits /admin
   │
   ▼
2. Authenticates with Supabase
   │
   ▼
3. Fills form and uploads PDF
   │
   ▼
4. POST /api/upload with multipart form data
   │
   ▼
5. Server validates file
   │ ├─► Check file type (PDF)
   │ └─► Check file size (<10MB)
   │
   ▼
6. Extract text with pdf-parse
   │
   ▼
7. Send to Claude API
   │ ├─► System prompt (parsing instructions)
   │ └─► Document text
   │
   ▼
8. Claude returns structured JSON
   │ ├─► title, category, summary
   │ ├─► key_metrics array
   │ └─► visualizations array
   │
   ▼
9. Store PDF in Supabase Storage
   │
   ▼
10. Store JSON in database
    │
    ▼
11. Return success to client
    │
    ▼
12. Admin sees success message ✅
    │
    ▼
13. Public dashboard auto-updates 🔄
```

## Security Layers

```
┌─────────────────────────────────────────────┐
│         Frontend Validation                 │
│  • File type check                          │
│  • File size limit                          │
│  • Input sanitization                       │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│         API Route Protection                │
│  • Authentication check                     │
│  • Rate limiting                            │
│  • Request validation                       │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│        Database Security (RLS)              │
│  • Row Level Security policies              │
│  • Public read access                       │
│  • Authenticated write access               │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│        Environment Protection               │
│  • API keys in env variables                │
│  • Service role key separation              │
│  • CORS configuration                       │
└─────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      PRODUCTION                         │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Vercel     │  │  Supabase    │  │  Claude API  │
│   (App)      │  │  (Database)  │  │  (AI)        │
│              │  │              │  │              │
│ • Next.js    │  │ • PostgreSQL │  │ • Parsing    │
│ • SSR/SSG    │  │ • Storage    │  │ • Structured │
│ • Edge       │  │ • Auth       │  │   Output     │
│ • API Routes │  │ • RLS        │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │    Users     │
                  │  (Citizens)  │
                  └──────────────┘
```

## File Organization

```
ackindex-app/
│
├── 📱 app/                    # Next.js app directory
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   ├── globals.css            # Global styles
│   ├── 🔐 admin/              # Admin section
│   │   └── page.tsx           # Admin dashboard
│   └── 🔌 api/                # API routes
│       ├── entries/           # GET entries
│       └── upload/            # POST upload
│
├── 🧩 components/             # React components
│   ├── EntryCard.tsx          # Main content card
│   ├── ChartBlock.tsx         # Chart renderer
│   ├── MetricChip.tsx         # Metric display
│   ├── SearchBar.tsx          # Search input
│   ├── CategoryTabs.tsx       # Category filter
│   ├── FeedGrid.tsx           # Grid layout
│   └── UploadForm.tsx         # Upload interface
│
├── 🪝 hooks/                  # Custom hooks
│   └── useEntries.ts          # Data fetching
│
├── 📚 lib/                    # Utilities
│   ├── supabase.ts            # DB client
│   ├── ai-parser.ts           # AI integration
│   └── pdf-utils.ts           # PDF processing
│
├── 📝 types/                  # TypeScript types
│   └── index.ts               # Type definitions
│
├── ⚙️ Config files
│   ├── package.json           # Dependencies
│   ├── tsconfig.json          # TypeScript
│   ├── tailwind.config.js     # Tailwind
│   └── next.config.js         # Next.js
│
└── 📖 Documentation
    ├── README.md              # Main docs
    ├── QUICKSTART.md          # Setup guide
    ├── DEPLOYMENT.md          # Deploy guide
    ├── API.md                 # API reference
    └── SAMPLE_DATA.md         # Test data
```

---

This architecture provides:
- 🚀 **Performance**: Edge deployment, efficient caching
- 🔒 **Security**: Multi-layer protection, RLS policies
- 📈 **Scalability**: Serverless functions, CDN distribution
- 🎨 **Maintainability**: Clear separation of concerns
- 💪 **Reliability**: Type safety, error handling
