# Analytics & Transcript Features Guide

## Overview

This document covers the new analytics dashboard and full transcript features added to AckIndex.

---

## 🎯 What Was Built

### 1. **Comprehensive Analytics Dashboard** (`/admin/analytics`)

A dedicated analytics page providing deep insights into user behavior and system performance:

#### **Key Features:**
- **Overview Stats Cards**
  - Total queries (with today/week breakdowns)
  - Total users
  - Success rate
  - Average response time

- **Peak Usage Times**
  - Hour-by-hour query volume (last 30 days)
  - Visual bar charts
  - Unique user counts per hour
  - Helps identify best/worst maintenance windows

- **Usage by Day of Week**
  - Query patterns throughout the week
  - Average queries per day
  - Unique user engagement

- **Most Viewed Meetings/Documents**
  - Top 15 most-referenced content
  - View counts and unique users
  - Last viewed timestamps
  - Document type and source links

- **Popular Searches**
  - Top 10 most frequently asked questions
  - Query counts
  - Success rates
  - Average citations per query

- **Trending Topics**
  - Queries with week-over-week growth
  - Growth percentages
  - Comparison metrics

- **PDF Export**
  - One-click export of analytics report
  - Uses browser print functionality
  - Saves to PDF for archival

#### **Access:**
- URL: `/admin/analytics`
- Direct button on main admin dashboard
- Requires admin authentication

---

### 2. **Full Transcript Display in Blog Posts**

Blog posts now include complete, searchable transcripts with download capabilities.

#### **Key Features:**

##### **Transcript Display:**
- Expandable section below each blog article
- Full meeting transcript reconstructed from chunks
- Timestamps for each section (if available)
- Speaker information preserved

##### **Search Within Transcript:**
- Real-time full-text search
- Highlights matching sections
- Shows relevance ranking
- Timestamp links to source video

##### **Download Options:**
- **TXT format** - Plain text transcript
- **SRT format** - Subtitle file with timestamps
- **VTT format** - WebVTT subtitle format
- All downloads include proper timestamps

##### **YouTube Integration:**
- "Jump to video" links for each timestamped section
- Direct linking to specific moments in source video
- Seamless integration with YouTube player

---

## 📁 Files Created/Modified

### **Database Migrations:**

1. **`supabase/migrations/20251112_enhanced_analytics.sql`**
   - SQL functions for peak usage times
   - Most viewed documents tracking
   - Day-of-week usage patterns
   - Search effectiveness metrics

2. **`supabase/migrations/20251112_blog_transcripts.sql`**
   - `get_full_transcript(doc_id)` - Reconstructs full transcript
   - `get_transcript_chunks(doc_id)` - Returns timestamped chunks
   - `search_document_transcript(doc_id, query)` - Full-text search

### **API Routes:**

1. **`src/app/api/transcripts/[documentId]/route.ts`**
   - GET transcript in multiple formats (JSON, TXT, SRT, VTT)
   - Search within transcript
   - Timestamp formatting utilities

2. **`src/app/api/admin/analytics/route.ts`** (Modified)
   - Added support for new analytics types:
     - `peak-times`
     - `most-viewed`
     - `day-of-week`
     - `effectiveness`

### **Library Functions:**

1. **`src/lib/analytics.ts`** (Modified)
   - `getPeakUsageTimes(daysBack)` - Hour-by-hour query volume
   - `getMostViewedDocuments(limit, daysBack)` - Most referenced content
   - `getUsageByDayOfWeek(daysBack)` - Weekly patterns
   - `getSearchEffectivenessMetrics()` - Quality metrics

### **Pages:**

1. **`src/app/admin/analytics/page.tsx`** (New)
   - Full analytics dashboard page
   - Visual charts and tables
   - PDF export functionality
   - Dark mode support

2. **`src/app/blog/[slug]/page.tsx`** (Modified)
   - Added `TranscriptSection` component
   - Integrated full transcript display

3. **`src/app/admin/page.tsx`** (Modified)
   - Added prominent Analytics Dashboard card
   - Improved "View Full Analytics" button

### **Components:**

