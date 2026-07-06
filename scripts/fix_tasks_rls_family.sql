-- Fix: tasks RLS — allow minors to see siblings' tasks (same tutor)
-- Used by ScoreScreen to show family progress

DROP POLICY IF EXISTS "tasks_self" ON public.tasks;
CREATE POLICY "tasks_self" ON public.tasks
  FOR ALL USING (
    created_by = auth.uid()
    OR child_id = auth.uid()
    OR created_by = (SELECT tutor_id FROM public.profiles WHERE id = auth.uid())
    OR child_id IN (SELECT id FROM public.profiles WHERE tutor_id = (SELECT tutor_id FROM public.profiles WHERE id = auth.uid()))
  );
