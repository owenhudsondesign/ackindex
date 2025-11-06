# Scheduled Scrapes - Granular Configuration Guide

## Overview

The scheduled scrapes feature now supports granular per-scrape configuration options, allowing you to customize scraping behavior, chunking parameters, and more for each individual URL.

## New Configuration Options

### Scraper Configuration

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `max_depth` | integer | 2 | 1-10 | Maximum depth for recursive crawling |
| `max_pages` | integer | 20 | 1-200 | Maximum number of pages to scrape |
| `extract_pdfs` | boolean | true | - | Whether to extract and process linked PDF files |
| `scrape_javascript` | boolean | false | - | Whether to execute JavaScript on pages (slower but more complete) |
| `wait_for_dynamic_content` | boolean | false | - | Whether to wait for dynamic content to load |
| `timeout_seconds` | integer | 30 | 10-120 | Timeout per page in seconds |

### Chunking Configuration

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `chunk_size` | integer | 500 | 100-2000 | Token size for text chunking |
| `chunk_overlap` | integer | 50 | 0-500 | Token overlap between chunks |

### Advanced Options (scrape_options)

The `scrape_options` field is a JSONB object that supports additional configuration:

```typescript
{
  cssSelectors?: string[];           // CSS selectors to target specific content
  excludePatterns?: string[];        // Patterns to exclude from scraping
  customHeaders?: Record<string, string>;  // Custom HTTP headers
  initialDelay?: number;             // Wait time before scraping (milliseconds)
  followRedirects?: boolean;         // Follow redirects
  maxRedirects?: number;             // Maximum redirects to follow
  userAgent?: string;                // User agent string
  proxy?: {                          // Proxy configuration
    server: string;
    username?: string;
    password?: string;
  };
}
```

## Database Schema

### New Columns in `scheduled_scrapes`

```sql
-- Scraper configuration
max_depth INTEGER DEFAULT 2 CHECK (max_depth >= 1 AND max_depth <= 10)
max_pages INTEGER DEFAULT 20 CHECK (max_pages >= 1 AND max_pages <= 200)
extract_pdfs BOOLEAN DEFAULT true
scrape_javascript BOOLEAN DEFAULT false
wait_for_dynamic_content BOOLEAN DEFAULT false
timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 10 AND timeout_seconds <= 120)

-- Chunking configuration
chunk_size INTEGER DEFAULT 500 CHECK (chunk_size >= 100 AND chunk_size <= 2000)
chunk_overlap INTEGER DEFAULT 50 CHECK (chunk_overlap >= 0 AND chunk_overlap <= 500)

-- Additional options
scrape_options JSONB DEFAULT '{}'::jsonb
```

## API Usage

### Create a Scheduled Scrape with Custom Configuration

**POST** `/api/admin/scheduled-scrapes`

```json
{
  "url": "https://example.com",
  "title": "Example Site",
  "scrape_frequency": "1 week",
  "priority": 5,
  "status": "active",

  // Scraper configuration
  "max_depth": 3,
  "max_pages": 50,
  "extract_pdfs": true,
  "scrape_javascript": true,
  "wait_for_dynamic_content": true,
  "timeout_seconds": 60,

  // Chunking configuration
  "chunk_size": 750,
  "chunk_overlap": 100,

  // Advanced options
  "scrape_options": {
    "cssSelectors": [".main-content", "article"],
    "excludePatterns": ["**/ads/**", "**/tracking/**"],
    "userAgent": "AckIndex/1.0"
  }
}
```

### Update Configuration for Existing Scrape

**PATCH** `/api/admin/scheduled-scrapes`

```json
{
  "id": "scrape-uuid",
  "max_depth": 5,
  "max_pages": 100,
  "scrape_javascript": true
}
```

### Batch Schedule with Shared Configuration

**POST** `/api/admin/batch-schedule`

```json
{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "frequency": "1 day",
  "priority": 7,
  "max_depth": 2,
  "max_pages": 30,
  "chunk_size": 600,
  "chunk_overlap": 75
}
```

## TypeScript Types

Import types from `@/lib/types/scheduledScrapes`:

