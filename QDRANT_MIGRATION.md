# Migrate Vectors to Qdrant Cloud

## 💰 **Cost Savings: Supabase Team → Supabase Pro + Qdrant**

| Setup | Monthly Cost | Savings |
|-------|-------------|---------|
| **Supabase Team** | $599 | - |
| **Supabase Pro + Qdrant Free** | $25 + $0 = **$25** | **$574/month** 🎉 |
| **Supabase Pro + Qdrant Paid** | $25 + $25 = **$50** | **$549/month** |

**Annual Savings**: $6,588 - $6,888/year

---

## 🎯 **New Architecture**

```
┌────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐          ┌──────────────────┐  │
│  │  Supabase Pro    │          │  Qdrant Cloud    │  │
│  │  ($25/month)     │          │  ($0-25/month)   │  │
│  ├──────────────────┤          ├──────────────────┤  │
│  │                  │          │                  │  │
│  │ • Users          │          │ • Vectors        │  │
│  │ • Videos         │          │ • Embeddings     │  │
│  │ • Documents      │          │ • 1536-dim       │  │
│  │ • Chunks (meta)  │          │ • 155K points    │  │
│  │ • Chunk text     │          │                  │  │
│  │                  │          │                  │  │
│  └──────────────────┘          └──────────────────┘  │
│           ↑                              ↑            │
│           │                              │            │
│           └──────── Both queried ────────┘            │
│                   during search                       │
└────────────────────────────────────────────────────────┘
```

---

## 📋 **Step-by-Step Implementation**

### **Step 1: Create Qdrant Cloud Account** (5 min)

1. Go to https://cloud.qdrant.io
2. Sign up (free tier = 1 GB, perfect for 155K vectors)
3. Create a cluster:
   - **Name**: `ackindex-vectors`
   - **Region**: Same as your app (US-East, US-West, EU)
   - **Tier**: Free (1 GB) or Starter ($25 for 2 GB)
4. Copy credentials:
   - **URL**: `https://xxx-xxx.aws.qdrant.io:6333`
   - **API Key**: `xxxxxx...`

---

### **Step 2: Install Qdrant Client** (2 min)

```bash
npm install @qdrant/js-client-rest
```

Add to `.env.local`:
```bash
QDRANT_URL=https://xxx-xxx.aws.qdrant.io:6333
QDRANT_API_KEY=your-api-key-here
```

---

### **Step 3: Create Qdrant Service** (15 min)

**File**: `/src/lib/qdrant.ts`

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import logger from './logger';

const COLLECTION_NAME = 'document_chunks';

class QdrantService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || '',
      apiKey: process.env.QDRANT_API_KEY || '',
    });
  }

  /**
   * Initialize collection (run once on setup)
   */
  async createCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        c => c.name === COLLECTION_NAME
      );

      if (exists) {
        logger.info('Qdrant collection already exists');
        return;
      }

      // Create collection
      await this.client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // OpenAI ada-002 dimension
          distance: 'Cosine', // Same as pgvector
        },
        optimizers_config: {
          indexing_threshold: 10000, // Start indexing after 10K points
        },
      });

      logger.info('Qdrant collection created');
    } catch (error) {
      logger.error({ error }, 'Failed to create Qdrant collection');
      throw error;
    }
  }

  /**
   * Upsert embeddings (insert or update)
   */
  async upsertEmbeddings(chunks: Array<{
    id: string;
    embedding: number[];
    metadata: {
      document_id: string;
      chunk_index: number;
      content: string;
      start_time?: number;
      end_time?: number;
    };
  }>) {
    try {
      const points = chunks.map(chunk => ({
        id: chunk.id,
        vector: chunk.embedding,
        payload: chunk.metadata,
      }));

      await this.client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });

      logger.info({ count: chunks.length }, 'Upserted embeddings to Qdrant');
    } catch (error) {
      logger.error({ error }, 'Failed to upsert embeddings');
      throw error;
    }
  }

  /**
   * Search similar vectors
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      filter?: any;
    } = {}
  ) {
    try {
      const results = await this.client.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        limit: options.limit || 10,
        score_threshold: options.threshold || 0.78,
        filter: options.filter,
        with_payload: true,
      });

      return results.map(result => ({
        id: result.id as string,
        similarity: result.score,
        content: result.payload?.content as string,
        metadata: result.payload,
      }));
    } catch (error) {
      logger.error({ error }, 'Qdrant search failed');
      throw error;
    }
  }

  /**
   * Delete embeddings by document ID
   */
  async deleteByDocument(documentId: string) {
    try {
      await this.client.delete(COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: 'document_id',
              match: { value: documentId },
            },
          ],
        },
      });

      logger.info({ documentId }, 'Deleted embeddings from Qdrant');
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to delete embeddings');
      throw error;
    }
  }

  /**
   * Get collection stats
   */
  async getStats() {
    try {
      const info = await this.client.getCollection(COLLECTION_NAME);
      return {
        pointsCount: info.points_count,
        segmentsCount: info.segments_count,
        indexedVectorsCount: info.indexed_vectors_count,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get Qdrant stats');
      return null;
    }
  }
}

