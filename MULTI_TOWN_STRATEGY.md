# Multi-Town Expansion Strategy

## Executive Summary

Expanding to multiple towns **dramatically improves your economics** through:
- **Shared infrastructure costs** (1 database serves all towns)
- **Faster time to 7,000 hours** (10 towns × 83 hrs/month = 830 hrs/month)
- **Revenue potential** ($50-200/month per town)
- **Network effects** (cross-town search, comparative analytics)

---

## 🎯 Three Architecture Options

### **Option 1: Shared Database (Recommended) 🏢**

**How it works**:
- All towns in one Supabase database
- Data filtered by `organization_id`
- Row Level Security (RLS) ensures town isolation

**Pros**:
- ✅ Most cost-effective ($599 Team plan serves 50+ towns)
- ✅ Shared vector index (all 105K chunks searchable together)
- ✅ Cross-town search possible (if desired)
- ✅ Centralized maintenance and upgrades
- ✅ Easiest to scale

**Cons**:
- ⚠️ Requires careful RLS policies (data isolation)
- ⚠️ One town's spike doesn't affect others (need connection pooling)
- ⚠️ All towns on same Supabase version

**Best for**: 3-50 towns sharing infrastructure

---

### **Option 2: Separate Databases 🏘️**

**How it works**:
- Each town gets its own Supabase project
- Completely isolated databases
- Your code remains unchanged per instance

**Pros**:
- ✅ Perfect data isolation (impossible to leak)
- ✅ Towns can have different Supabase tiers
- ✅ Independent scaling and performance
- ✅ Easy to sunset a town

**Cons**:
- ❌ Expensive: $25-599/month per town
- ❌ Multiplies maintenance (20 towns = 20 databases to upgrade)
- ❌ No cross-town features
- ❌ Can't share infrastructure costs

**Best for**: 1-3 large cities with independent budgets

---

### **Option 3: Hybrid (Best of Both) 🎯**

**How it works**:
- Shared database for most towns (Option 1)
- Separate databases for enterprise clients (Option 2)
- Platform handles both with tenant routing

**Pros**:
- ✅ Small towns share costs ($10-20/month each)
- ✅ Large cities get dedicated resources
- ✅ Flexible pricing tiers
- ✅ Can offer both SaaS and white-label

**Cons**:
- ⚠️ More complex codebase (tenant routing logic)
- ⚠️ Two deployment patterns to maintain

**Best for**: Scaling from 10-100+ towns

---

## 💰 Cost Analysis: Multi-Town vs Single-Town

### **Scenario: 10 Towns, Each Adding 83 Hours/Month**

**Total growth**: 830 hours/month (10x faster!)

| Year | Cumulative Hours | Towns | Shared DB Cost | Separate DBs Cost | Savings |
|------|------------------|-------|----------------|-------------------|---------|
| 1 | 10,000 | 10 | $150/mo | $250/mo | 40% |
| 2 | 20,000 | 10 | $650/mo | $2,500/mo | 74% |
| 3 | 30,000 | 10 | $1,200/mo | $5,990/mo | 80% |

**At 10 towns, reach 30,000 hours in 3 years (vs. 25 years for 1 town!)**

---

## 📊 Detailed Costs: Shared Database Architecture

### **10 Towns, 830 Hours/Month Growth**

#### **Year 1: 10,000 Total Hours**

| Service | Usage | Cost |
|---------|-------|------|
| **AssemblyAI** | 830 hrs/month (730 hrs over free tier) | **$657/mo** |
| **Supabase Team** | 220K chunks, 15 GB database | **$599/mo** |
| **Video Storage (R2)** | 50 TB across 10 towns | **$750/mo** |
| **OpenAI** | Embeddings: $13, Queries: $50 | **$63/mo** |
| **Vercel Pro** | High traffic | **$20/mo** |
| **TOTAL** | | **$2,089/mo** |

**Per-Town Cost**: $2,089 ÷ 10 = **$209/month per town**

**With $150/month subscription per town**: Profitable after Year 2!

---

#### **Year 2: 20,000 Total Hours**

