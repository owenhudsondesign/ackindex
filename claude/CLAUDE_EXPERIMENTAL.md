# CLAUDE_EXPERIMENTAL.md - Sandbox & Exploration

## Purpose
This context is for exploring new features, prototyping ideas, and experimentation. Code here doesn't need to be production-ready. Focus on rapid iteration and learning.

## When to Use This Context
- Prototyping new features before committing to implementation
- Exploring alternative approaches to existing problems
- Testing new libraries or APIs
- Investigating performance optimizations
- Proof-of-concept implementations

## Experimental Mindset

### Rules relaxed here:
- **Code quality**: Quick & dirty is fine
- **Error handling**: Console.log is acceptable
- **Testing**: Manual testing only
- **Documentation**: Inline comments sufficient

### Rules still enforced:
- **Security**: Never expose secrets or PII
- **Cost**: Don't run expensive operations without approval
- **Data integrity**: Don't modify production database

## Current Experimental Areas

### 1. Alternative Chunking Strategies
**Current**: 500 tokens, 50 overlap (fixed size)

**Explore**:
- Semantic chunking (split on topic boundaries)
- Sentence-based chunking
- Hybrid approach (paragraphs + max token limit)

**Why**: May improve retrieval accuracy

**Quick test**:
```typescript
// src/lib/experimental/semanticChunking.ts
export function semanticChunk(text: string): Chunk[] {
  // Split on double newlines (paragraphs)
  const paragraphs = text.split('\n\n');

  // Combine small paragraphs, split large ones
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + para).length > 2000) {
      chunks.push(current);
      current = para;
    } else {
      current += '\n\n' + para;
    }
  }

  return chunks;
}
```

### 2. Query Expansion
**Current**: User query embedded directly

**Explore**:
- Generate 3-5 variations of the query
- Embed all variations, aggregate results
- May improve recall for vague queries

**Quick test**:
```typescript
// Expand "building permit" to:
// - "building permit requirements"
// - "how to get a building permit"
// - "building permit application process"

const expanded = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{
    role: 'user',
    content: `Generate 3 variations of this query: "${userQuery}"`
  }]
});
```

### 3. Caching Frequent Queries
**Current**: Every query hits OpenAI

**Explore**:
- Hash common queries
- Cache responses for 24 hours
- Return cached if exact match

**Quick test**:
```typescript
const queryHash = crypto.createHash('md5').update(message).digest('hex');
const cached = await kv.get(`query:${queryHash}`);

if (cached) {
  return cached;
}

// ... generate response ...
await kv.set(`query:${queryHash}`, response, { ex: 86400 });
```

### 4. Streaming Responses
**Current**: Response appears all at once

**Explore**:
- OpenAI streaming API
- Display tokens as they arrive
- Better perceived performance

**Quick test**:
```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  stream: true
});

for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content;
  // Send to client via Server-Sent Events
}
```

### 5. Multi-query Aggregation
**Current**: One query = one embedding = one search

**Explore**:
- User asks compound question
- Split into sub-queries
- Aggregate results

**Example**:
```
User: "What are the zoning rules and building permit requirements for residential properties?"

Split to:
1. "zoning rules for residential properties"
2. "building permit requirements for residential properties"

Search both, merge results
```

## Prototyping Workflow

### Step 1: Define experiment
- What problem are we solving?
- What's the hypothesis?
- How will we measure success?

### Step 2: Quick implementation
- Create file in `src/lib/experimental/`
- Write minimal code to test hypothesis
- Use console.log liberally

### Step 3: Manual testing
- Test with 5-10 representative queries
- Compare to baseline (current implementation)
- Document results in comments

### Step 4: Decision
- **Success**: Refactor for production, move to main codebase
- **Failure**: Document learnings, archive code
- **Unclear**: Run more tests or try different approach

## Experimental Ideas to Explore

### Performance
- [ ] Pre-compute embeddings for common queries
- [ ] Batch similar queries together
- [ ] Parallel embedding generation (multiple OpenAI requests)
- [ ] Optimize database query (select only needed columns)

### Answer Quality
- [ ] Re-ranking retrieved chunks (use LLM to score relevance)
- [ ] Dynamic context size (use more chunks for complex queries)
- [ ] Chain-of-thought prompting (show reasoning)
- [ ] Self-correction (LLM validates its own answer)

### User Experience
- [ ] Suggested follow-up questions
- [ ] Related documents sidebar
- [ ] Confidence scores on answers
- [ ] "Explain like I'm 5" mode (simplified answers)

### Data Pipeline
- [ ] Incremental scraping (only new/changed content)
- [ ] Content deduplication (avoid storing same text twice)
- [ ] Smart chunking (preserve tables, lists)
- [ ] Image/diagram extraction from PDFs

## Testing Sandbox

### Safe test queries:
```
"What are the zoning rules?"
"How do I get a building permit?"
"When is trash pickup?"
"What are the beach parking regulations?"
```

### Test with edge cases:
```
"" (empty query)
"asdfasdf" (gibberish)
"Tell me a joke" (off-topic)
"What's the weather?" (not in knowledge base)
```

## Measuring Experiments

### Quick metrics:
- **Speed**: Time from request to response (use `console.time()`)
- **Quality**: Subjective "does this answer make sense?" (manual review)
- **Cost**: OpenAI tokens used (check response.usage)

### Comparison template:
```
Experiment: [Name]
Hypothesis: [What we expect]

Baseline:
- Speed: 1.8s
- Quality: 8/10 answers good
- Cost: 500 tokens average

Experiment:
- Speed: [measure]
- Quality: [measure]
- Cost: [measure]

Conclusion: [Better/Worse/Same]
```

## Notes & Learnings

### What worked:
- (Document successful experiments here)

### What didn't work:
- (Document failed experiments here - save future effort)

### Open questions:
- (Ideas that need more exploration)

## Safety Guidelines

### Do NOT:
- Modify production database tables
- Expose API keys in logs
- Run experiments on live users without permission
- Delete or overwrite existing code without backup

### DO:
- Create new files (don't modify existing ones)
- Use `console.log` for debugging
- Test on small datasets first
- Document all changes in comments

## Graduation Path

When experiment is successful:
1. Refactor code for production quality
2. Add proper error handling
3. Add TypeScript types
4. Write tests (if applicable)
5. Move from `src/lib/experimental/` to `src/lib/`
6. Update relevant CLAUDE_*.md files
7. Delete experimental code

## Related Files
- **CLAUDE_BASE.md**: Production coding standards (relaxed here)
- **NEXT_STEPS.md**: Features to potentially experiment with
- **ARCHITECTURE.md**: Current architecture (what we might improve)
