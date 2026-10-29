-- Add habit direction and target periods. Existing habits/logs are preserved.
-- Run the entire file in the Supabase SQL Editor.
BEGIN;
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS habit_type TEXT NOT NULL DEFAULT 'good'
    CHECK (habit_type IN ('good', 'bad'));
-- NULL keeps the existing daily/weekly frequency for older habits.
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS period_days INTEGER
    CHECK (period_days IN (1, 2, 3, 7));
CREATE UNIQUE INDEX IF NOT EXISTS lifeos_habit_date_unique
  ON public.habit_logs(user_id, habit_id, date);
NOTIFY pgrst, 'reload schema';
COMMIT;