| Service | Usage | Cost |
|---------|-------|------|
| **AssemblyAI** | 730 hrs over free tier | **$657/mo** |
| **Supabase Team** | 440K chunks, 30 GB | **$599/mo** |
| **Video Storage** | 100 TB (R2 + B2 hybrid) | **$1,200/mo** |
| **OpenAI** | Embeddings + 50K queries | **$100/mo** |
| **TOTAL** | | **$2,576/mo** |

**Per-Town Cost**: $2,576 ÷ 10 = **$258/month per town**

---

#### **Year 3: 30,000 Total Hours (= 7K per town avg)**

| Service | Usage | Cost |
|---------|-------|------|
| **AssemblyAI** | 730 hrs over free tier | **$657/mo** |
| **Supabase Team** | 660K chunks, 50 GB | **$599/mo** |
| **Video Storage** | 150 TB | **$1,800/mo** |
| **OpenAI** | 100K queries | **$200/mo** |
| **TOTAL** | | **$3,256/mo** |

**Per-Town Cost**: $3,256 ÷ 10 = **$326/month per town**

---

## 💡 Revenue Model: How to Make This Profitable

### **Pricing Tiers (Per Town)**

#### **Free Tier** (First 10 towns for pilot)
- ✅ 100 hours of video storage
- ✅ 1,000 searches/month
- ✅ Basic AI features
- ✅ Public search enabled
- **Cost to you**: $30/month per town
- **Revenue**: $0 (loss leader)

#### **Basic Tier - $99/month**
- ✅ 500 hours of video storage
- ✅ 5,000 searches/month
- ✅ All AI features
- ✅ 5 staff accounts
- ✅ Analytics dashboard
- **Cost to you**: $100/month (shared infrastructure)
- **Margin**: Break-even (builds network)

#### **Pro Tier - $299/month** (Recommended)
- ✅ 2,000 hours of video storage
- ✅ 20,000 searches/month
- ✅ Advanced analytics
- ✅ API access
- ✅ Custom branding
- ✅ Priority support
- **Cost to you**: $150/month
- **Margin**: $149/month profit per town

#### **Enterprise - $999/month**
- ✅ Unlimited hours
- ✅ Dedicated database
- ✅ White-label option
- ✅ Custom integrations
- ✅ SLA guarantees
- **Cost to you**: $750/month (dedicated resources)
- **Margin**: $249/month profit

---

## 📈 Growth Projections: 10 Towns

### **Conservative Scenario**

| Timeframe | Towns | Tier Mix | Monthly Revenue | Monthly Costs | Profit |
|-----------|-------|----------|-----------------|---------------|--------|
| **Months 1-6** | 3 free, 2 basic | 2 × $99 | $198 | $300 | -$102 |
| **Months 7-12** | 5 basic, 5 pro | 5 × $99 + 5 × $299 | $1,990 | $800 | +$1,190 |
| **Year 2** | 10 pro | 10 × $299 | $2,990 | $2,576 | +$414 |
| **Year 3** | 8 pro, 2 enterprise | 8 × $299 + 2 × $999 | $4,390 | $3,256 | +$1,134 |

**Cumulative Profit by Year 3**: ~$20,000

---

### **Aggressive Scenario** (20 towns)

| Timeframe | Towns | Tier Mix | Monthly Revenue | Monthly Costs | Profit |
|-----------|-------|----------|-----------------|---------------|--------|
| **Year 1** | 15 basic, 5 pro | $2,980 | $1,500 | +$1,480 |
| **Year 2** | 10 basic, 10 pro | $4,980 | $3,000 | +$1,980 |
| **Year 3** | 5 basic, 12 pro, 3 enterprise | $9,582 | $4,500 | +$5,082 |

**Cumulative Profit by Year 3**: ~$100,000

---

## 🚀 Technical Implementation: Multi-Tenant Setup

### **Step 1: Database Migration** (1 week)

See `MULTI_TENANT_SCHEMA.sql` for complete migration.

**Key changes**:
1. Add `organizations` table
2. Add `organization_id` to all relevant tables
3. Update Row Level Security (RLS) policies
4. Add usage tracking functions

