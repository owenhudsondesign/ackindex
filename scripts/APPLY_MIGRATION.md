# Apply Database Migration

The `scheduled_scrapes` and `content_hashes` tables need to be created in your Supabase database.

## Quick Steps

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/hgcevucxmpapdkwjuzka/sql/new
2. Copy the entire contents of `supabase/migrations/20251030_scheduled_scrapes.sql`
3. Paste into the SQL Editor
4. Click "Run" to execute

## What This Creates

- **scheduled_scrapes** table - Manages URLs to scrape on a schedule
- **content_hashes** table - Deduplication to avoid re-processing unchanged content
- **Functions**:
  - `update_next_scrape_time()` - Auto-calculates next scrape time
  - `get_urls_for_scraping()` - Batch query for cron job
- **RLS Policies** - Row-level security for multi-tenant access

## Verification

After applying, verify the tables exist:

```sql
SELECT * FROM scheduled_scrapes LIMIT 1;
SELECT * FROM content_hashes LIMIT 1;
```

Both queries should return successfully (even if empty).
