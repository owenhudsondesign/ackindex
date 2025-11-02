# CLAUDE_PRODUCT.md - Product Strategy & Decision Context

## Product Vision
AckIndex makes civic data accessible through conversational AI. Users ask natural language questions about Nantucket's regulations, permits, zoning, and public records, and receive accurate answers with citations.

## Core Value Proposition
1. **Domain-specific**: Focused on civic data, not general knowledge
2. **Cited sources**: Every answer includes links to original documents
3. **Up-to-date**: Regular scraping keeps data current
4. **Accessible**: Natural language replaces complex government website navigation

## User Mental Model

### What users expect:
- Ask a question in plain English
- Get a direct answer (not a list of links)
- See where the information came from (citations)
- Fast response (<3 seconds)

### What users don't expect:
- Perfect accuracy (but expect honesty about uncertainty)
- Real-time data (overnight updates are fine)
- Complex features (keep it simple)

## Current Product Status

**What works well**:
- RAG pipeline delivers relevant, cited answers
- Semantic search finds correct chunks
- Free tier allows users to try before paying

**What needs improvement** (see NEXT_STEPS.md):
- Reliability (no retry logic for scraping)
- Performance (no caching, every query hits OpenAI)
- UX polish (loading states, error messages)

## Decision-Making Framework

### When adding features, ask:
1. **Does it improve answer quality?** (Core value)
2. **Does it reduce friction?** (Easier to use)
3. **Does it reduce cost?** (Sustainability)
4. **Can we build it in <1 week?** (Focus on quick wins)

### Prioritization hierarchy:
1. **Reliability** > Features (users need it to work)
2. **Performance** > Polish (fast responses matter more than animations)
3. **Core experience** > Edge cases (optimize for common use cases)

## User Context

### Primary use cases:
- "What are the zoning rules for my property?"
- "How do I get a building permit?"
- "When is trash pickup on holidays?"
- "What are the beach parking regulations?"

### User expectations by tier:
**Free tier** (3,500 tokens/month):
- ~25-30 questions
- Casual users, one-time questions
- Tolerance for some limitations

**Premium tier** ($9.99/month unlimited):
- Heavy users (real estate, government staff)
- Expect reliability, speed
- Low tolerance for errors

## Technical Constraints to Remember

### Cost structure:
- OpenAI: ~$0.02-0.03 per query (largest variable cost)
- Scraping: ~$0.01-0.10 per URL
- Infrastructure: ~$100/month fixed

**Implication**: Every query costs money. Caching is valuable. Encourage concise answers.

### Performance limits:
- Supabase free tier: 500MB database
- OpenAI rate limits: 3,500 requests/minute
- Vercel free tier: 100GB bandwidth/month

**Implication**: Design for efficiency. Batch operations where possible.

### Data freshness:
- Scraping is async (1-5 minutes)
- Users don't expect real-time data
- Weekly/monthly re-scraping is acceptable

**Implication**: Don't over-engineer for freshness. Scheduled scraping is fine.

## Product Principles

### 1. Transparency over perfection
- Show citations even if answer is uncertain
- Admit when information isn't in the knowledge base
- Better to say "I don't know" than to hallucinate

### 2. Simplicity over features
- One text box, one button is enough
- Don't add complexity unless users explicitly request it
- Default to minimal UI

### 3. Accuracy over speed
- Better to take 2 seconds and be right than 1 second and be wrong
- Validate inputs (URLs, file types)
- Check token limits before processing

### 4. User control over automation
- Let users trigger scraping manually (don't auto-scrape everything)
- Let users see what's in the knowledge base
- Let users delete their data

## Common Product Decisions

### "Should we add feature X?"
Ask:
- Does it align with core value proposition? (cited civic data answers)
- Will >20% of users use it weekly?
- Can it be built without new dependencies?
- Does it increase or decrease complexity?

**If unsure**: Ship a minimal version, get feedback, iterate.

### "Should we optimize Y?"
Ask:
- Is it on the critical path? (query → response flow)
- Will it reduce costs by >10%?
- Will it improve speed by >20%?
- Is it currently causing user complaints?

**If unsure**: Measure first (add logging), optimize later.

### "Should we support use case Z?"
Ask:
- Is it civic data related? (Core focus)
- Can existing features handle 80% of it?
- Does it require new data sources?
- Would it benefit existing users?

**If unsure**: Validate with user interviews before building.

## Quality Metrics (What "good" looks like)

### Answer quality:
- Citation relevance: >90% (users find sources helpful)
- Answer accuracy: >85% (verified against original docs)
- Response completeness: >80% (users don't need follow-ups)

### User experience:
- Response time: <2s (p95)
- Uptime: >95% (production-ready)
- Error rate: <5% (graceful degradation)

### Business health:
- Free → Premium conversion: >10%
- Monthly churn: <5%
- User retention (D7): >40%

## Strategic Context

### Current focus (Stage 9 complete):
Backend works, frontend needs polish, reliability needs improvement.

### Immediate needs (Next 2 weeks):
1. Job queue (reliability)
2. Error monitoring (observability)
3. UI polish (user experience)

**Why these matter**: They're foundational. Can't scale without reliability. Can't improve without observability. Can't retain users with poor UX.

### What NOT to focus on right now:
- Advanced features (conversation memory, API access, etc.)
- Marketing/growth (product isn't polished yet)
- New data sources (focus on making existing sources reliable)

**Why**: Premature optimization. Nail the core experience first.

## Product Philosophy Summary

**Build for the user in front of you, not the imagined user of tomorrow.**

- Start with the simplest solution
- Ship quickly, iterate based on feedback
- Measure what matters (answer quality, retention)
- Don't add features speculatively
- Reliability beats novelty

## Related Documents
- **NEXT_STEPS.md**: Current priorities and timeline
- **ARCHITECTURE.md**: Technical constraints and decisions
- **USER-GUIDE.md**: How users actually use the product
