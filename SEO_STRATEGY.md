# AckIndex SEO Strategy

## Goal: Rank for "nantucket town" and related searches

Current ranking target keywords:
- "nantucket town" (very competitive)
- "nantucket town meetings"
- "nantucket select board"
- "nantucket planning board"
- "nantucket government"

---

## 1. Quick Wins (Do Now) 🚀

### A. Add Open Graph Image
**Impact**: High (improves social sharing CTR)
**Effort**: Low

Create a 1200x630px image for social sharing:
- Logo + tagline
- Shows in Facebook, Twitter, LinkedIn previews
- Dramatically improves click-through rate

**Implementation:**
```typescript
// src/app/layout.tsx
openGraph: {
  images: [{
    url: 'https://www.ackindex.com/og-image.png',
    width: 1200,
    height: 630,
    alt: 'AckIndex - Search Nantucket Town Meetings'
  }]
}
```

### B. Create Sitemap with Priority
**Impact**: Medium (helps Google crawl efficiently)
**Effort**: Low

```xml
<!-- public/sitemap.xml -->
<url>
  <loc>https://www.ackindex.com/</loc>
  <priority>1.0</priority>
  <changefreq>daily</changefreq>
</url>
<url>
  <loc>https://www.ackindex.com/blog</loc>
  <priority>0.8</priority>
  <changefreq>weekly</changefreq>
</url>
```

### C. Add Structured Data for Local Business
**Impact**: High (Google Knowledge Panel, local SEO)
**Effort**: Low

```json
{
  "@type": "LocalBusiness",
  "name": "AckIndex",
  "description": "Town meeting search for Nantucket",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Nantucket",
    "addressRegion": "MA"
  },
  "areaServed": {
    "@type": "City",
    "name": "Nantucket"
  }
}
```

### D. Optimize URL Structure
**Impact**: Medium
**Effort**: Low

Current: `ackindex.com`
Better: Add keyword-rich pages:
- `/nantucket-town-meetings`
- `/select-board`
- `/planning-board`
- `/how-it-works`

---

## 2. Content Strategy (Do This Month) 📝

### A. Create Landing Pages for Each Board

**Page**: `/select-board`
- Title: "Nantucket Select Board Meetings | Search & Transcripts"
- Content: What Select Board does, recent decisions, how to search
- Keywords: "nantucket select board", "select board meetings nantucket"

**Page**: `/planning-board`
- Title: "Nantucket Planning Board Meetings | Zoning & Development"
- Content: Planning board role, major projects, building permits
- Keywords: "nantucket planning board", "nantucket zoning"

**Page**: `/town-council`
- Title: "Nantucket Town Council Meetings | Budget & Policy"
- Content: Town council responsibilities, voting records
- Keywords: "nantucket town council", "nantucket budget"

### B. Create "How It Works" Page

**Page**: `/how-it-works`
- Title: "How to Search Nantucket Town Meetings | AckIndex Guide"
- Step-by-step guide with screenshots
- Video walkthrough
- FAQ section
- Keywords: "how to find nantucket meeting minutes", "search nantucket government"

### C. Blog with Local Keywords

Create blog posts targeting long-tail keywords:

1. **"Complete Guide to Nantucket Town Meetings"**
   - What each board does
   - When they meet
   - How to participate
   - Target: "nantucket town meeting guide"

2. **"How to Find Nantucket Select Board Decisions"**
   - Examples of searches
   - How to verify quotes
   - Target: "find select board decisions nantucket"

3. **"Nantucket Planning Board: What You Need to Know"**
   - Building permits
   - Zoning changes
   - Development projects
   - Target: "nantucket planning board decisions"

4. **"Understanding Nantucket Local Government"**
   - Government structure
   - Who's who
   - How decisions are made
   - Target: "nantucket government structure"

---

## 3. Technical SEO (Do This Quarter) 🔧

### A. Improve Page Speed
**Current**: Good (~100-200ms)
**Goal**: Maintain under 2s

- Lazy load images
- Optimize font loading
- Code splitting

