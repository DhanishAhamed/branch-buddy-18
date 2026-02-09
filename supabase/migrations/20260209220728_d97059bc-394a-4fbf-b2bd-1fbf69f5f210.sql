
-- Add recurrence support to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_rule text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_task_id uuid DEFAULT NULL REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for parent task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