export const qdrant = new QdrantService();
```

---

### **Step 4: Update Database Schema** (5 min)

**File**: `/supabase/migrations/20251124_remove_embeddings.sql`

```sql
-- Keep document_chunks but remove embedding column
ALTER TABLE document_chunks
  DROP COLUMN IF EXISTS embedding;

-- Add qdrant_id for reference
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS qdrant_id TEXT;

-- Keep all other columns (content, metadata, timestamps)
-- This reduces DB size by ~70%!

-- Update search function to use Qdrant instead
DROP FUNCTION IF EXISTS search_similar_chunks;

-- No longer needed - search happens via Qdrant API
```

---

### **Step 5: Update Embedding Generation** (10 min)

**File**: `/src/lib/embeddings.ts`

Update `generateEmbeddingsBatch`:

```typescript
import { qdrant } from './qdrant';

export async function generateEmbeddingsBatch(chunks: Array<{
  id: string;
  content: string;
  document_id: string;
  chunk_index: number;
  metadata?: any;
}>) {
  // Generate embeddings (same as before)
  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: chunks.map(c => c.content),
  });

  // OLD: Store in Supabase
  // for (let i = 0; i < chunks.length; i++) {
  //   await supabase
  //     .from('document_chunks')
  //     .update({ embedding: embeddings.data[i].embedding })
  //     .eq('id', chunks[i].id);
  // }

  // NEW: Store in Qdrant
  await qdrant.upsertEmbeddings(
    chunks.map((chunk, i) => ({
      id: chunk.id,
      embedding: embeddings.data[i].embedding,
      metadata: {
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        ...chunk.metadata,
      },
    }))
  );

  // Update Supabase with Qdrant reference
  for (const chunk of chunks) {
    await supabase
      .from('document_chunks')
      .update({ qdrant_id: chunk.id })
      .eq('id', chunk.id);
  }

  logger.info({ count: chunks.length }, 'Embeddings stored in Qdrant');
}
```

---

### **Step 6: Update Search Function** (15 min)

**File**: `/src/lib/retrieval.ts`

Replace `retrieveRelevantChunks`:

```typescript
import { qdrant } from './qdrant';

export async function retrieveRelevantChunks(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    organizationId?: string;
  } = {}
) {
  // Generate query embedding (same as before)
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryVector = embedding.data[0].embedding;

  // NEW: Search Qdrant instead of Supabase
  const results = await qdrant.searchSimilar(queryVector, {
    limit: options.limit || 10,
    threshold: options.threshold || 0.78,
    filter: options.organizationId ? {
      must: [
        {
          key: 'organization_id',
          match: { value: options.organizationId },
        },
      ],
    } : undefined,
  });

  // Fetch full metadata from Supabase if needed
  const chunkIds = results.map(r => r.id);
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select(`
      id,
      content,
      metadata,
      document_id,
      documents (
        id,
        title,
        source_url,
        meeting_videos (
          meeting_title,
          meeting_date,
          public_url
        )
      )
    `)
    .in('id', chunkIds);

  // Merge Qdrant results with Supabase metadata
  return results.map(result => {
    const chunk = chunks?.find(c => c.id === result.id);
    return {
      ...result,
      ...chunk,
    };
  });
}
```

---

### **Step 7: Migrate Existing Embeddings** (1-2 hours)

**File**: `/scripts/migrate-to-qdrant.ts`

```typescript
import { supabase } from '../src/lib/supabase';
import { qdrant } from '../src/lib/qdrant';

