-- Permitir que hijos lean metas de su tutor, y que el dueño modifique
DROP POLICY IF EXISTS "score_goals_self" ON public.score_goals;
CREATE POLICY "score_goals_self" ON public.score_goals
  FOR ALL USING (
    user_id = auth.uid()
    OR user_id IN (SELECT tutor_id FROM public.profiles WHERE id = auth.uid())
  );