### B. Add Breadcrumbs
```html
Home > Nantucket Town Meetings > Select Board
```

### C. Schema Markup for Each Meeting
```json
{
  "@type": "Event",
  "name": "Nantucket Select Board Meeting - Jan 15, 2025",
  "startDate": "2025-01-15T18:00",
  "location": "Nantucket Town Hall"
}
```

### D. Internal Linking
- Link blog posts to main pages
- Link meeting results to board pages
- Create topic clusters

---

## 4. Off-Page SEO (Ongoing) 🌐

### A. Get Local Backlinks

**Priority targets:**
1. **Nantucket Current** (local news) - Get featured/mentioned
2. **ACK Now** (Nantucket news) - Press release about transparency tool
3. **Nantucket Chamber of Commerce** - Business directory listing
4. **Nantucket Atheneum** (library) - Civic resources page
5. **Town of Nantucket website** - Link to AckIndex as meeting resource

**Outreach strategy:**
- Email: "We've made Nantucket town meetings searchable"
- Offer: Free tool for residents, journalists, real estate professionals
- Angle: Government transparency, civic engagement

### B. Get Media Coverage

**Local press:**
- Nantucket Current
- Nantucket Inquirer and Mirror
- ACK Now

**Regional press:**
- Cape Cod Times
- Boston Globe (local government innovation angle)

**Pitch angles:**
1. "AI brings transparency to small-town government"
2. "Nantucket resident builds tool to search town meetings"
3. "How one tool is making local government more accessible"

### C. Social Media Presence

Create accounts and post regularly:
- Twitter: Share interesting quotes from meetings
- Facebook: Nantucket community groups
- LinkedIn: Government transparency, civic tech

**Example posts:**
- "Did you know the Select Board discussed [topic] at last week's meeting? Search it on AckIndex"
- "Quick: What did Planning Board decide about [project]? Find out in 5 seconds"

---

## 5. Content Marketing (Quick Wins) 📢

### A. Weekly "Meeting Highlights" Blog

Post every Monday:
- "This Week in Nantucket Town Meetings"
- Top 3 decisions/discussions
- Links to search relevant topics
- Share on social media

**SEO benefit:**
- Fresh content (Google loves this)
- Long-tail keywords ("nantucket select board january 2025")
- Internal links to meeting pages

### B. Email Newsletter

Collect emails (you already have signup):
- Weekly summary of meetings
- Notable decisions
- Community engagement

**SEO benefit:**
- Return traffic signals quality to Google
- Shares and backlinks from engaged users

### C. Press Kit

Create `/press` page with:
- Logo downloads
- Screenshots
- Founder bio
- Press releases
- Media mentions

Makes it easy for journalists to write about you.

---

## 6. Local SEO Domination 🎯

### A. Google Business Profile

Create a GBP listing:
- Category: "Government Information Service" or "Software Company"
- Location: Nantucket, MA
- Description: "Search Nantucket town meetings instantly"
- Posts: Weekly meeting highlights

**Impact**: Appear in "Nantucket town meetings" Google Maps results

### B. Bing Places

Same as Google Business Profile but for Bing.

### C. Local Directories

Get listed on:
- Nantucket Chamber of Commerce directory
- MassLive local business directory
- Cape Cod business directories
- Government transparency tools lists

---

## 7. Keyword Strategy 📊

### Current Keywords (Ranking Potential)

**High competition (hard to rank):**
- "nantucket" (too broad)
- "nantucket town" (very competitive)

**Medium competition (rankable with work):**
- "nantucket town meetings"
- "nantucket select board"
- "nantucket planning board"

**Low competition (easy wins):**
- "nantucket town meeting search"
- "search nantucket meetings"
- "nantucket meeting transcripts"
- "nantucket select board minutes"
- "nantucket planning board decisions"

### Long-tail Keywords (Target These First)

These have low competition and high intent:
- "how to search nantucket town meetings"
- "find nantucket select board decisions"
- "nantucket planning board meeting minutes"
- "nantucket town council votes"
- "nantucket zoning board decisions"
- "nantucket special town meeting [year]"
- "what did nantucket select board decide"

