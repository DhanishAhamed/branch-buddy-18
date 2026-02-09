-- Create notifications table for in-app reminders
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'reminder',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Create a function to auto-generate reminder notifications for tasks
CREATE OR REPLACE FUNCTION public.create_task_reminder()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a notification 30 minutes before the task
  INSERT INTO public.notifications (user_id, title, message, type, related_task_id, scheduled_for)
  VALUES (
    NEW.user_id,
    'Upcoming: ' || NEW.title,
    COALESCE(NEW.description, 'You have an upcoming event'),
    CASE
      WHEN NEW.title ILIKE '%follow%' THEN 'followup_reminder'
      WHEN NEW.title ILIKE '%site visit%' THEN 'site_visit_reminder'
      ELSE 'task_reminder'
    END,
    NEW.id,
    NEW.scheduled_at - INTERVAL '30 minutes'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_task_reminder
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.create_task_reminder();
