-- Works: private projects and tasks. Existing tracking data is unchanged.
BEGIN;
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
COMMIT;
