-- Enable Supabase Realtime for newsletter_triggers table
-- This allows Dreamlit to detect new inserts via realtime subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_triggers;
