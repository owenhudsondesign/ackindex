# Contributing to AckIndex

Thank you for considering contributing to AckIndex! This guide will help you get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on what is best for the community
- Show empathy towards others
- Gracefully accept constructive criticism

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- Basic understanding of:
  - Next.js 16
  - React 19
  - TypeScript
  - Supabase (PostgreSQL)
  - RAG (Retrieval Augmented Generation)

### Initial Setup

1. **Fork and Clone**

```bash
git clone https://github.com/yourusername/ackindex.git
cd ackindex
```

2. **Install Dependencies**

```bash
npm install
```

3. **Set Up Environment**

Follow `SETUP_GUIDE.md` to configure all services.

4. **Run Development Server**

```bash
npm run dev
npm run worker  # In separate terminal
```

5. **Verify Setup**

- Visit http://localhost:3000
- Test chat functionality
- Access admin panel at `/admin/login`

---

## Development Workflow

### Branching Strategy

We use a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch (if using)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Creating a Branch

```bash
# Feature branch
git checkout -b feature/add-export-feature

# Bug fix branch
git checkout -b fix/conversation-loading-bug

# Documentation
git checkout -b docs/update-api-reference
```

### Commit Messages

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples**:

```bash
feat(chat): add typing indicators during AI response

fix(admin): correct pagination bug in documents list

docs(api): update rate limiting documentation

refactor(embeddings): optimize batch processing logic
```

---

## Code Standards

### TypeScript

- **Strict mode enabled** - No implicit `any` types
- **Type everything** - Avoid `any`, use proper types
- **Interfaces over types** - Prefer `interface` for object shapes
- **Enums for constants** - Use enums for related constants

**Good**:
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

async function sendMessage(message: ChatMessage): Promise<ChatResponse> {
  // Implementation
}
```

**Bad**:
```typescript
function sendMessage(message: any) {
  // Implementation
}
```

### React Components

- **Functional components** - No class components
- **TypeScript** - All components must be typed
- **Props interfaces** - Define interfaces for all props
- **Server/Client components** - Mark client components with `'use client'`

**Example**:
```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message..."
}: ChatInputProps) {
  // Implementation
}
```

### Styling

- **TailwindCSS** - Use Tailwind utility classes
- **Consistent spacing** - Use Tailwind spacing scale
- **Mobile-first** - Design for mobile, enhance for desktop
- **Dark mode** - Support dark mode where applicable

**Example**:
```tsx
<div className="flex flex-col gap-4 p-4 md:p-6 lg:p-8
                bg-white dark:bg-gray-800 rounded-lg shadow">
  {/* Content */}
</div>
```

### API Routes

- **Structured logging** - Use Pino logger, not `console.log`
- **Error handling** - Always wrap in try-catch
- **Type safety** - Type request/response bodies
- **Authentication** - Check auth where required

**Example**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info({ endpoint: '/api/chat', body }, 'Chat request received');

    // Implementation

    return NextResponse.json({ response: 'Success' });
  } catch (error) {
    logger.error({ error }, 'Chat request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Database Queries

- **Type-safe queries** - Use Supabase TypeScript support
- **RLS policies** - Respect Row Level Security
- **Error handling** - Check for errors in responses
- **Specific columns** - Don't use `SELECT *` in production

**Good**:
```typescript
const { data, error } = await supabase
  .from('documents')
  .select('id, title, url, status, created_at')
  .eq('status', 'completed')
  .limit(50);

if (error) {
  logger.error({ error }, 'Database query failed');
  throw error;
}
```

**Bad**:
```typescript
const { data } = await supabase
  .from('documents')
  .select('*');
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- embeddings.test.ts

# Run with coverage
npm test -- --coverage
```

### Writing Tests

**Unit Tests** (functions, utilities):

```typescript
import { describe, it, expect } from 'vitest';
import { chunkText } from '@/lib/chunking';

describe('chunkText', () => {
  it('should split text into chunks of max size', () => {
    const text = 'a'.repeat(1000);
    const chunks = chunkText(text, 500);

    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBeLessThanOrEqual(500);
  });

  it('should handle overlap correctly', () => {
    const text = 'Hello world this is a test';
    const chunks = chunkText(text, 10, 3);

    expect(chunks.length).toBeGreaterThan(1);
    // Verify overlap
  });
});
```

**Integration Tests** (API routes):

```typescript
import { describe, it, expect } from 'vitest';

describe('POST /api/chat', () => {
  it('should return AI response', async () => {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('response');
    expect(data).toHaveProperty('sources');
  });
});
```

### Test Coverage Goals

- **Critical paths**: 80%+ coverage
- **Utility functions**: 90%+ coverage
- **UI components**: 60%+ coverage

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] Changes are documented
- [ ] No console.log statements (use logger)

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How were these changes tested?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] TypeScript compiles
- [ ] Follows code standards

## Screenshots (if applicable)
```

### Review Process

1. **Automated checks** - CI runs tests and linting
2. **Code review** - At least one approval required
3. **Testing** - Reviewer tests changes locally
4. **Merge** - Squash and merge to main

### After Merge

- Delete your feature branch
- Pull latest main: `git pull origin main`
- Deployment happens automatically (Vercel + Railway)

