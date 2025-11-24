# Anti-Hallucination System - Deployment Checklist

## ✅ Pre-Deployment

### 1. Run Database Migration
```bash
# From project root:
supabase db push
```

**What this does**:
- Creates `flagged_responses` table
- Creates `hallucination_metrics` table
- Creates `verification_logs` table
- Adds SQL functions: `record_query_metrics()`, `record_flagged_response()`

**Verify**:
```sql
-- In Supabase SQL Editor, check tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('flagged_responses', 'hallucination_metrics', 'verification_logs');
```

### 2. Build & Test Locally
```bash
npm run build
# Should complete with no TypeScript errors

npm run dev
# Test at http://localhost:3000
```

### 3. Test Key Features
- [ ] Send a test query
- [ ] Check confidence badge appears (🟢/🟡/🔴)
- [ ] Verify unlimited sources show (if 78%+ similarity)
- [ ] Click "Report Issue" button
- [ ] Visit `/admin/anti-hallucination` dashboard
- [ ] Confirm flagged issue appears in dashboard

---

## 🚀 Deployment

### 1. Commit Changes
```bash
git add .
git commit -m "Add anti-hallucination system with multi-layer verification

- Increase similarity threshold to 0.78 (stricter)
- Remove 3-source cap (unlimited citations)
- Add 4-layer verification (structural, numerical, speculation, cross-model)
- Add user flagging system
- Add metrics dashboard at /admin/anti-hallucination
- Add confidence badges to UI

Implements CivicRAG Anti-Hallucination System requirements for near-100% accuracy."
git push
```

### 2. Deploy to Production
```bash
# Vercel (if using)
vercel --prod

# Or your deployment command
npm run deploy
```

### 3. Run Migration on Production
```bash
# Option 1: Supabase CLI
supabase db push --project-ref YOUR_PROJECT_REF

# Option 2: Supabase Dashboard
# Go to SQL Editor and run migration manually
```

---

## 📊 Post-Deployment (First 24 Hours)

### Hour 1: Smoke Test
- [ ] Visit production site
- [ ] Send 3-5 test queries
- [ ] Verify responses work correctly
- [ ] Check confidence badges display
- [ ] Check Sentry for errors

### Hour 4: Initial Metrics Check
Visit `/admin/anti-hallucination`:
- [ ] Verify metrics are recording
- [ ] Check confidence distribution
- [ ] Review any blocked responses
- [ ] Check flagged response count

### Hour 24: First Day Review
- [ ] Total queries processed?
- [ ] Blocked response rate: 2-8% expected
- [ ] High confidence rate: 70%+ expected
- [ ] Any user flags? Review them
- [ ] Check Sentry for verification errors

---

## 🔍 Week 1 Monitoring

### Daily Tasks
- [ ] Check `/admin/anti-hallucination` dashboard
- [ ] Review flagged responses
- [ ] Monitor blocked response rate
- [ ] Check for verification errors in logs

### Metrics to Track

| Day | Queries | Blocked | Flagged | High Conf % | Notes |
|-----|---------|---------|---------|-------------|-------|
| 1   |         |         |         |             |       |
| 2   |         |         |         |             |       |
| 3   |         |         |         |             |       |
| 7   |         |         |         |             |       |

### Red Flags 🚨

**Stop & Tune if**:
- Blocked rate > 15% → Too strict
- High confidence < 50% → Source quality issue
- Hallucination rate > 5% → Increase threshold
- User flags > 10% of queries → Review system prompt

---

## 🛠️ Tuning Guide

### If Too Many Blocks (>10%)

**Option 1**: Lower cross-model threshold
```typescript
// src/lib/antiHallucination.ts:165
result.confidence >= 75 // was 80
```

**Option 2**: Skip cross-model verification
```typescript
// src/app/api/chat/route.ts:400
{ skipCrossModel: true }
```

### If Too Few High Confidence Responses (<60%)

**Option 1**: Add more source documents
- More documents = better matches

**Option 2**: Review embedding quality
- Check if embeddings are being generated

