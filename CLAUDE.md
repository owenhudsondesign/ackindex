# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AckIndex is a Next.js 14 civic intelligence dashboard that transforms government PDFs into structured, visualized data for Nantucket, Massachusetts. It uses AI (Claude 3.5 Sonnet or GPT-4o mini) to parse civic documents and extract key facts, metrics, and insights.

**Tech Stack:** Next.js 14 (App Router), TypeScript, TailwindCSS, Supabase (PostgreSQL + Auth + Storage), Recharts, Framer Motion

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key  # Primary AI parser
OPENAI_API_KEY=your_openai_key        # Fallback AI parser
```

## Database Setup

Run `supabase-setup.sql` in Supabase SQL Editor to create:
- `entries` table with RLS policies
- `civic-documents` storage bucket
- Indexes for performance
- Updated_at trigger

## Architecture

### Core Data Flow

1. **Admin uploads PDF** → `/admin` page
2. **PDF text extraction** → `lib/pdf-utils.ts` using unpdf
3. **AI parsing** → `lib/ai-parser.ts` (Claude primary, OpenAI fallback)
4. **Storage** → Supabase Storage (PDF) + PostgreSQL (structured data)
5. **Dashboard aggregation** → `/api/dashboard` aggregates all document data
6. **Conversational Q&A** → `/api/chat` provides multi-turn AI conversations
7. **Display** → Public dashboard at `/` shows ChatBot + aggregated insights

### Dashboard Architecture (Q&A-First Approach)

AckIndex is a **civic intelligence dashboard**, not a document browser. The homepage prioritizes:

1. **ChatBot (Centerpiece)** - Multi-turn conversational AI for citizen questions
2. **Key Metrics Dashboard** - Aggregated metrics from all documents
3. **Top Insights** - Most important 3 insights (ranked by impact)
4. **Trend Charts** - Visual patterns over time

Citizens ask questions like "Why did my taxes go up?" and get instant answers with sources.

### Key Files

- **`app/api/upload/route.ts`** - Handles manual PDF upload, text extraction, AI parsing, storage
- **`app/api/parse-link/route.ts`** - **NEW:** Automated URL crawling - discovers and processes PDFs from any webpage
- **`app/api/dashboard/route.ts`** - Aggregates data from all documents for dashboard view
- **`app/api/chat/route.ts`** - Multi-turn conversational Q&A with message history
- **`lib/ai-parser.ts`** - AI parsing logic with structured prompts for civic data
- **`lib/pdf-utils.ts`** - PDF text extraction using unpdf
- **`lib/supabase.ts`** - Supabase client initialization (client + service role)
- **`types/index.ts`** - TypeScript types for CivicEntry, ParsedCivicData, Insight, etc.

### Components

**Dashboard Components:**
- **`ChatBot.tsx`** - Multi-turn conversational Q&A interface (centerpiece)
- **`KeyMetricsDashboard.tsx`** - Grid of aggregated metrics from all documents
- **`TopInsights.tsx`** - Top 3 most important insights with visual hierarchy
- **`TrendCharts.tsx`** - Line/bar charts showing patterns over time

**Data Display Components:**
- **`EntryCard.tsx`** - Card component for individual civic entries
- **`ChartBlock.tsx`** - Renders Recharts visualizations from parsed data
- **`InsightCard.tsx`** - Displays AI-generated insights (concern/success/neutral)
- **`ComparisonCard.tsx`** - Side-by-side data comparisons
- **`MetricChip.tsx`** - Displays metrics with trend indicators

**Admin Components:**
- **`UploadForm.tsx`** - Manual PDF upload form with validation
- **`LinkIngestionForm.tsx`** - **NEW:** Automated URL crawling interface for batch document processing

### AI Parsing Schema

The AI parsers (`parseDocumentWithClaude` / `parseDocumentWithOpenAI`) extract structured JSON:

```typescript
{
  title: string;              // Document headline
  source: string;             // Issuing department
  category: Category;         // Budget | Real Estate | Town Meeting | Infrastructure | General
  summary: string;            // 2-paragraph summary (400 words max) with key insights
  key_metrics: [              // Important numbers with trends
    {
      label: string,
      value: string,
      trend?: 'up' | 'down' | 'stable',
      change_pct?: number
    }
  ],
  visualizations: [           // Chart data with insights
    {
      type: 'bar' | 'line' | 'pie' | 'donut' | 'timeline' | 'table',
      title?: string,
      labels: string[],
      values: number[],
      insight?: string,
      highlight_index?: number
    }
  ],
  insights: [                 // AI-generated insights (NEW)
    {
      type: 'concern' | 'success' | 'neutral',
      title: string,
      description: string,
      impact: 'high' | 'medium' | 'low'
    }
  ],
  comparisons: [              // Side-by-side comparisons (NEW)
    {
      title: string,
      category_a: string,
      value_a: string,
      category_b: string,
      value_b: string,
      winner: string
    }
  ],
  plain_english_summary: string[];  // Plain English bullet points (NEW)
  notable_updates: string[];        // Key highlights
  date_published: string;           // YYYY-MM-DD format
  document_excerpt: string;         // Optional excerpt
}
```

The AI parser is instructed to:
- Identify trends and calculate year-over-year changes
- Flag concerns (expenses growing >10%, budget issues)
- Find insights and calculate ratios
- Compare categories (which growing fastest/slowest)
- Provide plain English explanations for citizens

## Important Implementation Details

### Link-Based Document Ingestion (Automated Crawling)

AckIndex now supports **automated document discovery** - admins can paste any Nantucket government URL and the system will:

1. **Crawl the page** using Cheerio HTML parser
2. **Find all PDF links** on the page (same-domain only for security)
3. **Download each PDF** and extract text
4. **Parse with AI** to generate summaries, insights, and structured data
5. **Deduplicate** based on URL and title to avoid processing the same document twice
6. **Store in database** with all metadata

**Key Features:**
- **Batch processing:** Process multiple PDFs from a single URL submission
- **Automatic deduplication:** Skips documents already in database
- **Progress tracking:** Real-time feedback on crawl progress
- **Error handling:** Continues processing even if individual PDFs fail
- **Same-domain restriction:** Only follows links from nantucket-ma.gov for security

**Technical Details:**
- Uses `cheerio` for HTML parsing (server-side jQuery-like API)
- Converts relative PDF URLs to absolute URLs automatically
- Downloads PDFs to memory (no disk storage) for parsing
- Extracts document titles from URLs as fallback
- Maximum duration: 5 minutes (configurable via `maxDuration`)

**Example URLs:**
- `https://nantucket-ma.gov/AgendaCenter/Select-Board-3` - Agenda center pages
- `https://nantucket-ma.gov/DocumentCenter` - Document center
- Any page with embedded PDF links