**Testing**:
```sql
-- Create test organizations
INSERT INTO organizations (name, slug, state_code) VALUES
  ('Town of Acton', 'acton', 'MA'),
  ('City of Cambridge', 'cambridge', 'MA'),
  ('Town of Lexington', 'lexington', 'MA');

-- Verify RLS isolation
-- User from Acton should NOT see Cambridge videos
```

---

### **Step 2: Code Updates** (3-5 days)

**Add organization context to all queries**:

```typescript
// BEFORE (single-tenant)
const { data: videos } = await supabase
  .from('meeting_videos')
  .select('*')
  .eq('is_public', true);

// AFTER (multi-tenant)
const { data: videos } = await supabase
  .from('meeting_videos')
  .select('*')
  .eq('organization_id', currentOrganization.id)
  .eq('is_public', true);
```

**Add organization selector**:
```typescript
// Store current organization in context
const OrganizationContext = createContext<Organization | null>(null);

// Middleware to extract organization from URL
// Example: acton.ackindex.com or ackindex.com/acton
export function getOrganizationFromRequest(req: NextRequest) {
  const hostname = req.headers.get('host');
  const subdomain = hostname?.split('.')[0];

  if (subdomain && subdomain !== 'www') {
    return getOrgBySlug(subdomain);
  }

  // Fallback to path-based routing
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/([^\/]+)\//);
  if (match) {
    return getOrgBySlug(match[1]);
  }

  return null;
}
```

---

### **Step 3: Video Processing Updates** (1 day)

**Update workers.ts to include organization context**:

```typescript
async function processMeetingVideoJob(data: ScrapingJobData, job: Job) {
  const { videoId, documentId, organizationId } = data;

  // Check organization limits before processing
  const { data: limits } = await supabase.rpc('org_within_limits', {
    org_id: organizationId
  });

  if (!limits.can_upload) {
    throw new Error(`Organization has reached limits: ${limits.limit_reached.join(', ')}`);
  }

  // Continue with normal processing...
  // All document_chunks will inherit organization_id from parent document
}
```

---

### **Step 4: Search Updates** (2-3 days)

**Option A: Isolated Search (Town-Only)**

```typescript
// Users only search within their town
const results = await supabase.rpc('search_similar_chunks', {
  query_embedding: embedding,
  match_threshold: 0.78,
  match_count: 10,
  organization_filter: currentOrganization.id // NEW parameter
});
```

