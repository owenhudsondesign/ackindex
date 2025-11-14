# Data Quality Test Cases

## Document Ingestion
1. **PDF Processing**
   - ✅ PDFs parse correctly (no garbled text)
   - ✅ Multi-page PDFs handled
   - ✅ Tables/images don't corrupt text
   - ✅ Metadata extracted (title, pages, author)

2. **Meeting Transcript Processing**
   - ✅ Timestamps preserved ([12:34] format)
   - ✅ Speaker names captured
   - ✅ Chunk boundaries don't split mid-sentence
   - ✅ Overlap prevents context loss (50 token overlap)

3. **Chunking Quality**
   - ✅ Chunks ~500 tokens (not too small/large)
   - ✅ Important context kept together
   - ✅ Summary chunks tagged as 'chunk_type: summary'
   - ✅ Transcript chunks tagged as 'chunk_type: transcript'

## Embedding Quality
1. **Semantic Accuracy**
   - ✅ Similar content has high similarity (>0.90)
   - ✅ Unrelated content has low similarity (<0.50)
   - ✅ Embeddings dimension = 1536 (ada-002)

2. **Database Integrity**
   - ✅ All chunks have embeddings (no NULL vectors)
   - ✅ Document count matches expected uploads
   - ✅ No orphaned chunks (document_id references valid doc)

## Citation Accuracy
1. **Source Attribution**
   - ✅ Citations link to correct document
   - ✅ Snippet matches actual content
   - ✅ No hallucinated sources (Source 4 when only 3 exist)

2. **Timestamp Accuracy**
   - ✅ If response includes timestamp, it exists in transcript
   - ✅ Quote matches what's at that timestamp
   - ✅ Format consistent: "[12:34]" or "[1:23:45]"

## Database Checks
```sql
-- Run these queries in Supabase SQL Editor

-- 1. Check for chunks without embeddings
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NULL;
-- Expected: 0

-- 2. Check for orphaned chunks
SELECT COUNT(*) FROM document_chunks dc
LEFT JOIN documents d ON dc.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0

-- 3. Verify chunk type distribution
SELECT metadata->>'chunk_type' as chunk_type, COUNT(*)
FROM document_chunks
GROUP BY chunk_type;
-- Should see 'summary', 'transcript', or NULL

-- 4. Check document status
SELECT status, COUNT(*) FROM documents GROUP BY status;
-- Should mostly be 'completed', few 'processing' or 'failed'

-- 5. Find documents with no chunks
SELECT d.id, d.title FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE dc.id IS NULL AND d.status = 'completed';
-- Expected: 0 (completed docs should have chunks)
```

## Content Validation
1. **Sample Queries**
   - Pick 10 random documents
   - For each, ask a specific question about content
   - Verify answer is factually correct

2. **Known Facts Test**
   ```markdown
   Query: "When was the Select Board meeting on November 5, 2025?"
   Expected: Should find that exact meeting

   Query: "What did the Community Preservation Committee discuss on 10/29/2025?"
   Expected: Should mention preservation projects, Sankaty Head Light, etc.
   ```

## Data Freshness
1. **Recent Documents**
   - ✅ Latest meeting uploaded within 48 hours of occurrence
   - ✅ Document metadata shows correct date
   - ✅ Recency boost working (newer docs score higher)

2. **Scheduled Scraping** (if automated)
   - ✅ Scraper runs on schedule
   - ✅ New transcripts detected and ingested
   - ✅ Duplicate detection prevents re-ingesting

## Testing Process
```bash
# 1. Upload test document
# Go to /admin → upload a known PDF

# 2. Wait for processing
# Check /admin activity feed

# 3. Query for specific content
# Ask question you know answer to

# 4. Verify citation
# Click "View source" → should see exact content
```
