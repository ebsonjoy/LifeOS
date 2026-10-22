-- LifeOS: the 10 tables used by Today, English, Gym & Food, and Jobs.
-- Runnable on a new Supabase project or over the previous LifeOS schema.
-- This file does not delete tables. For the requested empty-table cleanup,
-- run migrations/20261021_focus_cleanup.sql instead (it includes this setup).
BEGIN;
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, avatar_url TEXT, timezone TEXT DEFAULT 'Asia/Kolkata',
  transformation_start_date DATE DEFAULT CURRENT_DATE,
  transformation_target_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 years')::DATE,
  onboarding_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, category TEXT NOT NULL DEFAULT 'personal',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  target_value NUMERIC DEFAULT 1, unit TEXT DEFAULT 'check', color TEXT DEFAULT '#3e6b50', is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE, date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false, value NUMERIC DEFAULT 1, note TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, mood INTEGER CHECK (mood BETWEEN 1 AND 5), daily_score INTEGER CHECK (daily_score BETWEEN 0 AND 100),
  screen_time_minutes INTEGER CHECK (screen_time_minutes >= 0), journal TEXT, journal_corrected TEXT,
  accomplishments TEXT, went_wrong TEXT, improve_tomorrow TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'personal',
  start_time TEXT NOT NULL DEFAULT '', end_time TEXT NOT NULL DEFAULT '', completed BOOLEAN NOT NULL DEFAULT false, summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fitness_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, workout_completed BOOLEAN NOT NULL DEFAULT false, workout_type TEXT,
  duration_minutes INTEGER DEFAULT 0, notes TEXT, weight NUMERIC, height NUMERIC,
  muscle_group TEXT, exercise_name TEXT, weight_lifted NUMERIC, sets INTEGER, reps INTEGER, exercises JSONB,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL, role TEXT NOT NULL, location TEXT, salary TEXT, job_url TEXT,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','applied','screening','interview','technical','offer','rejected','withdrawn')),
  applied_date DATE NOT NULL, notes TEXT, follow_up_date DATE, interview_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.english_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, skill TEXT NOT NULL CHECK (skill IN ('speaking','listening','reading','writing')),
  minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 1440), topic TEXT NOT NULL DEFAULT '',
  writing TEXT NOT NULL DEFAULT '', correction TEXT NOT NULL DEFAULT '', vocabulary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, slot TEXT NOT NULL CHECK (slot IN ('Breakfast','Lunch','Dinner','Snack')),
  meal TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','followed','changed')), note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.workout_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), name TEXT NOT NULL, is_rest BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT NOT NULL DEFAULT '18:00', end_time TEXT NOT NULL DEFAULT '20:00', exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Upgrade the existing tables; CREATE TABLE IF NOT EXISTS does not add columns.
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS screen_time_minutes INTEGER;
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS journal_corrected TEXT;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS height NUMERIC;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS muscle_group TEXT;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS exercise_name TEXT;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS weight_lifted NUMERIC;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS sets INTEGER;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS reps INTEGER;
ALTER TABLE public.fitness_logs ADD COLUMN IF NOT EXISTS exercises JSONB;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS interview_date DATE;
-- Required by the app's ON CONFLICT upserts. These never discard duplicate data.
CREATE UNIQUE INDEX IF NOT EXISTS lifeos_daily_date_unique ON public.daily_logs(user_id,date);
CREATE UNIQUE INDEX IF NOT EXISTS lifeos_habit_date_unique ON public.habit_logs(user_id,habit_id,date);
CREATE UNIQUE INDEX IF NOT EXISTS lifeos_routine_day_unique ON public.workout_routines(user_id,weekday);
-- Every account can access only its own records. Keep auth.users intact.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_profile ON public.profiles;
CREATE POLICY own_profile ON public.profiles FOR ALL TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['habits','habit_logs','daily_logs','daily_plans','fitness_logs','job_applications','english_sessions','meal_plans','workout_routines'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS own_records ON public.%I',t);
    EXECUTE format('CREATE POLICY own_records ON public.%I FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id)',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(user_id)',t || '_user_idx',t);
  END LOOP;
END $$;
-- Re-create profiles for existing accounts if rows were cleared, and for new signups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id,full_name,timezone,onboarding_completed)
  VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'full_name','Your space'),'Asia/Kolkata',true)
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO public.profiles(id,full_name,timezone,onboarding_completed)
SELECT id,COALESCE(raw_user_meta_data->>'full_name','Your space'),'Asia/Kolkata',true FROM auth.users
ON CONFLICT(id) DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