async function migrateEmbeddings() {
  console.log('🚀 Migrating embeddings to Qdrant...');

  // Create collection
  await qdrant.createCollection();

  // Get all chunks with embeddings
  let offset = 0;
  const batchSize = 1000;
  let totalMigrated = 0;

  while (true) {
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('id, embedding, content, document_id, chunk_index, metadata')
      .not('embedding', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error || !chunks || chunks.length === 0) break;

    console.log(`Migrating batch ${offset}-${offset + chunks.length}...`);

    // Convert pgvector string format to array if needed
    const qdrantChunks = chunks.map(chunk => ({
      id: chunk.id,
      embedding: Array.isArray(chunk.embedding)
        ? chunk.embedding
        : JSON.parse(chunk.embedding as string),
      metadata: {
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        ...chunk.metadata,
      },
    }));

    // Upload to Qdrant
    await qdrant.upsertEmbeddings(qdrantChunks);

    // Update Supabase with Qdrant reference
    for (const chunk of chunks) {
      await supabase
        .from('document_chunks')
        .update({ qdrant_id: chunk.id })
        .eq('id', chunk.id);
    }

    totalMigrated += chunks.length;
    offset += batchSize;

    console.log(`✅ Migrated ${totalMigrated} embeddings so far`);
  }

  console.log(`🎉 Migration complete! Total: ${totalMigrated} embeddings`);

  // Verify
  const stats = await qdrant.getStats();
  console.log('Qdrant stats:', stats);
}

migrateEmbeddings().catch(console.error);
```

**Run migration**:
```bash
npx tsx scripts/migrate-to-qdrant.ts
```

---

### **Step 8: Remove Embeddings from Supabase** (5 min)

**After migration is successful and tested**:

```sql
-- This will reduce your DB size by ~70%!
ALTER TABLE document_chunks DROP COLUMN embedding;

-- Check new size
SELECT pg_size_pretty(pg_database_size('postgres'));
-- Should be ~3-4 GB now (fits in Pro!)
```

---

## 📊 **Before/After Comparison**

### **Database Size**

| Component | Before (Supabase Team) | After (Supabase Pro + Qdrant) |
|-----------|------------------------|-------------------------------|
| Chunk metadata | 500 MB | 500 MB |
| **Embeddings** | **7 GB** | **0 GB (moved to Qdrant)** |
| Indexes | 1 GB | 300 MB |
| Other tables | 500 MB | 500 MB |
| **Total Supabase** | **9 GB** | **1.3 GB** ✅ |
| **Qdrant** | - | **1 GB** |

### **Monthly Costs**

| Service | Before | After | Savings |
|---------|--------|-------|---------|
| Supabase | $599 (Team) | $25 (Pro) | **-$574** |
| Qdrant | - | $0-25 (Free/Starter) | - |
| **Total** | **$599** | **$25-50** | **$549-574/month** |

**Annual Savings**: $6,588 - $6,888/year 🎉

---

## ⚡ **Performance Comparison**

| Metric | Supabase pgvector | Qdrant |
|--------|-------------------|--------|
| Search Speed | 30-80ms | **15-40ms** ✅ |
| Scalability | 1M vectors max | 100M+ vectors |
| Filtering | Basic | Advanced (nested, geo, etc.) |
| Updates | Slow (needs reindex) | Fast (optimized) |

**Qdrant is actually FASTER than pgvector!**

---

## ✅ **Testing Checklist**

After migration:

- [ ] Qdrant collection created
- [ ] All embeddings migrated (check stats)
- [ ] Search returns correct results
- [ ] Search speed improved
- [ ] Supabase DB size reduced to <4 GB
- [ ] Downgrade to Supabase Pro ($25)
- [ ] Monitor for 7 days
- [ ] Drop embedding column from Supabase

---

## 🎯 **Final Costs with Qdrant**

### **7,000 Hours, Monthly Ongoing**

| Service | Cost |
|---------|------|
| **Video Storage (Bunny)** | $87.50 |
| **Video Bandwidth** | $5.00 |
| **Supabase Pro** | $25.00 |
| **Qdrant Free** | $0.00 |
| **OpenAI Chat** | $3.50 |
| **Vercel** | $20.00 |
| **TOTAL** | **$141/month** 🎉 |

**vs Original**: $715 (with Team) → $141 (with Qdrant) = **$574/month saved!**

**Annual Savings**: $6,888/year

---

## 💡 **When to Upgrade Qdrant**

**Free Tier (1 GB)**:
- Good for: 155K vectors (your 7K hours)
- Max: ~200K vectors

**Starter ($25/month, 2 GB)**:
- Good for: 400K vectors
- Upgrade when: You exceed 10,000 hours

**Business ($99/month, 8 GB)**:
- Good for: 1.6M vectors
- Upgrade when: You have 40,000+ hours (unlikely!)

---

## 🚀 **Recommendation**

**Use Qdrant!** It's:
- ✅ **10x cheaper** than Supabase Team
- ✅ **Faster** vector search
- ✅ **More scalable** (100M+ vectors)
- ✅ **Purpose-built** for embeddings
- ✅ **Easy migration** (1-2 hours)

**Total Monthly Cost**:
- With Supabase Team: $715/month
- With Qdrant: **$141/month**
- **Savings: $574/month** ($6,888/year)

**Implementation Time**: 2-3 hours total
