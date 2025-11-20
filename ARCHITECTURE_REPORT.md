# AckIndex Architecture Report

## 1. Executive Summary

AckIndex is a sophisticated RAG (Retrieval Augmented Generation) application designed for indexing and querying Nantucket civic data. The application is built on a robust modern stack featuring Next.js 14 (App Router), Supabase, and a dedicated worker architecture for background processing.

**Key Finding**: The implementation is significantly ahead of the documentation (`ARCHITECTURE.md`). Features listed as "Future Enhancements" such as Job Queues (BullMQ) and Caching (Redis) are already implemented and active in the codebase.

## 2. Architecture Overview

### Core Stack
- **Frontend/API**: Next.js 14+ with App Router and TailwindCSS.
- **Database**: Supabase (PostgreSQL) with `pgvector` for vector similarity search.
- **Queue System**: BullMQ backed by Redis (ioredis).
- **AI/ML**: OpenAI (Embeddings/LLM), Gladia (Audio Transcription), AssemblyAI (Backup Transcription).
- **Scraping**: Apify (Web Scraping), YouTube.js (Video Metadata).

### System Components

1.  **Web Application (`src/app`)**:
    -   Handles UI, authentication (Supabase Auth), and API routes.
    -   API routes primarily act as dispatchers, pushing heavy tasks to the Redis queue rather than processing them synchronously.

2.  **Worker Service (`worker.ts`)**:
    -   A standalone Node.js process that consumes jobs from BullMQ.
    -   **Queues**:
        -   `scraping`: Handles URL scraping and YouTube video processing.
        -   `embedding`: Batches and generates vector embeddings.
        -   `pdf-processing`: Handles PDF parsing and chunking.
    -   **Reliability**: Includes Sentry integration for error tracking and graceful shutdown logic.

3.  **Data Pipeline (`src/lib`)**:
    -   **Ingestion**: URLs -> Apify / YouTube -> Raw Text/Transcripts.
    -   **Processing**: Text is chunked (custom logic in `chunking.ts`) -> Embeddings generated (OpenAI) -> Stored in Supabase.
    -   **Retrieval**: Hybrid search strategy (Semantic + Keyword) implemented in `retrieval.ts`.

## 3. Discrepancies: Documentation vs. Implementation

The `ARCHITECTURE.md` file is outdated. Below are the critical differences:

| Feature | Documentation (`ARCHITECTURE.md`) | Actual Implementation (Code) |
| :--- | :--- | :--- |
| **Job Queue** | Listed as "Future: Bull/BullMQ" | **Implemented**. `worker.ts` and `src/lib/queues.ts` use BullMQ. |
| **Caching** | Listed as "Future: Redis/Vercel KV" | **Implemented**. `src/lib/cache.ts` uses Redis. |
| **Scraping** | "Async fire-and-forget" | **Managed Queue**. Uses BullMQ for retries and concurrency control. |
| **Transcription** | Not explicitly detailed | **Implemented**. Uses Gladia and AssemblyAI (`src/lib/gladiaTranscriber.ts`). |

## 4. Detailed Component Analysis

### 4.1 Retrieval Logic (`src/lib/retrieval.ts`)
The retrieval system is advanced, implementing:
-   **Hybrid Search**: Combines vector similarity with keyword search.
-   **Boosting**: Applies "Recency Boost" and "Chunk Type Boost" (prioritizing summaries).
-   **Deduplication**: Removes semantically identical results.
-   **Context Windowing**: Smartly assembles context for the LLM.

### 4.2 Worker Architecture (`worker.ts`)
-   The worker is designed to be deployed separately (e.g., on Railway or a long-running server).
-   It explicitly handles connection management for Redis and Sentry.
-   Concurrency is tuned: 5 concurrent scrapers, 2 concurrent embedders.

## 5. Recommendations

### Immediate Actions
1.  **Update Documentation**: Rewrite `ARCHITECTURE.md` to reflect the current state (BullMQ, Redis, Workers). The current doc is misleading for new contributors.
2.  **Environment Variable Audit**: Ensure all new services (Redis, Gladia, Sentry) are properly documented in `.env.example`.
3.  **Worker Deployment**: Verify that the `worker.ts` process is actually deployed and running in the production environment. Since it's separate from the Next.js build, it requires a dedicated service (e.g., a Railway worker service).

### Code Improvements
1.  **Type Safety**: `worker.ts` uses some `any` casts in Sentry configuration. Tighten these types.
2.  **Error Handling**: The worker has a global error handler, but individual job processors could benefit from more granular error reporting to the UI (updating the `documents` table status with specific error messages).
3.  **Testing**: The `tests` directory seems sparse compared to the complexity of the logic in `src/lib`. Add unit tests for `retrieval.ts` and `chunking.ts`.

### Architecture Evolution
1.  **Monorepo Consideration**: As the worker grows, consider moving it to a separate package within a monorepo structure (Turborepo) to share types between the Next.js app and the Worker without importing frontend code into the worker.
2.  **Rate Limiting**: Ensure the Redis instance used for queues is also utilized for API rate limiting, as hinted in the code.

## 6. Conclusion
AckIndex is a well-architected application that has successfully transitioned from a simple prototype to a robust, queue-based system. The primary debt is documentation, not code. The foundation is solid for scaling.