Update `search_similar_chunks` function:
```sql
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  organization_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE (organization_filter IS NULL OR d.organization_id = organization_filter)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Option B: Cross-Town Search (Optional Premium Feature)**

```typescript
// "Search all MA towns" feature
const results = await supabase.rpc('search_similar_chunks', {
  query_embedding: embedding,
  match_threshold: 0.78,
  match_count: 10,
  state_filter: 'MA', // Search across all MA towns
  organization_filter: null // Don't filter by org
});
```

This is a **premium feature** you can charge for:
- "Compare what other towns are doing"
- "Regional policy search"
- "Find precedents from neighboring towns"

---

## 🎯 Rollout Strategy: 3 Phases

### **Phase 1: Pilot (Months 1-3)**

**Goal**: Prove the model with 3 towns

**Towns**:
- Your original town (free as beta tester)
- 2 similar-sized towns (Basic tier: $99/month)

**Actions**:
1. Apply multi-tenant schema migration
2. Migrate existing data to first organization
3. Onboard 2 new towns manually
4. Test isolation and performance
5. Gather feedback

**Expected Revenue**: $198/month
**Expected Costs**: $300/month
**Net**: -$102/month (acceptable for validation)

---

### **Phase 2: Growth (Months 4-12)**

**Goal**: Reach 10 towns, prove unit economics

**Actions**:
1. Build self-service signup flow
2. Add billing integration (Stripe)
3. Create organization admin dashboard
4. Add usage analytics per town
5. Implement usage limits enforcement
6. Launch marketing to nearby towns

**Target Mix**: 5 Basic ($99) + 5 Pro ($299)

**Expected Revenue**: $1,990/month
**Expected Costs**: $800/month
**Net**: +$1,190/month profit ✅

---

### **Phase 3: Scale (Year 2+)**

**Goal**: 20-50 towns, establish market dominance

**Actions**:
1. Add API tier for developers/researchers
2. Launch cross-town search feature (premium)
3. Add comparative analytics dashboard
4. Build integrations (Google Calendar, Zoom, etc.)
5. Hire support/sales team
6. Expand to neighboring states

**Target Mix**: 30 Pro towns at $299/month = $8,970/month

**Expected Revenue**: $8,970/month
**Expected Costs**: $3,500/month
**Net**: +$5,470/month profit 🚀

---

## 🏗️ Infrastructure Scaling with Multiple Towns

### **Database Performance: 10 Towns vs 1 Town**

**Single Town (Your Current Estimate)**:
- 7,000 hours over 7 years
- 105K chunks
- 1.2 GB vectors
- Search time: 20-80ms

**10 Towns in 3 Years**:
- 30,000 hours (3x more data)
- 660K chunks (6x more chunks)
- 7.2 GB vectors
- Search time: **30-120ms** with optimized index ⚠️

**Solution**: Update IVFFlat index for larger dataset:
```sql
-- Update lists parameter for 600K+ chunks
CREATE INDEX idx_chunks_embedding
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 800);  -- sqrt(660000) ≈ 812
```

**Alternative**: HNSW index (if available):
```sql
CREATE INDEX idx_chunks_embedding
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
-- Better performance at scale, same cost
```

---

### **Storage Scaling**

**10 Towns, 3 Years (30,000 hours total)**:
- Video storage: 150 TB
- Database: 50 GB
- Backups: 50 GB

**Storage Costs**:
- R2 (active 6 months): 50 TB × $0.015 = $750/mo
- B2 (archive): 100 TB × $0.006 = $600/mo
- **Total**: $1,350/month

**Optimization**: Archive videos older than 6 months to B2:
- Recent: 50 TB on R2 = $750/mo
- Archive: 100 TB on B2 = $600/mo
- Savings: $450/month vs all-R2

---

## 🔐 Security & Isolation: Multi-Tenant RLS

### **Critical: Preventing Data Leakage**

**Row Level Security (RLS) ensures**:
- Users from Town A CANNOT see Town B's videos
- Even if they guess UUIDs or manipulate requests
- Enforced at database level (not application level)

**Testing RLS**:
```sql
-- Test as Acton user
SET SESSION ROLE authenticated;
SET request.jwt.claim.sub = '<acton-user-uuid>';

SELECT * FROM meeting_videos; -- Should only see Acton videos

-- Test as Cambridge user
SET request.jwt.claim.sub = '<cambridge-user-uuid>';

SELECT * FROM meeting_videos; -- Should only see Cambridge videos

