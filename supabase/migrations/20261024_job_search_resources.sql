-- Job search toolkit: additive only. Existing accounts/applications are unchanged.
-- Run this entire file in your Supabase project's SQL Editor.
BEGIN;
CREATE TABLE IF NOT EXISTS public.job_search_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('keyword', 'platform', 'note')),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  content TEXT NOT NULL DEFAULT '',
  url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_search_resources_url_check CHECK (
    (url IS NULL OR url ~* '^https?://[^[:space:]]+$')
    AND (kind <> 'platform' OR url IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS job_search_resources_user_idx ON public.job_search_resources(user_id);
ALTER TABLE public.job_search_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_records ON public.job_search_resources;
CREATE POLICY own_records ON public.job_search_resources
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_search_resources TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
