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
2. **PDF text extraction** → `lib/pdf-utils.ts` using pdf-parse
3. **AI parsing** → `lib/ai-parser.ts` (Claude primary, OpenAI fallback)
4. **Storage** → Supabase Storage (PDF) + PostgreSQL (structured data)
5. **Display** → Public dashboard at `/` fetches via `/api/entries`

### Key Files

- **`app/api/upload/route.ts`** - Handles PDF upload, text extraction, AI parsing, storage
- **`lib/ai-parser.ts`** - AI parsing logic with structured prompts for civic data
- **`lib/pdf-utils.ts`** - PDF text extraction using pdf-parse
- **`lib/supabase.ts`** - Supabase client initialization (client + service role)
- **`types/index.ts`** - TypeScript types for CivicEntry, ParsedCivicData, etc.

### Components

- **`EntryCard.tsx`** - Main card component displaying civic entries
- **`ChartBlock.tsx`** - Renders Recharts visualizations from parsed data
- **`UploadForm.tsx`** - Admin PDF upload form with validation

### AI Parsing Schema

The AI parsers (`parseDocumentWithClaude` / `parseDocumentWithOpenAI`) extract structured JSON:

```typescript
{
  title: string;              // Document headline
  source: string;             // Issuing department
  category: Category;         // Budget | Real Estate | Town Meeting | Infrastructure | General
  summary: string;            // 2-paragraph summary (400 words max)
  key_metrics: [              // Important numbers
    { label: string, value: string }
  ],
  visualizations: [           // Chart data
    { type: 'bar' | 'line' | 'pie' | 'donut' | 'timeline' | 'table',
      labels: string[],
      values: number[] }
  ],
  notable_updates: string[];  // Key highlights
  date_published: string;     // YYYY-MM-DD format
  document_excerpt: string;   // Optional excerpt
}
```

## Important Implementation Details

### PDF Text Extraction
- Uses `unpdf` - a modern, serverless-friendly PDF text extraction library
- Pure JavaScript implementation with no native dependencies
- Import: `const { extractText } = await import('unpdf');`
- Returns an array of strings (one per page) which we join together
- Works perfectly in Vercel serverless environment (no canvas/DOM dependencies)
- Located in `lib/pdf-utils.ts:1-25`

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
3. Verify Supabase connection: use `/api/test-supabase` endpoint
4. Test simple upload: use `/api/test-upload` endpoint

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

- **2025-10-24:** Fixed Vercel serverless PDF parsing by switching to `unpdf` library (pure JavaScript, no native dependencies)
- **2025-10-24:** Removed `pdf-parse`, `pdfjs-dist`, and `canvas` packages that don't work in serverless environments
- **2025-10-23:** Added comprehensive debugging to upload API
- **2025-10-23:** Added test endpoints for upload and Supabase connection

## Documentation

- **README.md** - Complete project documentation
- **QUICKSTART.md** - 10-minute setup guide
- **ARCHITECTURE.md** - Visual system architecture diagrams
- **API.md** - API endpoint reference
- **DEPLOYMENT.md** - Vercel deployment guide