Located in `app/api/parse-link/route.ts:1-252` and `components/LinkIngestionForm.tsx:1-245`

### PDF Text Extraction
- Uses `unpdf` - a modern, serverless-friendly PDF text extraction library
- Pure JavaScript implementation with no native dependencies
- Import: `const { extractText } = await import('unpdf');`
- **Important:** Requires `Uint8Array` input, so convert Buffer: `new Uint8Array(buffer)`
- Returns an array of strings (one per page) which we join together
- Works perfectly in Vercel serverless environment (no canvas/DOM dependencies)
- Located in `lib/pdf-utils.ts:1-28`

### AI Parsing Strategy
- **Primary:** Claude 3.5 Sonnet via Anthropic API
- **Fallback:** GPT-4o mini via OpenAI API (if Claude fails)
- System prompt emphasizes: factual, concise, neutral civic data
- Document text limited to 50,000 characters for API calls
- Located in `lib/ai-parser.ts:36-160`

### Supabase Client Usage
- **Client-side:** `supabase` (anon key) for public reads
- **Server-side:** `getServiceSupabase()` (service role key) for writes
- Service client disables session persistence for security
- Located in `lib/supabase.ts:1-27`

### Upload Processing
- Maximum file size: 10MB
- File validation: PDF only
- Minimum extracted text: 50 characters
- Runtime: nodejs (not edge)
- Max duration: 60 seconds
- Located in `app/api/upload/route.ts:1-147`

### Database Schema
- Table: `public.entries`
- RLS: Public read, authenticated write
- Indexes on: category, created_at, date_published
- JSONB columns: key_metrics, visualizations, notable_updates

## Path Aliases

TypeScript path alias configured: `@/*` maps to root directory

Example: `import { supabase } from '@/lib/supabase'`

## Design System

