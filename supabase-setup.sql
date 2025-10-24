-- AckIndex Supabase Database Setup
-- Run this script in the Supabase SQL Editor

-- 1. Create entries table
create table if not exists public.entries (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  source text not null,
  category text not null check (category in ('Budget', 'Real Estate', 'Town Meeting', 'Infrastructure', 'General')),
  summary text not null,
  key_metrics jsonb default '[]'::jsonb,
  visualizations jsonb default '[]'::jsonb,
  insights jsonb default '[]'::jsonb,
  comparisons jsonb default '[]'::jsonb,
  notable_updates jsonb default '[]'::jsonb,
  date_published date,
  document_excerpt text,
  file_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.entries
  for each row
  execute function public.handle_updated_at();

-- 3. Create storage bucket for PDFs
insert into storage.buckets (id, name, public)
values ('civic-documents', 'civic-documents', false)
on conflict (id) do nothing;

-- 4. Enable Row Level Security
alter table public.entries enable row level security;

-- 5. Create RLS Policies for entries table

-- Allow public read access to all entries
create policy "Public read access to entries"
  on public.entries for select
  using (true);

-- Allow authenticated users to insert entries
create policy "Authenticated users can insert entries"
  on public.entries for insert
  with check (auth.role() = 'authenticated');

-- Allow authenticated users to update their own entries
create policy "Authenticated users can update entries"
  on public.entries for update
  using (auth.role() = 'authenticated');

-- Allow authenticated users to delete entries
create policy "Authenticated users can delete entries"
  on public.entries for delete
  using (auth.role() = 'authenticated');

-- 6. Create storage policies

-- Allow public to read documents (optional - set to false for private)
create policy "Public can view documents"
  on storage.objects for select
  using (bucket_id = 'civic-documents');

-- Allow authenticated users to upload documents
create policy "Authenticated users can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'civic-documents' 
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to update documents
create policy "Authenticated users can update documents"
  on storage.objects for update
  using (
    bucket_id = 'civic-documents' 
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete documents
create policy "Authenticated users can delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'civic-documents' 
    and auth.role() = 'authenticated'
  );

-- 7. Create indexes for better performance
create index if not exists idx_entries_category on public.entries(category);
create index if not exists idx_entries_created_at on public.entries(created_at desc);
create index if not exists idx_entries_date_published on public.entries(date_published desc);

-- 8. Create a view for statistics (optional)
create or replace view public.entry_stats as
select 
  category,
  count(*) as total_entries,
  max(created_at) as latest_update
from public.entries
group by category;

-- Grant access to the view
grant select on public.entry_stats to anon, authenticated;

-- Done! Your database is ready for AckIndex.
