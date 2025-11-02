# CLAUDE_BASE.md - Core Project Identity

## Project Overview
**AckIndex** is a RAG (Retrieval Augmented Generation) chatbot for Nantucket civic data. Users ask questions about local government information and receive AI-powered answers with citations.

## Tech Stack Essentials
- **Frontend**: Next.js 14 (App Router), TailwindCSS, React hooks
- **Backend**: Next.js API Routes, Supabase (PostgreSQL 15 + pgvector)
- **AI/ML**: OpenAI GPT-4o-mini, text-embedding-ada-002 (1536-dim embeddings)
- **Data Pipeline**: Apify (web scraping), pdf-parse, custom chunking (500 tokens, 50 overlap)
- **Payments**: Stripe (Free: 3,500 tokens/month, Premium: $9.99/month unlimited)

## Universal Coding Standards

### Code Style
- **TypeScript**: Strict mode, explicit types, no `any`
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Error Handling**: Try-catch blocks, structured error responses
- **Async/Await**: Prefer over promises, handle all rejections
- **Comments**: Explain "why" not "what", document complex logic

### Security Rules
- **Never expose**: Service role keys, API secrets, user tokens
- **Always validate**: User inputs, URL formats, file types
- **Use RLS**: Row Level Security on all Supabase tables
- **Parameterize queries**: Prevent SQL injection
- **Rate limiting**: Token-based limits per subscription tier

### Performance Guidelines
- **Batch operations**: Embed 50-100 chunks at once
- **Index usage**: Ensure queries use IVFFlat/GIN indexes
- **Minimize API calls**: Cache when possible, deduplicate requests
- **Async processing**: Fire-and-forget for long-running tasks (scraping, embeddings)

## File Organization
```
/src
├── /app
│   ├── /api              # API routes (chat, admin, user)
│   └── page.tsx          # Main UI
├── /lib
│   ├── embeddings.ts     # OpenAI embedding functions
│   ├── retrieval.ts      # Semantic search & RAG
│   ├── apifyScraper.ts   # Web scraping
│   ├── database.ts       # Supabase queries
│   └── chunking.ts       # Text chunking logic
└── /components           # React components
```

## Key Constraints
- **Token optimization**: Minimize OpenAI API calls (costly)
- **Async scraping**: Scraping takes 1-5 min (fire-and-forget)
- **No job queue yet**: Current limitation, planned for Phase 1
- **Single-tenant**: No multi-org support (planned for later)

## Decision-Making Principles
1. **Reliability over speed**: Add error handling first
2. **Simplicity over features**: Ship working code, iterate later
3. **Cost awareness**: OpenAI tokens are expensive (~$0.02-0.03 per query)
4. **User experience**: Clear error messages, loading states, citations

## Reference Documents
- **ARCHITECTURE.md**: Technical decisions, schema, data flow
- **NEXT_STEPS.md**: Roadmap, priorities, timelines
- **DOCUMENTATION_INDEX.md**: All documentation links
