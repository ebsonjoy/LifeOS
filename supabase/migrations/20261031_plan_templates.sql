-- Reusable tasks are separate from daily plans and their recorded history.
BEGIN;
CREATE TABLE IF NOT EXISTS public.plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  category TEXT NOT NULL DEFAULT 'personal' CHECK (category IN ('personal','work','learning','english','fitness','career','schedule')),
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 1 AND 1440),
  default_start TEXT NOT NULL DEFAULT '' CHECK (default_start = '' OR default_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_records ON public.plan_templates;
CREATE POLICY own_records ON public.plan_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_templates TO authenticated;
CREATE INDEX IF NOT EXISTS plan_templates_user_idx ON public.plan_templates(user_id);
NOTIFY pgrst, 'reload schema';
COMMIT;
