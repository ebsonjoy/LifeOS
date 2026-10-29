-- Additive tracking update. Existing dates, counts, and completed flags are kept.
BEGIN;
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activity_key TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  kind TEXT NOT NULL CHECK (kind IN ('section','time')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','completed','incomplete')),
  planned_minutes INTEGER CHECK (planned_minutes BETWEEN 0 AND 1440),
  actual_minutes INTEGER CHECK (actual_minutes BETWEEN 0 AND 1440),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, activity_key)
);
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_records ON public.daily_activity;
CREATE POLICY own_records ON public.daily_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
CREATE INDEX IF NOT EXISTS daily_activity_user_idx ON public.daily_activity(user_id);
ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('planned','completed','incomplete'));
ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS actual_minutes INTEGER CHECK (actual_minutes BETWEEN 0 AND 1440);
ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS source_plan_id UUID REFERENCES public.daily_plans(id) ON DELETE SET NULL;
ALTER TABLE public.daily_plans ADD COLUMN IF NOT EXISTS ends_next_day BOOLEAN NOT NULL DEFAULT false;
-- Copies retain their source and cannot be duplicated for the same destination date.
CREATE UNIQUE INDEX IF NOT EXISTS daily_plans_source_date_unique ON public.daily_plans(user_id,date,source_plan_id);
ALTER TABLE public.habit_logs ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('planned','completed','incomplete'));
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_status_check;
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_status_check CHECK (status IN ('planned','followed','changed','incomplete'));
NOTIFY pgrst, 'reload schema';
COMMIT;
