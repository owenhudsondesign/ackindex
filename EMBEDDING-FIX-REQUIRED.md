# Embedding Storage Fix Required

## Problem Identified

The chatbot was returning "I don't have enough information" for queries like "tell me about town meeting" despite having relevant content in the database. After extensive debugging, I discovered the root cause:

**Embeddings are stored as JSON strings instead of PostgreSQL `vector(1536)` type.**

### Evidence

1. **Manual similarity calculation**: 0.8401 (well above 0.7 threshold)
2. **RPC function results**: 0 results (even with 0.1 threshold)
3. **Storage format**: Embeddings stored as strings like `"[-0.023,0.019,...]"` instead of proper vector type

The pgvector extension requires embeddings to be stored as the `vector(1536)` PostgreSQL type for the cosine distance operator (`<=>`) to work correctly. When stored as text/JSON, the RPC function cannot perform vector similarity comparisons.

## Code Changes Made

I've updated the following files to fix the storage format going forward:

1. **`src/lib/database.ts`**: Changed `updateChunkEmbedding()` to store embeddings as arrays instead of strings
2. **`src/lib/retrieval.ts`**: Updated `semanticSearch()` and `hybridSearch()` to pass embeddings as arrays to RPC functions

These changes ensure new embeddings will be stored correctly.

## Database Migration Required

To fix existing embeddings, you need to run the SQL migration in `fix-embedding-types.sql`. This migration:

1. Creates a temporary column with the correct `vector(1536)` type
2. Converts existing string embeddings to proper vector type using PostgreSQL casting
3. Replaces the old column with the new one
4. Recreates the index for optimal performance

### How to Apply the Migration

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open the file `fix-embedding-types.sql` from this repository
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### After Migration

Once the migration is complete:

1. The existing 2 embeddings will be converted to proper vector type
2. The `search_similar_chunks` RPC function will start returning results
3. Queries like "tell me about town meeting" will correctly retrieve relevant chunks
4. The chatbot will be able to answer questions based on the scraped content

## Testing

After applying the migration, you can test by:

1. Going to https://www.ackindex.com
2. Asking "tell me about town meeting"
3. The chatbot should now return relevant information from the Town Meeting guide

## Duplicate Chunks

I also noticed there are 2 chunks with identical content and embeddings in the database. This is causing duplicate sources to appear in the chat responses. The deduplication logic I added to the chat API will handle this for now, but you may want to investigate why duplicates are being created during the scraping process.

## Summary

- **Root cause**: Embeddings stored as strings instead of vector type
- **Fix**: SQL migration to convert existing embeddings + code changes for future embeddings
- **Action required**: Run `fix-embedding-types.sql` in Supabase SQL Editor
- **Expected result**: Chatbot will start answering questions correctly

## Files Modified

- `src/lib/database.ts` - Fixed embedding storage format
- `src/lib/retrieval.ts` - Fixed embedding query format
- `fix-embedding-types.sql` - Database migration to fix existing embeddings

## Commit

The code changes have been committed locally. You'll need to push them to GitHub after authenticating:

```bash
git push origin main
```

Then apply the SQL migration in Supabase, and the chatbot should work correctly!