-- Verify no cross-contamination
SELECT COUNT(*) FROM meeting_videos
WHERE organization_id != (
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
); -- Should return 0
```

---

## 💰 Break-Even Analysis

### **Question: How many towns to break even?**

**Assumptions**:
- Average town: Pro tier ($299/month)
- Shared infrastructure costs: $2,500/month (Year 2)
- Cost per town: $250/month average

**Break-even**:
- Revenue needed: $2,500/month
- Towns needed: $2,500 ÷ $299 = **8.4 towns**
- **Round up: 9 towns to be profitable**

---

### **Path to Profitability**

| Month | Towns | Revenue | Costs | Profit | Cumulative |
|-------|-------|---------|-------|--------|------------|
| 1 | 1 | $0 | $150 | -$150 | -$150 |
| 3 | 3 | $200 | $300 | -$100 | -$450 |
| 6 | 5 | $1,000 | $500 | +$500 | -$200 |
| 9 | 8 | $2,400 | $1,200 | +$1,200 | +$2,400 |
| 12 | 10 | $2,990 | $1,500 | +$1,490 | +$6,380 |

**Break-even**: Month 7-8 with 8-9 towns 🎯

---

## 🎁 Key Advantages of Multi-Town Architecture

### **1. Faster Data Accumulation**
- 10 towns = 10x faster growth
- Reach 30,000 hours in 3 years instead of 25 years
- Better AI model with more training data

### **2. Shared Infrastructure Costs**
- 1 Supabase database serves 50+ towns
- 1 vector index serves all towns
- 1 set of maintenance tasks

### **3. Network Effects**
- Cross-town search feature (premium add-on)
- "What are other MA towns doing about X?"
- Comparative analytics dashboard

### **4. Revenue Diversification**
- Not dependent on one town's budget
- Can subsidize smaller towns with enterprise clients
- API tier for researchers/journalists

### **5. Competitive Moat**
- First-mover advantage in civic tech
- Hard to replicate with 20+ towns committed
- Data network effect (more towns = better AI)

---

## ⚠️ Challenges & Mitigation

### **Challenge 1: Town-Specific Customization**

**Problem**: Each town wants custom branding, features

**Solution**:
- Store settings in `organizations.settings` JSONB
- Theming via CSS variables
- Feature flags per organization
- "Pro" tier gets custom branding

---

### **Challenge 2: Uneven Growth Rates**

**Problem**: Some towns upload 200 hrs/month, others upload 10

**Solution**:
- Usage-based pricing tiers
- Overage charges: $1.50/hour over limit
- Auto-upgrade suggestions
- Archive old content to cheaper storage

---

### **Challenge 3: Support Burden**

**Problem**: 20 towns = 20x support tickets

**Solution**:
- Self-service admin dashboard
- In-app documentation and tutorials
- Town admin can manage their staff
- Tiered support: Basic (email), Pro (chat), Enterprise (phone)

---

### **Challenge 4: Data Residency/Compliance**

**Problem**: Some towns may require data to stay in-state

**Solution**:
- Default: Shared database (most towns fine with this)
- Enterprise: Dedicated Supabase project in specific region
- Compliance: SOC 2, GDPR-ready infrastructure (Supabase certified)

---

## 🚀 Recommendation: Go Multi-Tenant Immediately

### **Why Start with Multi-Tenant Architecture Now**:

1. **Easier to build multi-tenant from the start** than retrofit later
2. **Unlock 10x faster growth** (10 towns = 830 hrs/month vs 83)
3. **Better unit economics** ($250/town vs $746 for solo)
4. **Reach profitability in 7-8 months** with 9 towns
5. **Build competitive moat** early

### **Implementation Timeline**:

**Week 1-2**: Database migration
- Apply `MULTI_TENANT_SCHEMA.sql`
- Backfill existing data
- Test RLS policies

**Week 3-4**: Code updates
- Add organization context
- Update all queries
- Add organization selector UI

**Week 5-6**: Pilot with 3 towns
- Onboard manually
- Gather feedback
- Iterate quickly

**Week 7-12**: Self-service launch
- Build signup flow
- Add billing integration
- Launch marketing

**Timeline**: 3 months to full multi-tenant platform

---

## 📊 Final Numbers: Multi-Town vs Single-Town

### **Reaching 7,000 Hours Per Town**

| Metric | Single Town (Nantucket) | 10 Towns (Shared) |
|--------|------------------------|-------------------|
| **Time to 7,000 hours** | 7 years | 10 months (per town avg) |
| **Monthly cost at scale** | $746 | $326 per town |
| **Total infrastructure** | $746/mo | $3,256/mo (for all 10) |
| **Revenue potential** | $0 (civic project) | $2,990-8,970/mo |
| **Break-even** | Never (public good) | Month 7-8 |
| **Profit by Year 3** | $0 | +$50,000 cumulative |

---

## ✅ Next Steps

1. **Decide on architecture**: Shared DB (recommended) vs Separate DBs
2. **Apply migration**: Run `MULTI_TENANT_SCHEMA.sql` on test database
3. **Identify pilot towns**: Reach out to 2-3 nearby towns
4. **Update codebase**: Add organization context (3-5 days)
5. **Launch pilot**: Onboard first 3 towns (Month 1-3)
6. **Build self-service**: Enable towns to sign up themselves (Month 4-6)
7. **Scale**: Reach 10+ towns, achieve profitability (Month 7-12)

**The multi-town model is not just scalable—it's MORE profitable and sustainable than serving a single town.**

Ready to expand? 🚀