Apple-inspired design with:
- Rounded corners: `rounded-2xl` (16px)
- Colors: `ack-blue` (#5B8FB9), `ack-sand` (#C7B299), `ack-gray` (#6B7280)
- Font: Inter (via Next.js font optimization)
- Animations: Framer Motion for smooth transitions

## Common Tasks

### Adding a new API endpoint
Create `app/api/[name]/route.ts` with exported `GET` or `POST` functions

### Modifying AI parsing output
Edit parsing instructions in `lib/ai-parser.ts:9-34` and update TypeScript types in `types/index.ts`

### Adding a new civic category
1. Update `Category` type in `types/index.ts:1`
2. Update database CHECK constraint in `supabase-setup.sql:9`
3. Update category filter in `components/CategoryTabs.tsx`

### Debugging upload failures
1. Check browser console for client-side errors
2. Check server logs for API errors (shows env var status, AI parsing logs)
3. Check Vercel function logs in Vercel dashboard
4. Verify environment variables are set correctly in Vercel project settings
5. Test locally with `npm run dev` before deploying

## Testing

No formal test suite currently. Manual testing via:
- Upload test PDFs through `/admin`
- Verify parsing output in Supabase dashboard
- Check public display at `/`

## Deployment

Deploy to Vercel:
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Vercel auto-deploys on push to main branch

Ensure environment variables match production Supabase project and API keys.

## Recent Changes

- **2025-10-24:** **AUTOMATED DOCUMENT INGESTION** - Added link-based crawling for batch document processing:
  - **Link Ingestion API:** `/api/parse-link` endpoint crawls any URL for PDFs
  - **Automated Discovery:** Finds and downloads all PDF links from government webpages
  - **Batch Processing:** Process multiple PDFs from a single URL submission
  - **Smart Deduplication:** Automatically skips documents already in database
  - **LinkIngestionForm Component:** User-friendly admin interface with progress tracking
  - **Error Resilience:** Continues processing even if individual PDFs fail
  - Transforms AckIndex from manual upload tool to **self-updating civic knowledge base**

- **2025-10-24:** **MAJOR ARCHITECTURAL TRANSFORMATION** - Converted from document browser to civic intelligence dashboard:
  - **New Homepage:** Completely rewritten to prioritize Q&A over document browsing
  - **ChatBot Component:** Multi-turn conversational AI interface as centerpiece (components/ChatBot.tsx:1-156)
  - **KeyMetricsDashboard:** Aggregated metrics from all documents (components/KeyMetricsDashboard.tsx:1-87)
  - **TopInsights:** Top 3 most important insights ranked by impact (components/TopInsights.tsx:1-118)
  - **TrendCharts:** Visual patterns over time using Recharts (components/TrendCharts.tsx:1-125)
  - **API Endpoints:**
    - `/api/dashboard` - Aggregates data from all documents for dashboard view
    - `/api/chat` - Multi-turn conversational Q&A with message history
  - **Philosophy:** Citizens don't need another PDF viewer - they need answers to real questions like "Why did my taxes go up?"

- **2025-10-24:** Enhanced AI parsing with civic intelligence features:
  - AI parsing now extracts insights, comparisons, trends, and plain English summaries
  - Added InsightCard component (concern/success/neutral alerts)
  - Added ComparisonCard component (side-by-side data comparisons)
  - Enhanced MetricChip with trend indicators (↑↓→) and percentage changes
  - Enhanced ChartBlock with titles, insights, and highlighting
  - Updated database schema with insights, comparisons, and plain_english_summary columns

- **2025-10-24:** Fixed Buffer to Uint8Array conversion for `unpdf` library
- **2025-10-24:** Removed test/debug API routes from production build
- **2025-10-24:** Fixed Vercel serverless PDF parsing by switching to `unpdf` library (pure JavaScript, no native dependencies)
- **2025-10-24:** Removed `pdf-parse`, `pdfjs-dist`, and `canvas` packages that don't work in serverless environments
- **2025-10-23:** Added comprehensive debugging to upload API

## Documentation

- **README.md** - Complete project documentation
- **QUICKSTART.md** - 10-minute setup guide
- **ARCHITECTURE.md** - Visual system architecture diagrams
- **API.md** - API endpoint reference
- **DEPLOYMENT.md** - Vercel deployment guide
