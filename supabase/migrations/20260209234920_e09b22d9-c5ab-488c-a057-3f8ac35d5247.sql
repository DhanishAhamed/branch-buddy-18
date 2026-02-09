-- Fix overly permissive insert policy on notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only allow users to insert their own notifications, or the trigger function (SECURITY DEFINER) handles it
CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT
WITH CHECK (user_id = auth.uid());
