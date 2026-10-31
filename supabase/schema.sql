-- LifeOS: the 17 tables used by the dashboard and tracking sections.
-- Runnable on a new Supabase project or over the previous LifeOS schema.
-- This file does not delete tables. For the requested empty-table cleanup,
-- run migrations/20261021_focus_cleanup.sql, then the newer feature migrations.
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
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS habit_type TEXT NOT NULL DEFAULT 'good' CHECK (habit_type IN ('good','bad'));
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS period_days INTEGER CHECK (period_days IN (1,2,3,7));
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
-- Dashboard, time records, and explicit outcomes.
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
CREATE TABLE IF NOT EXISTS public.work_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  start_date DATE,
  due_date DATE,
  url TEXT CHECK (url IS NULL OR url ~* '^https?://'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id, user_id),
  CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);
CREATE TABLE IF NOT EXISTS public.work_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','completed','incomplete')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  due_date DATE,
  completed_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, user_id) REFERENCES public.work_projects(id, user_id) ON DELETE CASCADE,
  CHECK ((status = 'completed' AND completed_on IS NOT NULL) OR (status <> 'completed' AND completed_on IS NULL))
);
ALTER TABLE public.work_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_records ON public.work_projects;
CREATE POLICY own_records ON public.work_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_records ON public.work_tasks;
CREATE POLICY own_records ON public.work_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_projects, public.work_tasks TO authenticated;
CREATE INDEX IF NOT EXISTS work_projects_user_idx ON public.work_projects(user_id);
CREATE INDEX IF NOT EXISTS work_tasks_project_idx ON public.work_tasks(user_id, project_id);
CREATE INDEX IF NOT EXISTS work_tasks_due_idx ON public.work_tasks(user_id, due_date);
NOTIFY pgrst, 'reload schema';

-- Manual money tracking. Amounts are exact minor units (paise/cents).
CREATE TABLE IF NOT EXISTS public.money_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  kind TEXT NOT NULL CHECK (kind IN ('cash','bank','wallet')),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','USD','EUR','GBP')),
  opening_minor BIGINT NOT NULL DEFAULT 0 CHECK (abs(opening_minor::numeric) <= 1000000000000),
  opening_date DATE NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id,user_id)
);
CREATE TABLE IF NOT EXISTS public.money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  to_account_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense','transfer')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 1000000000000),
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id,user_id) REFERENCES public.money_accounts(id,user_id),
  FOREIGN KEY (to_account_id,user_id) REFERENCES public.money_accounts(id,user_id),
  CHECK ((kind = 'transfer' AND to_account_id IS NOT NULL AND to_account_id <> account_id AND category = '') OR
    (kind = 'income' AND to_account_id IS NULL AND category IN ('Salary','Freelance','Business','Gift','Refund','Other income')) OR
    (kind = 'expense' AND to_account_id IS NULL AND category IN ('Food & groceries','Transport','Housing','Bills & utilities','Shopping','Health','Education','Entertainment','Family','Other')))
);
CREATE TABLE IF NOT EXISTS public.money_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL CHECK (extract(day FROM month) = 1),
  currency TEXT NOT NULL CHECK (currency IN ('INR','USD','EUR','GBP')),
  category TEXT NOT NULL CHECK (category IN ('Food & groceries','Transport','Housing','Bills & utilities','Shopping','Health','Education','Entertainment','Family','Other')),
  limit_minor BIGINT NOT NULL CHECK (limit_minor > 0 AND limit_minor <= 1000000000000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,month,currency,category)
);
-- Serialise account edits with transfer inserts; a transfer is one atomic row.
CREATE OR REPLACE FUNCTION public.validate_money_transaction() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE source public.money_accounts; destination public.money_accounts;
BEGIN
  PERFORM id FROM public.money_accounts WHERE user_id = NEW.user_id AND id IN (NEW.account_id, NEW.to_account_id) ORDER BY id FOR UPDATE;
  SELECT * INTO source FROM public.money_accounts WHERE id = NEW.account_id AND user_id = NEW.user_id;
  IF source.id IS NULL THEN RAISE EXCEPTION 'Choose an account in your workspace.'; END IF;
  IF NEW.date < source.opening_date THEN RAISE EXCEPTION 'Transaction predates the account opening date.'; END IF;
  IF source.archived AND (TG_OP = 'INSERT' OR OLD.account_id IS DISTINCT FROM NEW.account_id) THEN RAISE EXCEPTION 'Restore this account first.'; END IF;
  IF NEW.kind = 'transfer' THEN
    SELECT * INTO destination FROM public.money_accounts WHERE id = NEW.to_account_id AND user_id = NEW.user_id;
    IF destination.id IS NULL OR destination.currency <> source.currency THEN RAISE EXCEPTION 'Transfer accounts must belong to you and use the same currency.'; END IF;
    IF NEW.date < destination.opening_date THEN RAISE EXCEPTION 'Transfer predates the destination account opening date.'; END IF;
    IF destination.archived AND (TG_OP = 'INSERT' OR OLD.to_account_id IS DISTINCT FROM NEW.to_account_id) THEN RAISE EXCEPTION 'Restore the destination first.'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS money_transaction_valid ON public.money_transactions;
CREATE TRIGGER money_transaction_valid BEFORE INSERT OR UPDATE ON public.money_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_money_transaction();
CREATE OR REPLACE FUNCTION public.protect_money_opening() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.currency,NEW.opening_date,NEW.opening_minor) IS DISTINCT FROM (OLD.currency,OLD.opening_date,OLD.opening_minor)
    AND EXISTS (SELECT 1 FROM public.money_transactions WHERE user_id = OLD.user_id AND (account_id = OLD.id OR to_account_id = OLD.id)) THEN
    RAISE EXCEPTION 'Opening balance, date and currency are locked once transactions exist.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS money_opening_protected ON public.money_accounts;
CREATE TRIGGER money_opening_protected BEFORE UPDATE ON public.money_accounts FOR EACH ROW EXECUTE FUNCTION public.protect_money_opening();
ALTER TABLE public.money_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_read ON public.money_accounts;
CREATE POLICY own_read ON public.money_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS own_insert ON public.money_accounts;
CREATE POLICY own_insert ON public.money_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_update ON public.money_accounts;
CREATE POLICY own_update ON public.money_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_records ON public.money_transactions;
CREATE POLICY own_records ON public.money_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_records ON public.money_budgets;
CREATE POLICY own_records ON public.money_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT,INSERT,UPDATE ON public.money_accounts TO authenticated;
REVOKE DELETE ON public.money_accounts FROM authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.money_transactions,public.money_budgets TO authenticated;
CREATE INDEX IF NOT EXISTS money_accounts_user_idx ON public.money_accounts(user_id);
CREATE INDEX IF NOT EXISTS money_transactions_date_idx ON public.money_transactions(user_id,date);
CREATE INDEX IF NOT EXISTS money_transactions_account_idx ON public.money_transactions(user_id,account_id);
CREATE INDEX IF NOT EXISTS money_transactions_destination_idx ON public.money_transactions(user_id,to_account_id);
NOTIFY pgrst, 'reload schema';
COMMIT;
