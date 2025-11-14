# Performance Test Cases

## Response Time Benchmarks
Target: 95th percentile < 5 seconds for chat queries

### Test Scenarios
1. **Simple Query** (e.g., "school budget")
   - Target: < 3 seconds
   - Measure: Time from submit to response display

2. **Complex Query** (e.g., "Compare all budget discussions from 2024 to 2025")
   - Target: < 5 seconds
   - May retrieve more chunks

3. **Cached Query** (asking same question twice)
   - Target: < 1 second (Redis cache hit)
   - Check cache effectiveness

4. **Cold Start** (first query of the day)
   - Target: < 6 seconds (allow for DB wake-up if serverless)

## Database Performance
1. **Vector Search Speed**
   - IVFFlat index should be used (check EXPLAIN ANALYZE)
   - Query should complete in < 500ms

2. **Conversation Loading**
   - Loading conversation with 50 messages: < 1 second
   - Check for N+1 query problems

## OpenAI API Latency
1. **Embedding Generation**
   - Single query embedding: < 500ms
   - Batch embeddings (admin): Monitor but not critical

2. **Chat Completion**
   - GPT-4o-mini response: < 2 seconds
   - Token limit: 800 tokens max (check config)

## Load Testing
```bash
# Use Apache Bench or k6
# Simulate 10 concurrent users
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   -p query.json \
   -T application/json \
   http://localhost:3000/api/chat

# Or use k6 (better for complex scenarios)
k6 run load-test.js
```

## Monitoring Setup
1. **Before Production**
   - ✅ Set up Vercel Analytics (if using Vercel)
   - ✅ Sentry error tracking configured
   - ✅ Database query monitoring (Supabase dashboard)
   - ✅ OpenAI usage tracking (OpenAI dashboard)

2. **Alerts to Configure**
   - Response time > 10 seconds (5+ occurrences)
   - Error rate > 5%
   - Database connection pool exhausted
   - OpenAI rate limit approaching

## Cost Monitoring
Track daily OpenAI costs:
- Embeddings: $0.0001 per 1K tokens
- Chat completions: $0.15/$0.60 per 1M tokens (input/output)
- Target: < $10/day for initial launch