```typescript
import {
  ScrapeConfig,
  ChunkConfig,
  ScrapeOptions,
  ScheduledScrape,
  CreateScheduledScrapeInput,
  UpdateScheduledScrapeInput,
  DEFAULT_SCRAPE_CONFIG,
  DEFAULT_CHUNK_CONFIG,
  SCRAPE_CONFIG_CONSTRAINTS,
  isValidScrapeConfig,
  isValidChunkConfig,
  mergeWithDefaults,
} from '@/lib/types/scheduledScrapes';
```

## Use Cases

### 1. Shallow, Fast Scraping
For news sites or frequently updated content:
```json
{
  "max_depth": 1,
  "max_pages": 10,
  "extract_pdfs": false,
  "scrape_javascript": false,
  "timeout_seconds": 15
}
```

### 2. Deep Documentation Scraping
For comprehensive documentation sites:
```json
{
  "max_depth": 5,
  "max_pages": 200,
  "extract_pdfs": true,
  "scrape_javascript": true,
  "wait_for_dynamic_content": true,
  "timeout_seconds": 90
}
```

### 3. Large Chunk Sizes for Long-Form Content
For articles and blogs:
```json
{
  "chunk_size": 1500,
  "chunk_overlap": 200
}
```

### 4. Small Chunks for Dense Technical Content
For API references and code documentation:
```json
{
  "chunk_size": 300,
  "chunk_overlap": 30
}
```

### 5. JavaScript-Heavy Single Page Applications
For modern web apps:
```json
{
  "max_depth": 1,
  "max_pages": 20,
  "scrape_javascript": true,
  "wait_for_dynamic_content": true,
  "timeout_seconds": 60,
  "scrape_options": {
    "initialDelay": 3000,
    "cssSelectors": ["#root", ".app-content"]
  }
}
```

## Migration Guide

To apply the new schema to your database:

```bash
# Run the migration
psql $DATABASE_URL -f supabase/migrations/20251106_add_scrape_config.sql
```

Or via Supabase CLI:

```bash
supabase db push
```

## Implementation Notes

1. **Backward Compatibility**: All new columns have default values, so existing scheduled scrapes will continue to work with default configuration.

2. **Per-Scrape Configuration**: Each URL can now have its own configuration, allowing fine-tuned control for different content types.

3. **Database-Level Validation**: CHECK constraints ensure configuration values stay within valid ranges.

4. **Type Safety**: TypeScript types provide compile-time validation and IDE autocomplete.

5. **Extensibility**: The `scrape_options` JSONB field allows for future extension without schema changes.

## Performance Considerations

- **max_depth**: Higher values (>3) can exponentially increase scraping time and resource usage
- **max_pages**: Limit to reasonable values based on site size and update frequency
- **scrape_javascript**: Significantly slower (3-5x) due to browser rendering
- **wait_for_dynamic_content**: Adds delay but ensures complete content capture
- **chunk_size**: Larger chunks = fewer embeddings = lower cost, but may reduce search precision

## Best Practices

1. **Start Conservative**: Begin with default values and adjust based on results
2. **Monitor Costs**: Larger `max_pages` and `chunk_size` values affect OpenAI API costs
3. **Test First**: Use manual trigger to test configuration before scheduling
4. **Match Content Type**: Adjust `chunk_size` based on content density
5. **Use JavaScript Sparingly**: Only enable `scrape_javascript` when necessary

## Related Files

- **Migration**: `/supabase/migrations/20251106_add_scrape_config.sql`
- **Types**: `/src/lib/types/scheduledScrapes.ts`
- **API Routes**:
  - `/src/app/api/admin/scheduled-scrapes/route.ts`
  - `/src/app/api/admin/batch-schedule/route.ts`
- **Scraping Logic**: `/src/lib/scheduledScraping.ts`

## Validation

All parameters are validated at multiple levels:

1. **Database Level**: CHECK constraints prevent invalid values
2. **API Level**: Request validation returns 400 errors for invalid input
3. **TypeScript Level**: Type guards ensure type safety

```typescript
// Example validation
if (max_depth < 1 || max_depth > 10) {
  return NextResponse.json(
    { error: 'max_depth must be between 1 and 10' },
    { status: 400 }
  );
}
```

## Future Enhancements

Potential additions to `scrape_options`:

- Rate limiting per domain
- Custom retry strategies
- Webhook notifications on completion
- Content transformation rules
- Language-specific processing
- Image extraction configuration
