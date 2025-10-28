# 🎉 Stage 7 Complete: Admin Panel - Scraping & Parsing

## ✅ What Was Built

Stage 7 implements the complete data processing pipeline for AckIndex. URLs are scraped, PDFs are parsed, content is chunked, and everything is stored in a searchable database.

### Core Features Implemented

1. **Supabase Database Schema**
   - `documents` table for tracking uploads
   - `document_chunks` table for storing parsed content
   - `scrape_jobs` table for tracking Apify jobs
   - Full-text search indexes
   - Row Level Security policies

2. **Apify Web Scraping**
   - Automated website crawling
   - PDF extraction from websites
   - Multi-page content aggregation
   - Job status tracking

3. **PDF Parsing with AI**
   - Text extraction from PDF files
   - OpenAI enhancement for better quality
   - Automatic title and summary extraction
   - Metadata preservation

4. **Intelligent Content Chunking**
   - Semantic text chunking (500 tokens per chunk)
   - Overlap between chunks for context
   - Heading detection and preservation
   - Token counting

5. **Activity Feed**
   - Real-time upload status tracking
   - Document processing progress
   - Error reporting
   - Auto-refresh every 10 seconds

### Files Created

**Database:**
- `supabase-schema.sql` - Complete database schema

**Utilities:**
- `src/lib/chunking.ts` - Text chunking and processing
- `src/lib/pdfParser.ts` - PDF parsing with OpenAI
- `src/lib/apifyScraper.ts` - Apify web scraping integration
- `src/lib/database.ts` - Database operations

**Components:**
- `src/components/ActivityFeed.tsx` - Real-time activity tracking

**API Routes:**
- `src/app/api/admin/scrape-url/route.ts` - Updated with full scraping
- `src/app/api/admin/upload-pdf/route.ts` - Updated with full parsing
- `src/app/api/admin/documents/route.ts` - Fetch documents

**Updated Files:**
- `src/app/admin/page.tsx` - Now displays ActivityFeed
- `src/components/Badge.tsx` - Added more variants
- `package.json` - Added pdf-parse dependency

---

## 🔧 Setup Instructions

### Step 1: Set Up Supabase Database

1. **Open Supabase SQL Editor**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor**

2. **Run the Schema**
   - Open `supabase-schema.sql` from your project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run**

3. **Verify Tables Created**
   - Go to **Table Editor**
   - You should see:
     - `documents`
     - `document_chunks`
     - `scrape_jobs`

### Step 2: Get API Keys

You'll need three API keys for Stage 7:

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Copy the key (starts with `sk-`)
4. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-your_key_here
   ```

#### Apify API Token
1. Go to https://console.apify.com/account/integrations
2. Copy your **API Token**
3. Add to `.env.local`:
   ```env
   APIFY_API_TOKEN=your_token_here
   APIFY_ACTOR_ID=apify/website-content-crawler
   ```

#### Supabase Service Role Key
1. Already set up in Stage 6
2. Verify it's in `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Step 3: Install New Dependencies

```bash
npm install
```

This will install the new `pdf-parse` package.

### Step 4: Test the System

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Log into admin panel:**
   - Visit http://localhost:3000/admin
   - Sign in with your credentials

3. **Test PDF Upload:**
   - Upload a small PDF file (< 5MB)
   - Watch the Activity Feed
   - Status should change: Pending → Processing → Completed
   - Check Supabase: Table Editor → `documents` → You should see your document
   - Check `document_chunks` → You should see parsed chunks

4. **Test URL Scraping:**
   - Enter a simple URL (e.g., a blog post)
   - Watch the Activity Feed
   - This will take 1-5 minutes depending on the site
   - Status should change: Pending → Processing → Completed
   - Check Supabase for documents and chunks

---

## 🎨 How It Works

### URL Scraping Flow

```
1. User submits URL
   ↓
2. Create document record (status: pending)
   ↓
3. Start Apify scraping job
   ↓
4. Update status to processing
   ↓
5. Wait for Apify to complete crawling
   ↓
6. Download and parse any PDFs found
   ↓
7. Chunk all text content
   ↓
8. Store chunks in Supabase
   ↓
9. Update status to completed
```

### PDF Upload Flow

```
1. User uploads PDF file
   ↓
2. Create document record (status: pending)
   ↓
3. Extract text from PDF
   ↓
4. Enhance text with OpenAI (clean up OCR errors)
   ↓
5. Extract title and summary
   ↓
6. Chunk text (500 tokens per chunk, 50 token overlap)
   ↓
7. Store chunks in Supabase
   ↓
8. Update status to completed
```

### Content Chunking Strategy

- **Chunk Size:** ~500 tokens (≈2000 characters)
- **Overlap:** 50 tokens between chunks for context
- **Preserves:** Paragraphs and headings when possible
- **Metadata:** Includes source URL, title, page numbers, etc.

---

## 📊 Database Schema Overview