1. **`src/components/TranscriptSection.tsx`** (New)
   - Expandable transcript viewer
   - Search functionality
   - Download buttons (TXT, SRT, VTT)
   - Timestamp navigation
   - YouTube video integration

2. **`src/components/AnalyticsDashboard.tsx`** (Existing - still works on main admin page)

---

## 🚀 How to Use

### **For Admins:**

#### **Accessing Analytics:**
1. Log in to admin panel (`/admin/login`)
2. Click the purple "Analytics Dashboard" card on the main page
3. Or use the "View Full Analytics" button in the Analytics Overview section

#### **Exporting Analytics Reports:**
1. Navigate to `/admin/analytics`
2. Click "Export Report (PDF)" in the top-right
3. Use browser's print dialog to save as PDF
4. Schedule weekly/monthly exports as needed

#### **Understanding Metrics:**
- **Peak Usage Times** - Best times for maintenance: look for hours with lowest activity
- **Most Viewed Meetings** - Popular content that resonates with residents
- **Trending Topics** - Emerging interests requiring new content
- **Popular Searches** - Common questions to address in blog posts

### **For Blog Readers:**

#### **Viewing Transcripts:**
1. Read any blog post at `/blog/[slug]`
2. Scroll to "Full Meeting Transcript" section
3. Click "View Transcript" to expand

#### **Searching Transcripts:**
1. Expand the transcript section
2. Type search query in the search box
3. Press Enter or click "Search"
4. Results show matching sections with timestamps
5. Click "Jump to video" to watch that moment

#### **Downloading Transcripts:**
1. Expand the transcript
2. Choose format:
   - **TXT** - For reading/archival
   - **SRT** - For video subtitles
   - **VTT** - For web video players
3. Click download button
4. File saves to your Downloads folder

---

## 🗂️ Transcript Archive System

### **How Transcripts Are Stored:**

1. **Database Storage:**
   - Full transcripts stored in `document_chunks` table
   - Chunked for efficient semantic search
   - Metadata includes:
     - Timestamps (start/end)
     - Speaker information
     - Chunk type (summary vs transcript)

2. **Local Archive Strategy:**

   **Option A: Manual Download (Recommended)**
   - Use the download buttons on each blog post
   - Save transcripts in organized folders:
     ```
     /archives
       /2024
         /11-November
           meeting-title-2024-11-05.txt
           meeting-title-2024-11-05.srt
       /2025
         /01-January
           ...
     ```

   **Option B: Automated Backup Script**
   - Create a script to fetch all transcripts via API
   - Schedule with cron (weekly/monthly)
   - Example script structure:

   ```bash
   #!/bin/bash
   # fetch-transcripts.sh

   OUTPUT_DIR="/path/to/archives/$(date +%Y/%m-%B)"
   mkdir -p "$OUTPUT_DIR"

   # Get all document IDs from database
   # For each document:
   #   curl http://localhost:3000/api/transcripts/{id}?format=txt \
   #     -o "$OUTPUT_DIR/{title}.txt"
   ```

   **Option C: Database Backup**
   - Use Supabase's built-in backup features
   - Export `document_chunks` table regularly
   - Store backups offsite (AWS S3, Google Drive, etc.)

### **Reconstruction from Backup:**

If you need to restore transcripts:

```sql
-- Query to reconstruct transcript from document_id
SELECT
  STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_transcript
FROM document_chunks
WHERE document_id = 'YOUR-DOCUMENT-ID'
  AND (metadata->>'chunk_type' = 'transcript' OR metadata->>'chunk_type' IS NULL);
```

---

## 📊 Analytics Data Points

### **Available Metrics:**

| Metric | Description | Use Case |
|--------|-------------|----------|
| `total_queries` | All-time query count | System usage growth |
| `queries_today` | Queries in last 24h | Daily activity monitoring |
| `queries_this_week` | Queries in last 7 days | Weekly trends |
| `avg_response_time_ms` | Average API response time | Performance monitoring |
| `success_rate` | % of queries with results | Content coverage quality |
| `helpful_rate` | % of positive user feedback | Answer quality |
| `peak_usage_times` | Query volume by hour | Maintenance scheduling |
| `most_viewed_documents` | Top referenced meetings | Content popularity |
| `trending_topics` | Week-over-week growth | Emerging interests |
| `day_of_week_usage` | Queries by weekday | User behavior patterns |

