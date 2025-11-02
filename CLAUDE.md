# AckIndex - Claude Context Dispatcher

## How to Use This System

**Always start with CLAUDE_BASE.md** - Contains core project identity, tech stack, and universal coding standards.

Then load the appropriate specialized context based on your task:

### Task-Based Routing

**Frontend/UI work** → Load `claude/CLAUDE_FRONTEND.md`
- React components, TailwindCSS, user-facing features
- Chat interface, admin dashboard, account pages
- Design system, accessibility, mobile responsiveness

**Backend/API work** → Load `claude/CLAUDE_BACKEND.md`
- API routes, database queries, OpenAI integration
- Scraping pipeline, embedding generation, semantic search
- Authentication, rate limiting, error handling

**Infrastructure/DevOps** → Load `claude/CLAUDE_INFRA.md`
- Job queues, caching, monitoring, logging
- Deployment, environment variables, database optimization
- Performance tuning, cost management

**Product decisions** → Load `claude/CLAUDE_PRODUCT.md`
- Feature prioritization, user needs, decision framework
- Quality metrics, strategic context, product principles
- When to build vs. defer features

**Prototyping/Experiments** → Load `claude/CLAUDE_EXPERIMENTAL.md`
- Trying new approaches, proof-of-concepts
- Testing ideas before production implementation
- Relaxed code quality standards for rapid iteration

## Loading Pattern

```
1. Read CLAUDE_BASE.md (always)
2. Read task-specific context (one or more)
3. Proceed with implementation
```

## Multi-Context Tasks

Some tasks span multiple areas. Load all relevant contexts:

- **New feature end-to-end**: BASE + FRONTEND + BACKEND
- **Performance optimization**: BASE + BACKEND + INFRA
- **UI redesign**: BASE + FRONTEND + PRODUCT
- **New API endpoint**: BASE + BACKEND + INFRA (if caching needed)

## Quick Reference

| I need to... | Load these contexts |
|--------------|-------------------|
| Fix a bug | BASE + (domain-specific) |
| Add UI component | BASE + FRONTEND |
| Create API route | BASE + BACKEND |
| Set up job queue | BASE + INFRA |
| Decide if feature X makes sense | BASE + PRODUCT |
| Try experimental approach | BASE + EXPERIMENTAL |
| Optimize performance | BASE + BACKEND + INFRA |

## Context File Locations

```
/Users/owenhudson/ackindex/
├── CLAUDE.md                    # This file (dispatcher)
└── /claude/
    ├── CLAUDE_BASE.md           # Core identity (~600-800 tokens)
    ├── CLAUDE_FRONTEND.md       # UI/UX (~1000 tokens)
    ├── CLAUDE_BACKEND.md        # API/data (~1500 tokens)
    ├── CLAUDE_INFRA.md          # DevOps (~1500 tokens)
    ├── CLAUDE_PRODUCT.md        # Strategy (~1200 tokens)
    └── CLAUDE_EXPERIMENTAL.md   # Sandbox (~1300 tokens)
```

---

**Total token budget**: ~7,900 tokens (all contexts combined)
**Typical usage**: 600-800 (BASE) + 1000-1500 (specialized) = ~2,000 tokens per session