### `documents` Table
Tracks all uploaded/scraped documents:
- `id` - Unique identifier
- `source_type` - 'url' or 'pdf'
- `source_url` / `filename` - Origin of content
- `title` / `description` - Document metadata
- `status` - pending | processing | completed | failed
- `total_chunks` - Number of chunks created
- `created_at` / `updated_at` - Timestamps

### `document_chunks` Table
Stores parsed and chunked content:
- `id` - Unique identifier
- `document_id` - Reference to parent document
- `content` - The actual text chunk
- `chunk_index` - Order within document
- `metadata` - JSON with source URLs, titles, etc.

### `scrape_jobs` Table
Tracks Apify scraping jobs:
- `id` - Unique identifier
- `document_id` - Reference to parent document
- `apify_run_id` - Apify job ID
- `url` - Website being scraped
- `pages_crawled` / `pdfs_found` - Statistics

---

## 🧪 Testing Checklist

- [ ] Database schema runs without errors
- [ ] Can upload a PDF file
- [ ] PDF status changes to "Processing" then "Completed"
- [ ] PDF chunks appear in `document_chunks` table
- [ ] Can submit a URL for scraping
- [ ] URL status updates correctly
- [ ] Activity feed displays documents
- [ ] Activity feed auto-refreshes
- [ ] Failed uploads show error messages
- [ ] Can see chunk count for completed documents

---

## 🔍 Troubleshooting

### "Failed to extract text from PDF"
**Cause:** PDF might be image-only or corrupted  
**Solution:** 
- Try a different PDF
- Ensure PDF contains actual text (not just scanned images)
- Check browser console for detailed error

### "Failed to start web scraping job"
**Cause:** Invalid Apify API token or URL  
**Solution:**
- Verify `APIFY_API_TOKEN` in `.env.local`
- Ensure URL is valid and accessible
- Check Apify dashboard for any account issues

### "OpenAI API error"
**Cause:** Invalid API key or quota exceeded  
**Solution:**
- Verify `OPENAI_API_KEY` in `.env.local`
- Check https://platform.openai.com/usage for quota
- Can disable AI enhancement by setting `useAI: false` in `parsePDF()`

### Activity Feed shows "Failed to load activity"
**Cause:** Database connection issue or missing tables  
**Solution:**
- Verify Supabase credentials in `.env.local`
- Ensure database schema was run successfully
- Check browser console for API errors

### Documents stuck in "Processing"
**Cause:** Background job failed silently  
**Solution:**
- Check server console logs for errors
- Restart the dev server
- Verify all API keys are correct
- For Apify jobs, check status at https://console.apify.com/actors/runs

### Chunks not being created
**Cause:** Text extraction failed or content too short  
**Solution:**
- Ensure documents have enough content (>100 characters)
- Check `documents` table for error_message
- Try with a longer document

---

## 📝 What's Next: Stage 8

**Stage 8: Chatbot Backend - RAG System**

Now that content is indexed, Stage 8 will implement the retrieval system:

1. **Vector Embeddings**
   - Generate embeddings for all chunks
   - Store in Supabase with pgvector extension

2. **Semantic Search**
   - Find relevant chunks for user queries
   - Rank by relevance

3. **Chat API**
   - Retrieve relevant context
   - Generate responses with citations
   - Ensure responses are grounded in indexed content

4. **"I Don't Know" Logic**
   - Detect when no relevant content exists
   - Avoid hallucinations

---

## 💡 Advanced Tips

### Adjusting Chunk Size

Edit `src/lib/chunking.ts`:
```typescript
const chunks = chunkText(text, {
  maxTokens: 300,  // Smaller chunks = more granular retrieval
  overlap: 30,     // Less overlap = fewer chunks
});
```

### Disabling AI Enhancement

Edit `src/app/api/admin/upload-pdf/route.ts`:
```typescript
const parsed = await parsePDF(buffer, file.name, false);  // Disable AI
```

### Changing Apify Settings

Edit `src/lib/apifyScraper.ts`:
```typescript
const run = await apifyClient.actor(actorId).call({
  maxCrawlDepth: 3,   // Deeper crawling
  maxCrawlPages: 100,  // More pages
});
```

---

## 🎯 Stage 7 Summary

✅ **Database Schema** - Comprehensive tables for documents and chunks  
✅ **Apify Integration** - Full web scraping with PDF extraction  
✅ **PDF Parsing** - AI-enhanced text extraction  
✅ **Content Chunking** - Intelligent text splitting  
✅ **Activity Feed** - Real-time status tracking  
✅ **Background Processing** - Non-blocking uploads  

**Stage 7 is complete!** Your admin panel now fully processes and indexes content. Stage 8 will make this content searchable and power the chatbot.

---

## 🐛 Known Limitations

1. **Processing is Sequential:** Large scraping jobs can take 5-10 minutes
2. **No Queue System:** Only one upload processes at a time per user
3. **Limited Error Recovery:** Failed jobs need manual retry
4. **No Progress Updates:** Status is binary (processing vs. completed)

These will be addressed in future enhancements!

---

**Ready to continue?** Say **"Begin Stage 8"** to implement the RAG retrieval system and power the chatbot! 🚀