---

## 8. Competitive Analysis 🔍

### Current competitors for "nantucket town":

1. **nantucket-ma.gov** (official town website)
   - High authority, but bad UX
   - You differentiate with search + AI

2. **Nantucket Current** (news)
   - High authority, local news
   - Partner opportunity

3. **Wikipedia**
   - Generic info
   - You have specific meeting data

### Your Competitive Advantages:

✅ Only searchable meeting database
✅ AI-powered (unique selling point)
✅ Timestamped quotes (verifiable)
✅ Better UX than government sites
✅ Faster than digging through archives

---

## 9. Action Plan (Next 30 Days) ✅

### Week 1: Quick Technical Wins
- [ ] Create and add Open Graph image (1200x630)
- [ ] Update sitemap.xml with priorities
- [ ] Add LocalBusiness schema to homepage
- [ ] Create `/how-it-works` page

### Week 2: Content Foundation
- [ ] Create `/select-board` landing page
- [ ] Create `/planning-board` landing page
- [ ] Create `/town-council` landing page
- [ ] Write first blog post: "Complete Guide to Nantucket Town Meetings"

### Week 3: Outreach
- [ ] Set up Google Business Profile
- [ ] Email Nantucket Current about AckIndex
- [ ] Email Nantucket Chamber of Commerce for directory listing
- [ ] Post on Nantucket Facebook groups

### Week 4: Content Marketing
- [ ] Publish second blog post
- [ ] Start "This Week in Nantucket Meetings" series
- [ ] Share interesting meeting quotes on Twitter/Facebook
- [ ] Create press kit at `/press`

---

## 10. Measuring Success 📈

### Track These Metrics:

**Google Search Console:**
- Impressions for "nantucket town"
- Click-through rate
- Average position for target keywords

**Google Analytics:**
- Organic traffic growth
- Pages per session (engagement)
- Bounce rate

**Goals:**
- Month 1: Rank in top 50 for "nantucket town meetings"
- Month 3: Rank in top 20 for "nantucket select board"
- Month 6: Rank in top 10 for "search nantucket meetings"
- Month 12: Rank in top 5 for brand + keyword combinations

---

## 11. Budget-Friendly Tips 💰

### Free Tools:
- Google Search Console (track rankings)
- Google Analytics (track traffic)
- Ubersuggest (keyword research - free tier)
- AnswerThePublic (find question keywords)

### Low-Cost Tools ($10-50/mo):
- Ahrefs Lite ($20/mo) - competitor analysis
- Semrush ($50/mo) - keyword tracking

### No-Cost Tactics:
- Guest posting on local blogs
- Participating in Nantucket Facebook groups
- Answering questions on local forums
- Sharing meeting highlights on social

---

## Priority Ranking

**Do First (Highest ROI):**
1. Create Open Graph image ⭐⭐⭐⭐⭐
2. Write first blog post ⭐⭐⭐⭐⭐
3. Create board landing pages ⭐⭐⭐⭐
4. Set up Google Business Profile ⭐⭐⭐⭐
5. Email local press ⭐⭐⭐⭐

**Do Soon:**
6. Weekly blog posts
7. Local directory listings
8. Social media presence
9. Internal linking strategy
10. Schema markup for meetings

**Do Eventually:**
11. Video tutorials
12. Podcast interviews
13. Guest posts on civic tech blogs
14. Conference presentations

---

## Expected Timeline

**Month 1-2:** Start seeing traffic for long-tail keywords
**Month 3-4:** Rank for "nantucket [board name] meetings"
**Month 6-8:** Rank for "nantucket town meetings"
**Month 12+:** Rank for broader terms like "nantucket government"

**Reality check:** Ranking for just "nantucket town" is VERY hard (competing with the official town website). Better to dominate specific niches first:
- "nantucket town meetings" ✅
- "nantucket select board" ✅
- "search nantucket meetings" ✅

Then expand from there as domain authority grows.
