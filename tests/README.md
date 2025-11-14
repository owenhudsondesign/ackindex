# AckIndex Testing Guide

## 🚀 Quick Start - Automated Tests

### Run All Checks (Recommended)
```bash
# Run all automated test suites
./tests/run-all-checks.sh

# Or run with authentication for full coverage
TEST_AUTH_TOKEN="your-token" ./tests/run-all-checks.sh
```

### Individual Test Suites
```bash
./tests/health-check.sh         # ✅ Basic uptime & connectivity
./tests/performance-check.sh    # ⚡ Response times & optimization
./tests/security-check.sh       # 🔒 Security headers & auth
./tests/seo-check.sh           # 🔍 SEO metadata & social tags
```

### 1. Run Authenticated Smoke Tests
```bash
# Start your dev server
npm run dev

# In another terminal, run smoke tests
node tests/quick-smoke-test.js

# With authentication (recommended)
# First, get your auth token:
# 1. Open http://localhost:3000 in browser
# 2. Log in
# 3. Open DevTools → Application → Storage → supabase.auth.token
# 4. Copy the access_token value

TEST_AUTH_TOKEN="your-token-here" node tests/quick-smoke-test.js
```

### 2. Manual Testing Checklist
Work through these test plans in order:

1. **[Production Checklist](./PRODUCTION_CHECKLIST.md)** - Start here for overall readiness
2. **[Search Quality](./search-quality-test.md)** - Test 10 representative queries
3. **[Auth & Security](./auth-test.md)** - Verify authentication & authorization
4. **[Data Quality](./data-quality-test.md)** - Check document ingestion & accuracy
5. **[Performance](./performance-test.md)** - Measure response times & load
6. **[UX Testing](./ux-test.md)** - User experience on all devices

## Test Environments

### Local Development
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-dev-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-dev-key
OPENAI_API_KEY=your-dev-key

npm run dev
# App runs on http://localhost:3000
```

### Staging/Preview
```bash
# Use Vercel Preview Deployments
# Every PR gets a preview URL
# Test there before merging to main
```

### Production
```bash
# Only test non-destructive operations in production
# Use staging for comprehensive testing
```

## Testing Tools

### Recommended Tools
- **API Testing**: [Postman](https://www.postman.com/) or `curl`
- **Load Testing**: [k6](https://k6.io/) or Apache Bench
- **Accessibility**: [axe DevTools](https://www.deque.com/axe/devtools/)
- **Performance**: Chrome Lighthouse (built into DevTools)
- **Mobile Testing**: Chrome DevTools device emulation
- **Error Tracking**: Sentry (already configured)

### Install Testing Dependencies (Optional)
```bash
# For more advanced testing
npm install --save-dev @playwright/test  # E2E testing
npm install --save-dev vitest           # Unit testing
npm install --save-dev @axe-core/cli    # Accessibility testing
```

## Critical Test Scenarios

### Before Every Deployment
Run these 5 tests minimum:

1. **Auth Flow**
   - Sign up with new email → should work
   - Log in with credentials → should work
   - Access /account while logged in → should work
   - Access /admin as non-admin → should be blocked

2. **Search Quality**
   - Query: "sankaty head light preservation"
   - Expected: 2-3 sources, 70%+ similarity
   - Check: Answer mentions Community Preservation Committee

3. **Token Limits**
   - Free user asks query → tokens decrement
   - Free user hits limit → clear upgrade message
   - Premium user has unlimited → no limit errors

4. **Citations**
   - Any query with results → check citations
   - Click "View source" → opens correct URL
   - Snippet matches actual document content

5. **Performance**
   - Simple query completes in < 5 seconds
   - No console errors in browser
   - Database queries use indexes (check Supabase logs)

## Common Issues & Fixes

### "401 Unauthorized" in tests
```bash
# Get fresh auth token
# 1. Log in at http://localhost:3000
# 2. DevTools → Application → supabase.auth.token
# 3. Copy access_token value
```

### Slow query performance
```sql
-- Check if indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'document_chunks';

-- Should see index on embedding column
```

### No search results
```sql
-- Check if documents have embeddings
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;

-- Check document status
SELECT status, COUNT(*) FROM documents GROUP BY status;
```

### High OpenAI costs
```bash
# Check token usage
# Supabase → Table Editor → query_logs
SELECT SUM(tokens_used) FROM query_logs WHERE created_at > NOW() - INTERVAL '24 hours';

# If unexpectedly high:
# 1. Check for stuck loops generating embeddings
# 2. Verify caching is working (Redis)
# 3. Review max_tokens setting in chat API (should be 800)
```

## Test Data

### Sample Test Queries
Good queries for testing (should find results):
- "preservation of sankaty head light"
- "school budget 2025"
- "affordable housing discussions"
- "community preservation committee meetings"
- "select board voting results"

Bad queries for testing (should handle gracefully):
- "weather forecast" (out of scope)
- "how do I appeal a decision" (no legal advice)
- "gibberish xyz123" (no results)

### Test User Accounts
Create these for testing different tiers:
- `test-free@example.com` - Free tier (15k tokens/month)
- `test-premium@example.com` - Premium tier (unlimited)
- `test-admin@example.com` - Admin access

## Regression Testing

### After Code Changes
Always test these areas:

**Search Changes**:
- Run all search quality tests
- Check similarity scores still in range
- Verify citations still accurate

**Auth Changes**:
- Test signup, login, logout flows
- Verify token limits enforced
- Check admin routes protected

**UI Changes**:
- Test mobile responsiveness
- Check dark mode
- Verify accessibility (keyboard nav, screen reader)

## Continuous Monitoring

### Production Monitoring Setup
1. **Sentry**: Error tracking and performance monitoring
2. **Vercel Analytics**: Page views, user sessions
3. **Supabase Dashboard**: Database performance, query logs
4. **OpenAI Dashboard**: Token usage, costs

### Weekly Health Check
```bash
# Check error rate
# Sentry → Issues → Last 7 days
# Target: < 1% error rate

# Check performance
# Vercel → Analytics → Page Load
# Target: p95 < 3 seconds

# Check costs
# OpenAI → Usage → Last 7 days
# Target: < $70/week (~$10/day)

# Check database
# Supabase → Database → Query Performance
# Target: No slow queries (> 1s)
```

## Need Help?

- Check [ARCHITECTURE.md](/docs/ARCHITECTURE.md) for system design
- Check [DOCUMENTATION_INDEX.md](/docs/DOCUMENTATION_INDEX.md) for all docs
- Open issue on GitHub for bugs

---

**Last Updated**: 2025-01-13
**Maintainer**: Owen Hudson