### **Query Parameters:**

```typescript
// API endpoint: /api/admin/analytics

// Overview
GET /api/admin/analytics?type=overview

// Popular searches (last 30 days)
GET /api/admin/analytics?type=popular&limit=20&days=30

// Trending topics
GET /api/admin/analytics?type=trending&limit=10

// Peak usage times
GET /api/admin/analytics?type=peak-times&days=30

// Most viewed documents
GET /api/admin/analytics?type=most-viewed&limit=15&days=30

// Day of week patterns
GET /api/admin/analytics?type=day-of-week&days=30
```

---

## 🔧 Database Functions Reference

### **Analytics Functions:**

```sql
-- Get peak usage by hour
SELECT * FROM get_peak_usage_times(30);

-- Get most viewed documents
SELECT * FROM get_most_viewed_documents(20, 30);

-- Get usage by day of week
SELECT * FROM get_usage_by_day_of_week(30);

-- Get overall analytics
SELECT * FROM get_admin_analytics_overview();
```

### **Transcript Functions:**

```sql
-- Get full transcript
SELECT * FROM get_full_transcript('document-id-here');

-- Get transcript chunks with timestamps
SELECT * FROM get_transcript_chunks('document-id-here');

-- Search within transcript
SELECT * FROM search_document_transcript('document-id-here', 'zoning');
```

---

## 🎨 UI/UX Features

### **Dark Mode Support:**
- All analytics and transcript features support dark mode
- Automatic theme switching based on user preference
- High contrast ratios for readability

### **Responsive Design:**
- Mobile-friendly analytics dashboard
- Transcript search works on all devices
- Touch-optimized download buttons

### **Accessibility:**
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader compatible

---

## 🔐 Security & Permissions

### **Analytics Access:**
- Requires admin authentication
- Protected by RLS policies
- No public access to sensitive data

### **Transcript Access:**
- Public transcripts for published blog posts
- API requires authentication for raw access
- Download rate limiting recommended (future enhancement)

---

## 📈 Future Enhancements

### **Potential Additions:**

1. **Advanced Analytics:**
   - User cohort analysis
   - Query intent classification
   - Sentiment analysis of feedback
   - Cost per query tracking

2. **Transcript Features:**
   - AI-generated summaries
   - Keyword extraction and tagging
   - Speaker identification and labeling
   - Multi-language translation

3. **Export Options:**
   - Excel/CSV export for analytics
   - Automated email reports
   - Dashboard API for external tools
   - Real-time analytics streaming

4. **Archive Automation:**
   - Automatic S3/Google Drive backup
   - Scheduled transcript exports
   - Version control for transcripts
   - Change detection and alerts

---

## 📝 Maintenance Tasks

### **Regular Tasks:**

**Weekly:**
- Export analytics PDF report
- Review trending topics
- Check for anomalies in usage patterns

**Monthly:**
- Archive all new transcripts
- Review most viewed content
- Analyze growth metrics
- Plan content based on popular searches

**Quarterly:**
- Backup entire database
- Review storage usage
- Optimize chunk storage if needed
- Update analytics dashboards based on needs

---

## 🐛 Troubleshooting

### **Common Issues:**

**Analytics not loading:**
- Check admin authentication
- Verify database migration applied
- Check browser console for errors
- Confirm API route accessibility

**Transcript not displaying:**
- Verify document has chunks in database
- Check `document_chunks` table for document_id
- Ensure `chunk_type` metadata is set correctly
- Check network tab for API errors

**Download not working:**
- Verify transcript chunks have timestamps
- Check browser popup blocker settings
- Confirm API route returns correct Content-Type
- Test with different browsers

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review database logs in Supabase
3. Check browser console for client-side errors
4. Review API logs for server-side errors

---

**Last Updated:** November 12, 2024
**Version:** 1.0.0