**Option 3**: Lower similarity threshold slightly
```typescript
// src/app/api/chat/route.ts:245
minSimilarity: 0.75 // was 0.78
```

### If Hallucinations Still Occur (>2%)

**Option 1**: Increase similarity threshold
```typescript
minSimilarity: 0.80 // was 0.78
```

**Option 2**: Increase cross-model threshold
```typescript
result.confidence >= 85 // was 80
```

**Option 3**: Enable cross-model if disabled
```typescript
{ skipCrossModel: false }
```

---

## 📈 Success Criteria (30 Days)

### Primary Goals
- [ ] Hallucination rate < 1%
- [ ] Zero critical user-reported hallucinations
- [ ] Citation completeness > 95%
- [ ] System uptime > 99.5%

### Secondary Goals
- [ ] High confidence responses > 70%
- [ ] Blocked response rate stabilized (2-8%)
- [ ] Average response time < 1.5 seconds
- [ ] User satisfaction maintained/improved

---

## 🔧 Rollback Plan

### If Critical Issues Arise

**Quick Rollback** (disable verification):
```typescript
// src/app/api/chat/route.ts
// Comment out verification section (lines 393-483)

/*
const verification = await verifyResponse(...);
... all verification code ...
*/

// Skip to usage tracking
```

**Database Rollback** (if needed):
```sql
-- Drop new tables (CAUTION: loses data)
DROP TABLE IF EXISTS verification_logs;
DROP TABLE IF EXISTS hallucination_metrics;
DROP TABLE IF EXISTS flagged_responses;
```

**Full Rollback**:
```bash
git revert HEAD
git push
npm run deploy
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Migration fails with "table already exists"
**Solution**: Tables already created, skip migration or drop existing tables first

**Issue**: Confidence badge not showing
**Solution**: Check ChatMessage component receives verification prop

**Issue**: Dashboard shows no data
**Solution**:
1. Verify `record_query_metrics()` function exists
2. Check if queries are being processed
3. Look for errors in logs

**Issue**: All responses blocked
**Solution**: Cross-model verification may be failing, set `skipCrossModel: true`

**Issue**: Admin dashboard 403 error
**Solution**: Check RLS policies allow reading metrics tables

---

## 🎯 Key Files Reference

### If You Need to Debug

**Backend Logic**:
- `src/lib/antiHallucination.ts:165` - Cross-model confidence threshold
- `src/app/api/chat/route.ts:245` - Similarity threshold
- `src/app/api/chat/route.ts:393-483` - Verification integration

**Database**:
- `supabase/migrations/20251124_anti_hallucination_system.sql` - Schema

**UI Components**:
- `src/components/ConfidenceBadge.tsx` - Badge display
- `src/components/FlagResponseButton.tsx` - Flagging UI
- `src/components/ChatMessage.tsx` - Integration point

**Admin**:
- `src/app/admin/anti-hallucination/page.tsx` - Dashboard
- `src/app/api/flag-response/route.ts` - Flagging API

---

## ✅ Final Checklist

Before marking complete:
- [ ] Database migration run successfully
- [ ] Build completes with no errors
- [ ] Test query works locally
- [ ] Confidence badge displays
- [ ] Flagging system works
- [ ] Admin dashboard loads
- [ ] Deployed to production
- [ ] Production smoke test passed
- [ ] Metrics recording in production
- [ ] Team notified of new dashboard

---

## 📊 Expected Timeline

- **Day 1**: Deploy, smoke test, monitor closely
- **Days 2-7**: Daily dashboard checks, tune if needed
- **Week 2**: Review weekly metrics, adjust thresholds
- **Week 3-4**: Stabilization, establish baselines
- **Month 2**: Optimize based on data

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Users see confidence badges
- ✅ Multiple sources display (not just 3)
- ✅ Metrics dashboard populating
- ✅ Blocked responses logged
- ✅ User flags tracked
- ✅ No hallucination complaints

---

**Status**: Ready for deployment! 🚀

**Estimated Downtime**: None (backwards compatible)

**Risk Level**: Low (can rollback easily)

**Impact**: High (significantly improved accuracy)