---

## Project Structure

```
ackindex/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── api/                # API endpoints
│   │   │   ├── chat/           # Chat endpoint
│   │   │   ├── admin/          # Admin endpoints
│   │   │   ├── user/           # User endpoints
│   │   │   └── stripe/         # Payment webhooks
│   │   ├── admin/              # Admin pages
│   │   ├── account/            # User account page
│   │   └── page.tsx            # Homepage (chat interface)
│   │
│   ├── components/             # React components
│   │   ├── ChatInput.tsx       # Chat input component
│   │   ├── ChatMessage.tsx     # Message display
│   │   ├── Header.tsx          # Site header
│   │   └── ...
│   │
│   └── lib/                    # Utility functions
│       ├── analytics.ts        # Usage tracking
│       ├── auth.ts             # Authentication
│       ├── chunking.ts         # Text chunking
│       ├── database.ts         # Database queries
│       ├── embeddings.ts       # OpenAI embeddings
│       ├── logger.ts           # Pino logger
│       ├── queues.ts           # BullMQ configuration
│       ├── retrieval.ts        # RAG & semantic search
│       ├── stripe.ts           # Payment processing
│       └── workers.ts          # Job workers
│
├── scripts/                    # Maintenance scripts
│   ├── bulk-upload-pdfs.ts     # Bulk PDF upload
│   ├── cleanup-*.ts            # Cleanup utilities
│   └── check-*.ts              # Diagnostic scripts
│
├── supabase/
│   └── migrations/             # Database migrations
│
├── public/                     # Static assets
│
├── worker.ts                   # Background worker script
│
├── claude/                     # Claude Code context docs
│   ├── CLAUDE_BASE.md          # Core project context
│   ├── CLAUDE_FRONTEND.md      # Frontend guidelines
│   ├── CLAUDE_BACKEND.md       # Backend guidelines
│   └── ...
│
└── docs/
    └── archive/                # Archived documentation
```

---

## Key Files to Know

### Core Application Logic

- `src/lib/retrieval.ts` - **RAG implementation**
  - Semantic search with embeddings
  - Context retrieval
  - Source ranking

- `src/lib/embeddings.ts` - **Embedding generation**
  - OpenAI API integration
  - Batch processing
  - Error handling

- `src/lib/chunking.ts` - **Text chunking**
  - Token-based chunking
  - Overlap handling
  - Metadata preservation

### API Routes

- `src/app/api/chat/route.ts` - **Chat endpoint**
  - Main user-facing feature
  - Integrates RAG, OpenAI, database

- `src/app/api/admin/*` - **Admin endpoints**
  - Document management
  - Job queue control
  - Analytics

### Background Processing

- `worker.ts` - **Job worker**
  - Processes scraping, embedding, PDF jobs
  - Runs as separate process

- `src/lib/workers.ts` - **Worker implementations**
  - Job handlers for each queue
  - Retry logic
  - Error handling

---

## Common Tasks

### Adding a New API Endpoint

1. Create file in `src/app/api/<endpoint>/route.ts`
2. Implement HTTP method handlers (GET, POST, etc.)
3. Add logging
4. Add error handling
5. Update `API_REFERENCE.md`
6. Write tests

### Adding a New Component

1. Create file in `src/components/<Component>.tsx`
2. Define props interface
3. Implement component
4. Export from `src/components/index.ts`
5. Use in pages
6. Write tests (if complex logic)

### Adding a Database Migration

1. Create migration file:
```bash
npx supabase migration new <name>
```

2. Write SQL in `supabase/migrations/<timestamp>_<name>.sql`

3. Test locally:
```bash
npx supabase db reset
```

4. Apply to production:
```bash
npx supabase db push
```

### Adding a New Queue Job Type

1. Update `src/lib/queues.ts` - Add new queue
2. Update `src/lib/workers.ts` - Add worker handler
3. Update `worker.ts` - Register new queue
4. Test locally

---

## Debugging Tips

### Enable Debug Logging

```env
# .env.local
LOG_LEVEL=debug
```

### Debug Specific Components

```typescript
import { logger } from '@/lib/logger';

logger.debug({ data }, 'Debug message');
```

### Check Job Queue Status

Visit Bull Board: `http://localhost:3000/api/admin/bull-board`

### Database Queries

Check Supabase dashboard:
- **Database** → **Query Performance**
- **Logs** → **API Logs**

### Check Sentry for Errors

Production errors automatically logged to Sentry/GlitchTip.

---

## Resources

### Documentation

- Next.js: https://nextjs.org/docs
- React: https://react.dev
- Supabase: https://supabase.com/docs
- BullMQ: https://docs.bullmq.io
- OpenAI: https://platform.openai.com/docs

### Internal Docs

- `ARCHITECTURE.md` - Technical architecture
- `SETUP_GUIDE.md` - Local setup
- `DEPLOYMENT.md` - Production deployment
- `API_REFERENCE.md` - API documentation
- `NEXT_STEPS.md` - Roadmap

### Getting Help

- **Questions**: Open a GitHub issue
- **Bugs**: Report with full error details
- **Features**: Discuss in issues first

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Last Updated**: November 5, 2025
